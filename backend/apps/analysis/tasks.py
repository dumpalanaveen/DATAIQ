"""
Celery Tasks for Dataset Processing
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_dataset_task(self, dataset_id: str):
    """Main task: loads dataset and runs full analysis pipeline"""
    from apps.datasets.models import Dataset, DatasetColumn, DataPreview
    from apps.analysis.models import DataProfile, Visualization, AnalysisJob
    from apps.analysis.engine import DataProfiler, VisualizationGenerator
    import pandas as pd
    import numpy as np

    try:
        dataset = Dataset.objects.get(id=dataset_id)
        dataset.status = 'processing'
        dataset.save(update_fields=['status'])

        # Create job tracker
        job = AnalysisJob.objects.create(
            dataset=dataset,
            celery_task_id=self.request.id,
            status='running',
            started_at=timezone.now()
        )

        # --- 1. Load data ---
        job.progress = 10
        job.save(update_fields=['progress'])

        df = _load_dataframe(dataset)
        if df is None:
            raise ValueError("Failed to load dataset file")

        # Limit for preview
        dataset.row_count = len(df)
        dataset.column_count = len(df.columns)
        dataset.save(update_fields=['row_count', 'column_count'])

        # --- 2. Data profiling ---
        job.progress = 20
        job.save(update_fields=['progress'])

        profiler = DataProfiler(df)
        profile_data = profiler.profile()

        # --- 3. Save column profiles ---
        job.progress = 40
        job.save(update_fields=['progress'])

        DatasetColumn.objects.filter(dataset=dataset).delete()
        column_objects = []
        for col_info in profile_data['columns']:
            col_obj = DatasetColumn(
                dataset=dataset,
                name=col_info['name'],
                display_name=col_info['display_name'],
                dtype=col_info['dtype'],
                pandas_dtype=col_info['pandas_dtype'],
                position=col_info['position'],
                non_null_count=col_info['non_null_count'],
                null_count=col_info['null_count'],
                null_percentage=col_info['null_percentage'],
                unique_count=col_info['unique_count'],
                mean=col_info.get('mean'),
                std=col_info.get('std'),
                min_val=col_info.get('min_val'),
                max_val=col_info.get('max_val'),
                q25=col_info.get('q25'),
                q50=col_info.get('q50'),
                q75=col_info.get('q75'),
                top_values=col_info.get('top_values', []),
                outlier_count=col_info.get('outlier_count', 0),
                outlier_percentage=col_info.get('outlier_percentage', 0),
            )
            column_objects.append(col_obj)
        
        DatasetColumn.objects.bulk_create(column_objects)

        # --- 4. Save data profile ---
        job.progress = 55
        job.save(update_fields=['progress'])

        missing_data = profile_data['missing']
        dup_data = profile_data['duplicates']
        corr_data = profile_data['correlations']

        col_types = {c['dtype']: 0 for c in profile_data['columns']}
        for c in profile_data['columns']:
            col_types[c['dtype']] = col_types.get(c['dtype'], 0) + 1

        DataProfile.objects.update_or_create(
            dataset=dataset,
            defaults={
                'total_rows': dataset.row_count,
                'total_columns': dataset.column_count,
                'total_missing': missing_data['total_missing'],
                'missing_percentage': missing_data['missing_percentage'],
                'total_duplicates': dup_data['total_duplicates'],
                'duplicate_percentage': dup_data['duplicate_percentage'],
                'memory_usage_mb': profile_data['overview']['memory_usage_mb'],
                'numeric_columns': col_types.get('numeric', 0),
                'categorical_columns': col_types.get('categorical', 0),
                'datetime_columns': col_types.get('datetime', 0),
                'boolean_columns': col_types.get('boolean', 0),
                'text_columns': col_types.get('text', 0),
                'data_quality_score': profile_data['data_quality'],
                'correlation_matrix': corr_data.get('matrix', {}),
                'missing_pattern': {c['column']: c['percentage'] for c in missing_data.get('by_column', [])},
            }
        )

        # --- 5. Save data preview ---
        job.progress = 65
        job.save(update_fields=['progress'])

        preview_df = df.head(100).copy()
        # Convert to JSON-serializable
        for col in preview_df.columns:
            if preview_df[col].dtype == 'object':
                preview_df[col] = preview_df[col].astype(str)
        
        preview_data = preview_df.fillna('').to_dict('records')
        
        from apps.datasets.models import DataPreview
        DataPreview.objects.update_or_create(
            dataset=dataset,
            defaults={
                'data': preview_data,
                'row_count': len(preview_data),
            }
        )

        # --- 6. Generate visualizations ---
        job.progress = 75
        job.save(update_fields=['progress'])

        viz_generator = VisualizationGenerator(df, profile_data['columns'])
        viz_configs = viz_generator.generate_all()

        Visualization.objects.filter(dataset=dataset, is_auto_generated=True).delete()
        viz_objects = []
        for viz_data in viz_configs:
            viz_objects.append(Visualization(
                dataset=dataset,
                viz_type=viz_data['viz_type'],
                title=viz_data['title'],
                description=viz_data.get('description', ''),
                plotly_config=viz_data['plotly_config'],
                x_column=viz_data.get('x_column', ''),
                y_column=viz_data.get('y_column', ''),
                color_column=viz_data.get('color_column', ''),
                is_auto_generated=True,
                display_order=viz_data.get('display_order', 0),
            ))
        
        Visualization.objects.bulk_create(viz_objects)

        # --- 7. Update columns_info on dataset ---
        job.progress = 85
        job.save(update_fields=['progress'])

        dataset.columns_info = {
            c['name']: {
                'dtype': c['dtype'],
                'null_pct': c['null_percentage'],
                'unique': c['unique_count'],
            }
            for c in profile_data['columns']
        }
        dataset.status = 'ready'
        dataset.processed_at = timezone.now()
        dataset.save()

        # --- 8. Trigger AI insights (separate task) ---
        generate_ai_insights_task.delay(dataset_id)

        job.status = 'completed'
        job.progress = 100
        job.completed_at = timezone.now()
        job.save()

        logger.info(f"Dataset {dataset_id} processed successfully")
        return {'status': 'success', 'dataset_id': dataset_id}

    except Exception as e:
        logger.error(f"Failed to process dataset {dataset_id}: {e}", exc_info=True)
        
        try:
            dataset = Dataset.objects.get(id=dataset_id)
            dataset.status = 'error'
            dataset.error_message = str(e)
            dataset.save(update_fields=['status', 'error_message'])
            
            AnalysisJob.objects.filter(dataset=dataset, status='running').update(
                status='failed',
                error_message=str(e),
                completed_at=timezone.now()
            )
        except:
            pass
        
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=2)
def generate_ai_insights_task(self, dataset_id: str):
    """Generate AI insights for a processed dataset"""
    from apps.datasets.models import Dataset
    from apps.analysis.models import DataProfile
    from apps.insights.engine import AIInsightEngine
    from apps.insights.models import DatasetInsight
    
    try:
        dataset = Dataset.objects.get(id=dataset_id)
        profile = DataProfile.objects.get(dataset=dataset)
        columns = list(dataset.columns.values(
            'name', 'dtype', 'null_percentage', 'unique_count',
            'mean', 'std', 'min_val', 'max_val', 'top_values'
        ))
        
        engine = AIInsightEngine()
        insights = engine.generate_insights(dataset, profile, columns)
        
        DatasetInsight.objects.filter(dataset=dataset).delete()
        insight_objects = []
        for insight in insights:
            insight_objects.append(DatasetInsight(
                dataset=dataset,
                category=insight['category'],
                title=insight['title'],
                content=insight['content'],
                severity=insight.get('severity', 'info'),
                confidence=insight.get('confidence', 0.8),
                display_order=insight.get('order', 0),
            ))
        
        DatasetInsight.objects.bulk_create(insight_objects)
        logger.info(f"AI insights generated for dataset {dataset_id}")
        
    except Exception as e:
        logger.error(f"Failed to generate AI insights for {dataset_id}: {e}", exc_info=True)
        raise self.retry(exc=e)


def _load_dataframe(dataset):
    """Load dataset file as pandas DataFrame"""
    import pandas as pd
    
    try:
        file_path = dataset.file.path
        loaders = {
            'csv': lambda p: pd.read_csv(p, low_memory=False),
            'json': pd.read_json,
            'parquet': pd.read_parquet,
            'excel': pd.read_excel,
        }
        loader = loaders.get(dataset.file_type, pd.read_csv)
        df = loader(file_path)
        
        # Clean column names
        df.columns = [str(c).strip().replace(' ', '_').lower() for c in df.columns]
        return df
    except Exception as e:
        logger.error(f"Failed to load dataframe: {e}")
        return None

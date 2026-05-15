"""
DataIQ Core Processing Engine
Handles data profiling, analysis, and visualization generation
"""
import pandas as pd
import numpy as np
import json
import logging
from typing import Dict, List, Any, Optional, Tuple
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)


class DataProfiler:
    """Comprehensive data profiling engine"""
    
    def __init__(self, df: pd.DataFrame):
        self.df = df
        self.n_rows, self.n_cols = df.shape
    
    def profile(self) -> Dict[str, Any]:
        """Run complete profiling pipeline"""
        return {
            'overview': self._overview(),
            'columns': self._profile_columns(),
            'missing': self._missing_analysis(),
            'duplicates': self._duplicate_analysis(),
            'correlations': self._correlation_analysis(),
            'data_quality': self._data_quality_score(),
        }
    
    def _overview(self) -> Dict:
        mem_usage = self.df.memory_usage(deep=True).sum() / 1024 / 1024
        return {
            'total_rows': int(self.n_rows),
            'total_columns': int(self.n_cols),
            'memory_usage_mb': round(mem_usage, 2),
            'dtypes': {k: str(v) for k, v in self.df.dtypes.items()},
        }
    
    def _infer_column_type(self, series: pd.Series) -> str:
        """Intelligently infer column semantic type"""
        dtype = str(series.dtype)
        
        if 'datetime' in dtype:
            return 'datetime'
        elif 'bool' in dtype:
            return 'boolean'
        elif dtype in ('int64', 'int32', 'int16', 'float64', 'float32'):
            return 'numeric'
        elif dtype == 'object':
            # Try to detect semantic type
            sample = series.dropna().head(100)
            
            # Try datetime
            try:
                pd.to_datetime(sample, infer_datetime_format=True)
                return 'datetime'
            except:
                pass
            
            # Long text
            avg_len = sample.astype(str).str.len().mean()
            if avg_len > 100:
                return 'text'
            
            # Categorical
            unique_ratio = series.nunique() / max(len(series.dropna()), 1)
            if unique_ratio < 0.5 or series.nunique() < 50:
                return 'categorical'
            
            return 'text'
        
        return 'unknown'
    
    def _profile_columns(self) -> List[Dict]:
        """Profile each column"""
        profiles = []
        
        for i, col in enumerate(self.df.columns):
            series = self.df[col]
            col_type = self._infer_column_type(series)
            
            profile = {
                'name': col,
                'display_name': col.replace('_', ' ').title(),
                'dtype': col_type,
                'pandas_dtype': str(series.dtype),
                'position': i,
                'non_null_count': int(series.notna().sum()),
                'null_count': int(series.isna().sum()),
                'null_percentage': round(series.isna().mean() * 100, 2),
                'unique_count': int(series.nunique()),
            }
            
            if col_type == 'numeric':
                profile.update(self._numeric_stats(series))
                profile['outlier_count'], profile['outlier_percentage'] = self._detect_outliers(series)
            elif col_type in ('categorical', 'boolean'):
                profile['top_values'] = self._top_values(series)
            elif col_type == 'datetime':
                profile.update(self._datetime_stats(series))
            
            profiles.append(profile)
        
        return profiles
    
    def _numeric_stats(self, series: pd.Series) -> Dict:
        s = series.dropna()
        if len(s) == 0:
            return {}
        
        desc = s.describe()
        return {
            'mean': _safe_float(desc.get('mean')),
            'std': _safe_float(desc.get('std')),
            'min_val': _safe_float(desc.get('min')),
            'max_val': _safe_float(desc.get('max')),
            'q25': _safe_float(desc.get('25%')),
            'q50': _safe_float(desc.get('50%')),
            'q75': _safe_float(desc.get('75%')),
            'skewness': _safe_float(s.skew()),
            'kurtosis': _safe_float(s.kurtosis()),
            'zeros': int((s == 0).sum()),
            'negatives': int((s < 0).sum()),
            'histogram': _histogram_data(s),
        }
    
    def _datetime_stats(self, series: pd.Series) -> Dict:
        try:
            dt_series = pd.to_datetime(series, errors='coerce').dropna()
            if len(dt_series) == 0:
                return {}
            return {
                'min_date': str(dt_series.min()),
                'max_date': str(dt_series.max()),
                'date_range_days': int((dt_series.max() - dt_series.min()).days),
            }
        except:
            return {}
    
    def _detect_outliers(self, series: pd.Series) -> Tuple[int, float]:
        s = series.dropna()
        if len(s) < 10:
            return 0, 0.0
        
        Q1, Q3 = s.quantile(0.25), s.quantile(0.75)
        IQR = Q3 - Q1
        outliers = ((s < Q1 - 1.5 * IQR) | (s > Q3 + 1.5 * IQR)).sum()
        return int(outliers), round(outliers / len(s) * 100, 2)
    
    def _top_values(self, series: pd.Series, n=10) -> List[Dict]:
        counts = series.value_counts().head(n)
        total = len(series.dropna())
        return [
            {'value': str(v), 'count': int(c), 'percentage': round(c / total * 100, 2)}
            for v, c in counts.items()
        ]
    
    def _missing_analysis(self) -> Dict:
        missing = self.df.isnull().sum()
        total_missing = int(missing.sum())
        
        return {
            'total_missing': total_missing,
            'missing_percentage': round(total_missing / (self.n_rows * self.n_cols) * 100, 2),
            'by_column': [
                {
                    'column': col,
                    'missing': int(missing[col]),
                    'percentage': round(missing[col] / self.n_rows * 100, 2)
                }
                for col in missing[missing > 0].index
            ],
        }
    
    def _duplicate_analysis(self) -> Dict:
        total_dups = int(self.df.duplicated().sum())
        return {
            'total_duplicates': total_dups,
            'duplicate_percentage': round(total_dups / max(self.n_rows, 1) * 100, 2),
            'unique_rows': self.n_rows - total_dups,
        }
    
    def _correlation_analysis(self) -> Dict:
        numeric_df = self.df.select_dtypes(include=[np.number])
        
        if numeric_df.shape[1] < 2:
            return {'matrix': {}, 'columns': []}
        
        # Limit to 20 columns for performance
        if numeric_df.shape[1] > 20:
            numeric_df = numeric_df.iloc[:, :20]
        
        corr = numeric_df.corr()
        
        # Find highly correlated pairs
        high_corr_pairs = []
        for i in range(len(corr.columns)):
            for j in range(i+1, len(corr.columns)):
                val = corr.iloc[i, j]
                if abs(val) > 0.7:
                    high_corr_pairs.append({
                        'col1': corr.columns[i],
                        'col2': corr.columns[j],
                        'correlation': round(float(val), 3)
                    })
        
        return {
            'matrix': _corr_matrix_to_dict(corr),
            'columns': list(corr.columns),
            'high_correlation_pairs': high_corr_pairs,
        }
    
    def _data_quality_score(self) -> float:
        """Calculate 0-100 data quality score"""
        scores = []
        
        # Missing data penalty
        missing_pct = self.df.isnull().mean().mean() * 100
        scores.append(max(0, 100 - missing_pct * 2))
        
        # Duplicate penalty
        dup_pct = self.df.duplicated().mean() * 100
        scores.append(max(0, 100 - dup_pct * 3))
        
        # Column completeness
        scores.append(100 if self.n_cols > 0 else 0)
        
        # Row count adequacy
        if self.n_rows >= 1000:
            scores.append(100)
        elif self.n_rows >= 100:
            scores.append(70)
        else:
            scores.append(30)
        
        return round(sum(scores) / len(scores), 1)


class VisualizationGenerator:
    """Auto-generates Plotly visualizations"""
    
    def __init__(self, df: pd.DataFrame, column_profiles: List[Dict]):
        self.df = df
        self.columns = column_profiles
        self.numeric_cols = [c for c in column_profiles if c['dtype'] == 'numeric']
        self.categorical_cols = [c for c in column_profiles if c['dtype'] == 'categorical']
        self.datetime_cols = [c for c in column_profiles if c['dtype'] == 'datetime']
    
    def generate_all(self) -> List[Dict]:
        """Generate comprehensive set of visualizations"""
        vizs = []
        order = 0
        
        # Missing values heatmap
        missing_viz = self._missing_values_viz()
        if missing_viz:
            missing_viz['display_order'] = order
            vizs.append(missing_viz)
            order += 1
        
        # Correlation heatmap
        if len(self.numeric_cols) >= 2:
            corr_viz = self._correlation_heatmap()
            if corr_viz:
                corr_viz['display_order'] = order
                vizs.append(corr_viz)
                order += 1
        
        # Histograms for top numeric columns
        for col_info in self.numeric_cols[:6]:
            viz = self._histogram(col_info['name'])
            if viz:
                viz['display_order'] = order
                vizs.append(viz)
                order += 1
        
        # Bar charts for categorical columns
        for col_info in self.categorical_cols[:4]:
            viz = self._bar_chart(col_info['name'])
            if viz:
                viz['display_order'] = order
                vizs.append(viz)
                order += 1
        
        # Scatter plots for top numeric pairs
        if len(self.numeric_cols) >= 2:
            viz = self._scatter_plot(
                self.numeric_cols[0]['name'],
                self.numeric_cols[1]['name']
            )
            if viz:
                viz['display_order'] = order
                vizs.append(viz)
                order += 1
        
        # Box plots for numeric with categorical
        if self.numeric_cols and self.categorical_cols:
            viz = self._box_plot(
                self.numeric_cols[0]['name'],
                self.categorical_cols[0]['name']
            )
            if viz:
                viz['display_order'] = order
                vizs.append(viz)
                order += 1
        
        # Time series if datetime cols exist
        if self.datetime_cols and self.numeric_cols:
            viz = self._timeseries(
                self.datetime_cols[0]['name'],
                self.numeric_cols[0]['name']
            )
            if viz:
                viz['display_order'] = order
                vizs.append(viz)
                order += 1
        
        return vizs
    
    def _base_layout(self, title: str) -> Dict:
        return {
            'title': {'text': title, 'font': {'size': 16, 'family': 'IBM Plex Mono'}},
            'paper_bgcolor': 'rgba(0,0,0,0)',
            'plot_bgcolor': 'rgba(15,15,25,0.8)',
            'font': {'color': '#a0aec0', 'family': 'IBM Plex Mono'},
            'xaxis': {'gridcolor': 'rgba(255,255,255,0.05)', 'color': '#718096'},
            'yaxis': {'gridcolor': 'rgba(255,255,255,0.05)', 'color': '#718096'},
            'margin': {'l': 60, 'r': 30, 't': 60, 'b': 60},
            'colorway': ['#00d4ff', '#7c3aed', '#f59e0b', '#10b981', '#ef4444', '#ec4899'],
        }
    
    def _histogram(self, col: str) -> Optional[Dict]:
        try:
            data = self.df[col].dropna()
            if len(data) == 0:
                return None
            
            return {
                'viz_type': 'histogram',
                'title': f'Distribution of {col}',
                'description': f'Frequency distribution showing the spread of {col} values',
                'x_column': col,
                'plotly_config': {
                    'data': [{
                        'type': 'histogram',
                        'x': data.tolist()[:5000],
                        'nbinsx': 30,
                        'marker': {'color': '#00d4ff', 'opacity': 0.8,
                                   'line': {'color': '#7c3aed', 'width': 1}},
                        'name': col,
                    }],
                    'layout': {
                        **self._base_layout(f'Distribution of {col}'),
                        'bargap': 0.05,
                    }
                }
            }
        except Exception as e:
            logger.warning(f"Failed to create histogram for {col}: {e}")
            return None
    
    def _bar_chart(self, col: str, max_categories=15) -> Optional[Dict]:
        try:
            counts = self.df[col].value_counts().head(max_categories)
            if len(counts) == 0:
                return None
            
            return {
                'viz_type': 'bar',
                'title': f'{col} - Value Counts',
                'description': f'Top {max_categories} categories in {col}',
                'x_column': col,
                'plotly_config': {
                    'data': [{
                        'type': 'bar',
                        'x': [str(v) for v in counts.index.tolist()],
                        'y': counts.values.tolist(),
                        'marker': {
                            'color': counts.values.tolist(),
                            'colorscale': [[0, '#1a1a2e'], [1, '#00d4ff']],
                            'showscale': False,
                        },
                        'name': col,
                    }],
                    'layout': self._base_layout(f'{col} — Value Distribution')
                }
            }
        except Exception as e:
            logger.warning(f"Failed to create bar chart for {col}: {e}")
            return None
    
    def _scatter_plot(self, x_col: str, y_col: str) -> Optional[Dict]:
        try:
            sample = self.df[[x_col, y_col]].dropna().head(2000)
            if len(sample) == 0:
                return None
            
            return {
                'viz_type': 'scatter',
                'title': f'{x_col} vs {y_col}',
                'description': f'Relationship between {x_col} and {y_col}',
                'x_column': x_col,
                'y_column': y_col,
                'plotly_config': {
                    'data': [{
                        'type': 'scatter',
                        'mode': 'markers',
                        'x': sample[x_col].tolist(),
                        'y': sample[y_col].tolist(),
                        'marker': {
                            'color': '#00d4ff',
                            'opacity': 0.6,
                            'size': 5,
                        },
                        'name': f'{x_col} vs {y_col}',
                    }],
                    'layout': self._base_layout(f'{x_col} vs {y_col}')
                }
            }
        except Exception as e:
            logger.warning(f"Failed to create scatter plot: {e}")
            return None
    
    def _box_plot(self, numeric_col: str, category_col: str, max_cats=8) -> Optional[Dict]:
        try:
            top_cats = self.df[category_col].value_counts().head(max_cats).index
            filtered = self.df[self.df[category_col].isin(top_cats)]
            
            traces = []
            colors = ['#00d4ff', '#7c3aed', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#f97316', '#06b6d4']
            
            for i, cat in enumerate(top_cats):
                data = filtered[filtered[category_col] == cat][numeric_col].dropna()
                traces.append({
                    'type': 'box',
                    'y': data.tolist()[:2000],
                    'name': str(cat),
                    'marker': {'color': colors[i % len(colors)]},
                    'boxmean': True,
                })
            
            return {
                'viz_type': 'box',
                'title': f'{numeric_col} by {category_col}',
                'description': f'Distribution of {numeric_col} across {category_col} categories',
                'x_column': category_col,
                'y_column': numeric_col,
                'plotly_config': {
                    'data': traces,
                    'layout': self._base_layout(f'{numeric_col} by {category_col}')
                }
            }
        except Exception as e:
            logger.warning(f"Failed to create box plot: {e}")
            return None
    
    def _correlation_heatmap(self) -> Optional[Dict]:
        try:
            numeric_df = self.df.select_dtypes(include=[np.number])
            if numeric_df.shape[1] < 2:
                return None
            
            # Limit columns
            if numeric_df.shape[1] > 15:
                numeric_df = numeric_df.iloc[:, :15]
            
            corr = numeric_df.corr().round(2)
            cols = list(corr.columns)
            
            z_values = corr.values.tolist()
            text_values = [[str(round(v, 2)) for v in row] for row in z_values]
            
            return {
                'viz_type': 'correlation',
                'title': 'Correlation Matrix',
                'description': 'Pearson correlation between numeric variables',
                'plotly_config': {
                    'data': [{
                        'type': 'heatmap',
                        'z': z_values,
                        'x': cols,
                        'y': cols,
                        'text': text_values,
                        'texttemplate': '%{text}',
                        'colorscale': [
                            [0, '#ef4444'], [0.25, '#f97316'],
                            [0.5, '#1a1a2e'], [0.75, '#06b6d4'],
                            [1, '#00d4ff']
                        ],
                        'zmid': 0,
                        'showscale': True,
                    }],
                    'layout': {
                        **self._base_layout('Correlation Matrix'),
                        'height': 500,
                    }
                }
            }
        except Exception as e:
            logger.warning(f"Failed to create correlation heatmap: {e}")
            return None
    
    def _missing_values_viz(self) -> Optional[Dict]:
        try:
            missing = self.df.isnull().sum()
            missing = missing[missing > 0].sort_values(ascending=True)
            
            if len(missing) == 0:
                return None
            
            pct = (missing / len(self.df) * 100).round(2)
            
            return {
                'viz_type': 'missing',
                'title': 'Missing Values Analysis',
                'description': 'Columns with missing data and their percentages',
                'plotly_config': {
                    'data': [{
                        'type': 'bar',
                        'x': pct.values.tolist(),
                        'y': [str(c) for c in pct.index.tolist()],
                        'orientation': 'h',
                        'marker': {
                            'color': pct.values.tolist(),
                            'colorscale': [[0, '#10b981'], [0.5, '#f59e0b'], [1, '#ef4444']],
                            'showscale': True,
                            'colorbar': {'title': '% Missing'},
                        },
                        'text': [f'{v:.1f}%' for v in pct.values],
                        'textposition': 'outside',
                    }],
                    'layout': {
                        **self._base_layout('Missing Values by Column (%)'),
                        'height': max(300, len(missing) * 35),
                    }
                }
            }
        except Exception as e:
            logger.warning(f"Failed to create missing values viz: {e}")
            return None
    
    def _timeseries(self, date_col: str, value_col: str) -> Optional[Dict]:
        try:
            df_ts = self.df[[date_col, value_col]].copy()
            df_ts[date_col] = pd.to_datetime(df_ts[date_col], errors='coerce')
            df_ts = df_ts.dropna().sort_values(date_col)
            
            if len(df_ts) < 5:
                return None
            
            return {
                'viz_type': 'timeseries',
                'title': f'{value_col} Over Time',
                'description': f'Temporal trend of {value_col}',
                'x_column': date_col,
                'y_column': value_col,
                'plotly_config': {
                    'data': [{
                        'type': 'scatter',
                        'mode': 'lines',
                        'x': df_ts[date_col].dt.strftime('%Y-%m-%d').tolist(),
                        'y': df_ts[value_col].tolist(),
                        'line': {'color': '#00d4ff', 'width': 2},
                        'fill': 'tozeroy',
                        'fillcolor': 'rgba(0,212,255,0.1)',
                        'name': value_col,
                    }],
                    'layout': self._base_layout(f'{value_col} Over Time')
                }
            }
        except Exception as e:
            logger.warning(f"Failed to create timeseries: {e}")
            return None


def _safe_float(val) -> Optional[float]:
    try:
        if val is None or np.isnan(val):
            return None
        return round(float(val), 6)
    except:
        return None


def _histogram_data(series: pd.Series, bins=30) -> List:
    try:
        counts, edges = np.histogram(series.dropna(), bins=bins)
        return [{'x': round(float(edges[i]), 4), 'count': int(counts[i])} for i in range(len(counts))]
    except:
        return []


def _corr_matrix_to_dict(corr: pd.DataFrame) -> Dict:
    result = {}
    for col in corr.columns:
        result[col] = {}
        for row in corr.index:
            val = corr.loc[row, col]
            result[col][row] = round(float(val), 4) if not np.isnan(val) else 0
    return result

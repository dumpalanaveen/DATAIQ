"""
AI Insight Engine
Generates intelligent insights using Gemini or OpenAI
"""
import os
import json
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class AIInsightEngine:
    """Generates AI-powered insights for datasets"""
    
    def __init__(self):
        self.provider = os.environ.get('AI_PROVIDER', 'gemini')
        self.gemini_key = os.environ.get('GEMINI_API_KEY', '')
        self.openai_key = os.environ.get('OPENAI_API_KEY', '')
    
    def generate_insights(self, dataset, profile, columns) -> List[Dict]:
        """Generate comprehensive AI insights"""
        
        # Build context
        context = self._build_context(dataset, profile, columns)
        
        # Generate with AI
        try:
            raw = self._call_ai(context)
            insights = self._parse_insights(raw)
        except Exception as e:
            logger.error(f"AI call failed: {e}")
            insights = self._fallback_insights(dataset, profile, columns)
        
        return insights
    
    def answer_question(self, dataset, question: str) -> Dict:
        """Answer a natural language question about the dataset"""
        
        try:
            columns = list(dataset.columns.values('name', 'dtype', 'null_percentage', 'mean', 'std'))
            
            prompt = f"""You are a data analyst. A user has a dataset named "{dataset.name}" with {dataset.row_count} rows and {dataset.column_count} columns.

Columns: {json.dumps(columns[:20], indent=2)}

The user asks: "{question}"

Please provide:
1. A clear, direct answer to their question
2. Relevant statistics or calculations if applicable
3. Suggested follow-up questions
4. If the question requires running code, describe what SQL query would answer it

Respond in JSON format:
{{
  "answer": "...",
  "statistics": {{}},
  "suggested_queries": ["SELECT ..."],
  "follow_up_questions": ["...", "..."],
  "visualization_suggestion": "histogram|bar|scatter|line|none"
}}"""
            
            response = self._raw_completion(prompt)
            
            try:
                clean = response.strip()
                if clean.startswith('```'):
                    clean = clean.split('```')[1]
                    if clean.startswith('json'):
                        clean = clean[4:]
                return json.loads(clean)
            except:
                return {
                    'answer': response,
                    'statistics': {},
                    'suggested_queries': [],
                    'follow_up_questions': [],
                    'visualization_suggestion': 'none'
                }
        
        except Exception as e:
            logger.error(f"NL query failed: {e}")
            return {
                'answer': f"I couldn't process that question right now. Please try rephrasing it.",
                'statistics': {},
                'suggested_queries': [],
                'follow_up_questions': [],
                'visualization_suggestion': 'none'
            }
    
    def _build_context(self, dataset, profile, columns) -> str:
        col_summary = []
        for c in columns[:25]:
            summary = f"- {c['name']} ({c['dtype']}): {c['null_percentage']:.1f}% missing, {c['unique_count']} unique"
            if c['dtype'] == 'numeric' and c.get('mean') is not None:
                summary += f", mean={c['mean']:.2f}, std={c.get('std', 0):.2f}"
            elif c['dtype'] == 'categorical' and c.get('top_values'):
                top = c['top_values'][:3]
                summary += f", top values: {[t['value'] for t in top]}"
            col_summary.append(summary)
        
        return f"""Dataset: {dataset.name}
Description: {dataset.description or 'No description provided'}
File type: {dataset.file_type.upper()}
Dimensions: {profile.total_rows} rows × {profile.total_columns} columns
Memory: {profile.memory_usage_mb:.1f} MB

Data Quality:
- Quality Score: {profile.data_quality_score}/100
- Missing values: {profile.missing_percentage:.1f}%
- Duplicate rows: {profile.duplicate_percentage:.1f}%

Column breakdown:
- Numeric: {profile.numeric_columns}
- Categorical: {profile.categorical_columns}
- DateTime: {profile.datetime_columns}
- Boolean: {profile.boolean_columns}
- Text: {profile.text_columns}

Columns:
{chr(10).join(col_summary)}"""
    
    def _call_ai(self, context: str) -> str:
        prompt = f"""You are an expert data scientist analyzing a dataset. Analyze the following dataset profile and generate actionable insights.

{context}

Generate a comprehensive analysis with insights in these categories:
1. overview - General dataset summary and characteristics
2. quality - Data quality issues, missing values, duplicates
3. patterns - Key patterns, trends, distributions discovered
4. anomalies - Outliers, unexpected values, anomalies
5. recommendations - Preprocessing steps, cleaning suggestions
6. ml_suggestions - ML models and techniques suited for this data
7. feature_engineering - Feature engineering opportunities
8. business_insights - Business-relevant findings and implications

Return ONLY a valid JSON array with objects having these fields:
- category: one of the above categories
- title: short title (max 10 words)
- content: detailed explanation (2-4 sentences)
- severity: "info" | "warning" | "critical" | "success"
- confidence: 0.0-1.0
- order: display order (integer)

Generate at least 8-12 insights total."""
        
        return self._raw_completion(prompt)
    
    def _raw_completion(self, prompt: str) -> str:
        if self.provider == 'gemini' and self.gemini_key:
            return self._gemini_completion(prompt)
        elif self.openai_key:
            return self._openai_completion(prompt)
        else:
            raise ValueError("No AI API key configured")
    
    def _gemini_completion(self, prompt: str) -> str:
        import urllib.request
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_key}"
        
        payload = json.dumps({
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 3000,
            }
        }).encode('utf-8')
        
        req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
        
        with urllib.request.urlopen(req, timeout=60) as response:
            data = json.loads(response.read())
        
        return data['candidates'][0]['content']['parts'][0]['text']
    
    def _openai_completion(self, prompt: str) -> str:
        import urllib.request
        
        url = "https://api.openai.com/v1/chat/completions"
        
        payload = json.dumps({
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": "You are an expert data scientist. Always respond with valid JSON when asked."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 3000,
        }).encode('utf-8')
        
        req = urllib.request.Request(
            url, data=payload,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.openai_key}'
            }
        )
        
        with urllib.request.urlopen(req, timeout=60) as response:
            data = json.loads(response.read())
        
        return data['choices'][0]['message']['content']
    
    def _parse_insights(self, raw: str) -> List[Dict]:
        try:
            clean = raw.strip()
            # Strip markdown code blocks
            if '```json' in clean:
                clean = clean.split('```json')[1].split('```')[0]
            elif '```' in clean:
                clean = clean.split('```')[1].split('```')[0]
            
            parsed = json.loads(clean)
            if isinstance(parsed, list):
                return parsed
            return []
        except Exception as e:
            logger.error(f"Failed to parse AI response: {e}")
            return []
    
    def _fallback_insights(self, dataset, profile, columns) -> List[Dict]:
        """Rule-based fallback insights when AI is unavailable"""
        insights = []
        order = 0
        
        # Overview
        insights.append({
            'category': 'overview',
            'title': f'Dataset contains {profile.total_rows:,} rows and {profile.total_columns} columns',
            'content': f'This {dataset.file_type.upper()} dataset has {profile.numeric_columns} numeric, {profile.categorical_columns} categorical, and {profile.datetime_columns} datetime columns. Memory footprint is {profile.memory_usage_mb:.1f} MB.',
            'severity': 'info',
            'confidence': 1.0,
            'order': order,
        })
        order += 1
        
        # Quality
        severity = 'success' if profile.data_quality_score >= 80 else ('warning' if profile.data_quality_score >= 60 else 'critical')
        insights.append({
            'category': 'quality',
            'title': f'Data quality score: {profile.data_quality_score}/100',
            'content': f'Missing values affect {profile.missing_percentage:.1f}% of all cells. Duplicate rows represent {profile.duplicate_percentage:.1f}% of the data.',
            'severity': severity,
            'confidence': 1.0,
            'order': order,
        })
        order += 1
        
        # Missing values warning
        if profile.missing_percentage > 10:
            insights.append({
                'category': 'quality',
                'title': 'Significant missing data detected',
                'content': f'{profile.missing_percentage:.1f}% of data is missing. Consider imputation strategies: mean/median for numeric columns, mode for categorical, or model-based imputation for complex patterns.',
                'severity': 'warning',
                'confidence': 0.95,
                'order': order,
            })
            order += 1
        
        # Duplicates
        if profile.total_duplicates > 0:
            insights.append({
                'category': 'quality',
                'title': f'{profile.total_duplicates:,} duplicate rows found',
                'content': f'Duplicate rows ({profile.duplicate_percentage:.1f}%) may skew analysis results. Recommend deduplication before modeling.',
                'severity': 'warning',
                'confidence': 0.9,
                'order': order,
            })
            order += 1
        
        # ML suggestions
        if profile.numeric_columns > 0 and profile.categorical_columns > 0:
            insights.append({
                'category': 'ml_suggestions',
                'title': 'Mixed data types: tree-based models recommended',
                'content': 'With both numeric and categorical features, gradient boosting methods (XGBoost, LightGBM) or Random Forest are strong candidates. Consider label encoding or target encoding for categorical variables.',
                'severity': 'info',
                'confidence': 0.75,
                'order': order,
            })
            order += 1
        
        # Preprocessing
        insights.append({
            'category': 'recommendations',
            'title': 'Suggested preprocessing pipeline',
            'content': 'Recommended steps: (1) Handle missing values, (2) Remove or flag duplicates, (3) Encode categorical variables, (4) Scale numeric features, (5) Handle outliers with IQR or Z-score filtering.',
            'severity': 'info',
            'confidence': 0.85,
            'order': order,
        })
        
        return insights

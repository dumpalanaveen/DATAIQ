'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { datasetsApi, analysisApi, insightsApi, reportsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import dynamic from 'next/dynamic';
import {
  Database, BarChart3, Brain, FileText, Table2,
  RefreshCw, Download, Zap, AlertTriangle, CheckCircle,
  TrendingUp, Hash, Calendar, Tag, ArrowLeft,
  MessageSquare, Pin, ChevronRight, Loader2
} from 'lucide-react';

const PlotlyChart = dynamic(() => import('@/components/charts/PlotlyChart'), { ssr: false });

const TABS = [
  { id: 'overview', label: 'Overview', icon: Database },
  { id: 'profile',  label: 'Data Profile', icon: Table2 },
  { id: 'charts',   label: 'Charts', icon: BarChart3 },
  { id: 'insights', label: 'AI Insights', icon: Brain },
  { id: 'query',    label: 'Query', icon: MessageSquare },
];

const statusConfig: Record<string, any> = {
  ready:      { label: 'Ready',      cls: 'badge-green', dot: 'status-ready'      },
  processing: { label: 'Processing', cls: 'badge-amber', dot: 'status-processing' },
  error:      { label: 'Error',      cls: 'badge-red',   dot: 'status-error'      },
  uploaded:   { label: 'Queued',     cls: 'badge-cyan',  dot: 'status-uploading'  },
  uploading:  { label: 'Uploading',  cls: 'badge-cyan',  dot: 'status-uploading'  },
};

export default function DatasetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState('overview');
  const [nlQuestion, setNlQuestion] = useState('');
  const [nlAnswer, setNlAnswer] = useState<any>(null);
  const [nlLoading, setNlLoading] = useState(false);
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM dataset LIMIT 20');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  const { data: dataset, isLoading } = useQuery({
    queryKey: ['dataset', id],
    queryFn: () => datasetsApi.detail(id).then(r => r.data),
    refetchInterval: (data) => (data?.status === 'processing' || data?.status === 'uploaded') ? 3000 : false,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', id],
    queryFn: () => analysisApi.profile(id).then(r => r.data),
    enabled: dataset?.status === 'ready',
  });

  const { data: visualizations } = useQuery({
    queryKey: ['visualizations', id],
    queryFn: () => analysisApi.visualizations(id).then(r => r.data),
    enabled: dataset?.status === 'ready',
  });

  const { data: insights } = useQuery({
    queryKey: ['insights', id],
    queryFn: () => insightsApi.list(id).then(r => r.data),
    enabled: dataset?.status === 'ready',
  });

  const dismissInsight = useMutation({
    mutationFn: (insightId: string) => insightsApi.dismiss(insightId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insights', id] }),
  });

  const generateReport = useMutation({
    mutationFn: () => reportsApi.generate(id, { include_visualizations: true, include_ai_insights: true }),
    onSuccess: (data) => {
      toast.success('Report generation started!');
    },
    onError: () => toast.error('Failed to generate report'),
  });

  const handleNLQuery = async () => {
    if (!nlQuestion.trim()) return;
    setNlLoading(true);
    try {
      const { data } = await analysisApi.nlQuery(id, nlQuestion);
      setNlAnswer(data);
    } catch {
      toast.error('AI query failed. Check your API key configuration.');
    } finally {
      setNlLoading(false);
    }
  };

  const handleSQLQuery = async () => {
    setQueryLoading(true);
    try {
      const { data } = await datasetsApi.query(id, sqlQuery);
      setQueryResult(data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Query failed');
    } finally {
      setQueryLoading(false);
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (!dataset) return <div className="p-8 text-text-secondary">Dataset not found.</div>;

  const sc = statusConfig[dataset.status] || statusConfig.uploaded;
  const isProcessing = ['processing', 'uploaded', 'uploading'].includes(dataset.status);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-dark-bg/95 backdrop-blur border-b border-dark-border">
        <div className="px-8 py-4 flex items-center gap-4">
          <button onClick={() => router.push('/datasets')} className="text-text-muted hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-xl font-bold text-white truncate">{dataset.name}</h1>
              <span className={clsx('badge', sc.cls)}>
                <span className={clsx('status-dot', sc.dot)} />
                {sc.label}
              </span>
              <span className="badge-cyan font-mono uppercase text-xs">{dataset.file_type}</span>
            </div>
            {dataset.description && (
              <p className="text-text-muted text-sm mt-0.5 truncate">{dataset.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {dataset.status === 'ready' && (
              <button
                onClick={() => generateReport.mutate()}
                className="btn-ghost flex items-center gap-2 text-sm"
                disabled={generateReport.isPending}
              >
                <Download className="w-4 h-4" />
                Export Report
              </button>
            )}
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ['dataset', id] })}
              className="btn-ghost p-2"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8 flex gap-1 overflow-x-auto">
          {TABS.map(({ id: tid, label, icon: Icon }) => (
            <button
              key={tid}
              onClick={() => setTab(tid)}
              disabled={isProcessing && tid !== 'overview'}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
                tab === tid
                  ? 'border-brand-500 text-brand-500'
                  : 'border-transparent text-text-muted hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
              {tid === 'insights' && insights && insights.length > 0 && (
                <span className="bg-brand-500/20 text-brand-500 text-xs rounded-full px-1.5 py-0.5 font-mono">
                  {insights.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto">
        {/* Processing State */}
        {isProcessing && (
          <div className="card p-10 text-center mb-6">
            <div className="w-16 h-16 bg-brand-500/10 border border-brand-500/30 rounded-2xl flex items-center justify-center mx-auto mb-5 animate-pulse">
              <Zap className="w-8 h-8 text-brand-500" />
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-2">Analyzing your dataset...</h3>
            <p className="text-text-secondary max-w-md mx-auto">
              DataIQ is running full profiling, generating charts, and preparing AI insights. This usually takes 10–60 seconds.
            </p>
            <div className="mt-6 h-1.5 bg-dark-border rounded-full max-w-xs mx-auto overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        )}

        {dataset.status === 'error' && (
          <div className="card p-6 border-red-500/30 bg-red-500/5 mb-6 flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-red-400">Analysis Failed</div>
              <div className="text-sm text-text-secondary mt-1">{dataset.error_message || 'Unknown error occurred during processing.'}</div>
            </div>
          </div>
        )}

        {/* TAB: OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Rows', value: dataset.row_count?.toLocaleString() ?? '—', icon: Hash, color: 'text-brand-500' },
                { label: 'Columns', value: dataset.column_count ?? '—', icon: Table2, color: 'text-violet-400' },
                { label: 'File Size', value: dataset.file_size_mb ? `${dataset.file_size_mb} MB` : '—', icon: Database, color: 'text-amber-400' },
                { label: 'Quality Score', value: profile ? `${profile.data_quality_score}/100` : '—', icon: CheckCircle, color: 'text-emerald-400' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="metric-card">
                  <Icon className={clsx('w-5 h-5 mb-3', color)} />
                  <div className="text-2xl font-display font-bold text-white">{value}</div>
                  <div className="text-sm text-text-muted mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Profile Summary + Column List */}
            {profile && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="card p-6 space-y-4">
                  <h3 className="font-display font-bold text-white">Data Quality Overview</h3>
                  {[
                    { label: 'Missing Values', value: `${profile.missing_percentage?.toFixed(1)}%`, warn: profile.missing_percentage > 10 },
                    { label: 'Duplicate Rows', value: `${profile.duplicate_percentage?.toFixed(1)}%`, warn: profile.duplicate_percentage > 5 },
                    { label: 'Memory Usage', value: `${profile.memory_usage_mb?.toFixed(1)} MB`, warn: false },
                  ].map(({ label, value, warn }) => (
                    <div key={label} className="flex justify-between items-center py-2 border-b border-dark-border last:border-0">
                      <span className="text-text-secondary text-sm">{label}</span>
                      <span className={clsx('font-mono text-sm font-semibold', warn ? 'text-amber-400' : 'text-white')}>
                        {value}
                      </span>
                    </div>
                  ))}

                  <div className="pt-2">
                    <div className="text-sm text-text-secondary mb-2">Column Types</div>
                    <div className="flex flex-wrap gap-2">
                      {profile.numeric_columns > 0 && <span className="badge-cyan">📊 {profile.numeric_columns} numeric</span>}
                      {profile.categorical_columns > 0 && <span className="badge-violet">🏷 {profile.categorical_columns} categorical</span>}
                      {profile.datetime_columns > 0 && <span className="badge-amber">📅 {profile.datetime_columns} datetime</span>}
                      {profile.text_columns > 0 && <span className="badge badge-red">📝 {profile.text_columns} text</span>}
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="card p-6">
                  <h3 className="font-display font-bold text-white mb-4">Columns</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {dataset.columns?.slice(0, 20).map((col: any) => (
                      <div key={col.name} className="flex items-center gap-3 py-1.5 border-b border-dark-border last:border-0">
                        <span className={clsx('badge text-xs px-2 py-0.5', {
                          'badge-cyan': col.dtype === 'numeric',
                          'badge-violet': col.dtype === 'categorical',
                          'badge-amber': col.dtype === 'datetime',
                          'badge-green': col.dtype === 'boolean',
                          'badge-red': col.dtype === 'text',
                        })}>{col.dtype}</span>
                        <span className="text-sm text-white font-mono flex-1 truncate">{col.name}</span>
                        {col.null_percentage > 0 && (
                          <span className="text-xs text-amber-400 font-mono">{col.null_percentage.toFixed(1)}% null</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Data Preview Table */}
            {dataset.preview?.data && dataset.preview.data.length > 0 && (
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-dark-border">
                  <h3 className="font-display font-bold text-white">Data Preview <span className="text-text-muted font-mono text-sm ml-2">(first 100 rows)</span></h3>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-xs font-mono">
                    <thead className="sticky top-0 bg-dark-surface">
                      <tr>
                        {Object.keys(dataset.preview.data[0]).slice(0, 10).map((col: string) => (
                          <th key={col} className="px-3 py-2 text-left text-text-muted border-b border-dark-border whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                        {Object.keys(dataset.preview.data[0]).length > 10 && (
                          <th className="px-3 py-2 text-text-muted border-b border-dark-border">
                            +{Object.keys(dataset.preview.data[0]).length - 10} more
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {dataset.preview.data.slice(0, 20).map((row: any, i: number) => (
                        <tr key={i} className="border-b border-dark-border hover:bg-white/2 transition-colors">
                          {Object.keys(row).slice(0, 10).map((col: string) => (
                            <td key={col} className="px-3 py-1.5 text-text-secondary max-w-xs truncate">
                              {String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: DATA PROFILE */}
        {tab === 'profile' && profile && (
          <div className="space-y-6">
            {dataset.columns?.map((col: any) => (
              <div key={col.name} className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-white">{col.name}</span>
                      <span className={clsx('badge text-xs', {
                        'badge-cyan': col.dtype === 'numeric',
                        'badge-violet': col.dtype === 'categorical',
                        'badge-amber': col.dtype === 'datetime',
                        'badge-green': col.dtype === 'boolean',
                        'badge-red': col.dtype === 'text',
                      })}>{col.dtype}</span>
                      <span className="text-text-muted font-mono text-xs">{col.pandas_dtype}</span>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm font-mono">
                    <div className="text-center">
                      <div className={clsx('font-bold', col.null_percentage > 20 ? 'text-red-400' : col.null_percentage > 5 ? 'text-amber-400' : 'text-emerald-400')}>
                        {col.null_percentage?.toFixed(1)}%
                      </div>
                      <div className="text-text-muted text-xs">missing</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-bold">{col.unique_count?.toLocaleString()}</div>
                      <div className="text-text-muted text-xs">unique</div>
                    </div>
                  </div>
                </div>

                {/* Null bar */}
                <div className="h-1 bg-dark-border rounded-full mb-4 overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full', col.null_percentage > 20 ? 'bg-red-400' : col.null_percentage > 5 ? 'bg-amber-400' : 'bg-emerald-400')}
                    style={{ width: `${100 - col.null_percentage}%` }}
                  />
                </div>

                {col.dtype === 'numeric' && (
                  <div className="grid grid-cols-4 md:grid-cols-7 gap-3 text-center">
                    {[
                      { label: 'Mean', value: col.mean },
                      { label: 'Std', value: col.std },
                      { label: 'Min', value: col.min_val },
                      { label: 'Q1', value: col.q25 },
                      { label: 'Median', value: col.q50 },
                      { label: 'Q3', value: col.q75 },
                      { label: 'Max', value: col.max_val },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-dark-surface rounded-lg p-2">
                        <div className="text-text-muted text-xs mb-1">{label}</div>
                        <div className="text-white font-mono text-sm font-semibold">
                          {value != null ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 }) : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {col.dtype === 'categorical' && col.top_values?.length > 0 && (
                  <div className="space-y-2">
                    {col.top_values.slice(0, 5).map((tv: any) => (
                      <div key={tv.value} className="flex items-center gap-3">
                        <span className="text-text-secondary font-mono text-xs w-32 truncate">{tv.value}</span>
                        <div className="flex-1 h-2 bg-dark-border rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500/50 rounded-full" style={{ width: `${tv.percentage}%` }} />
                        </div>
                        <span className="text-text-muted font-mono text-xs w-16 text-right">{tv.percentage}%</span>
                      </div>
                    ))}
                  </div>
                )}

                {col.outlier_count > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-amber-400 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {col.outlier_count} outliers detected ({col.outlier_percentage?.toFixed(1)}%)
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB: CHARTS */}
        {tab === 'charts' && (
          <div>
            {!visualizations || visualizations.length === 0 ? (
              <div className="card p-12 text-center">
                <BarChart3 className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <p className="text-text-secondary">No visualizations available yet.</p>
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-6">
                {visualizations.map((viz: any) => (
                  <div key={viz.id} className="card overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-dark-border">
                      <div>
                        <div className="font-semibold text-white text-sm">{viz.title}</div>
                        {viz.description && (
                          <div className="text-xs text-text-muted mt-0.5">{viz.description}</div>
                        )}
                      </div>
                      <span className="badge-violet text-xs">{viz.viz_type}</span>
                    </div>
                    <div className="p-2">
                      <PlotlyChart config={viz.plotly_config} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: AI INSIGHTS */}
        {tab === 'insights' && (
          <div className="space-y-6">
            {/* NL Query */}
            <div className="card p-6">
              <h3 className="font-display font-bold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-brand-500" />
                Ask about your data
              </h3>
              <div className="flex gap-3">
                <input
                  value={nlQuestion}
                  onChange={e => setNlQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNLQuery()}
                  className="input flex-1"
                  placeholder="e.g. What are the top 5 categories by sales? Is there seasonality?"
                />
                <button
                  onClick={handleNLQuery}
                  disabled={nlLoading || !nlQuestion.trim()}
                  className="btn-primary flex items-center gap-2 whitespace-nowrap"
                >
                  {nlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Ask AI
                </button>
              </div>
              {nlAnswer && (
                <div className="mt-5 space-y-4">
                  <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-brand-500" />
                      <span className="text-sm font-semibold text-brand-500">AI Answer</span>
                    </div>
                    <p className="text-white leading-relaxed">{nlAnswer.answer}</p>
                  </div>
                  {nlAnswer.follow_up_questions?.length > 0 && (
                    <div>
                      <div className="text-xs text-text-muted mb-2">Follow-up questions:</div>
                      <div className="flex flex-wrap gap-2">
                        {nlAnswer.follow_up_questions.map((q: string) => (
                          <button
                            key={q}
                            onClick={() => setNlQuestion(q)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-dark-surface border border-dark-border text-text-secondary hover:text-brand-500 hover:border-brand-500/30 transition-all"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Insight Cards */}
            {!insights || insights.length === 0 ? (
              <div className="card p-12 text-center">
                <Brain className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <p className="text-text-secondary">AI insights are being generated...</p>
                <button
                  onClick={() => insightsApi.regenerate(id).then(() => {
                    toast.success('Regenerating insights...');
                    qc.invalidateQueries({ queryKey: ['insights', id] });
                  })}
                  className="btn-ghost mt-4 text-sm"
                >
                  <RefreshCw className="w-4 h-4 inline mr-2" />Regenerate Insights
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {insights.map((insight: any) => {
                  const severityMap: Record<string, string> = {
                    info: 'border-l-brand-500 bg-brand-500/5',
                    warning: 'border-l-amber-500 bg-amber-500/5',
                    critical: 'border-l-red-500 bg-red-500/5',
                    success: 'border-l-emerald-500 bg-emerald-500/5',
                  };
                  const iconMap: Record<string, any> = {
                    info: Brain, warning: AlertTriangle, critical: AlertTriangle, success: CheckCircle,
                  };
                  const colorMap: Record<string, string> = {
                    info: 'text-brand-500', warning: 'text-amber-400', critical: 'text-red-400', success: 'text-emerald-400',
                  };
                  const Icon = iconMap[insight.severity] || Brain;
                  const catLabels: Record<string, string> = {
                    overview: 'Overview', quality: 'Data Quality', patterns: 'Patterns',
                    anomalies: 'Anomalies', recommendations: 'Recommendations',
                    ml_suggestions: 'ML Suggestions', feature_engineering: 'Feature Engineering',
                    business_insights: 'Business Insights',
                  };
                  return (
                    <div key={insight.id} className={clsx('card border-l-4 p-5', severityMap[insight.severity] || severityMap.info)}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <Icon className={clsx('w-4 h-4 mt-0.5 flex-shrink-0', colorMap[insight.severity])} />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-text-muted">{catLabels[insight.category] || insight.category}</span>
                              <span className="text-text-muted">·</span>
                              <span className="text-xs text-text-muted">{Math.round(insight.confidence * 100)}% confidence</span>
                            </div>
                            <div className="font-semibold text-white text-sm">{insight.title}</div>
                            <p className="text-text-secondary text-sm mt-1 leading-relaxed">{insight.content}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => dismissInsight.mutate(insight.id)}
                          className="text-text-muted hover:text-text-secondary text-xs transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: QUERY */}
        {tab === 'query' && (
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="font-display font-bold text-white mb-1 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-violet-400" />
                DuckDB SQL Query
              </h3>
              <p className="text-text-muted text-sm mb-4">Query your dataset using SQL. The table is called <code className="code">dataset</code>.</p>
              <textarea
                value={sqlQuery}
                onChange={e => setSqlQuery(e.target.value)}
                className="input font-mono text-sm resize-none h-32"
                placeholder="SELECT * FROM dataset LIMIT 20"
              />
              <div className="flex justify-between items-center mt-3">
                <div className="text-xs text-text-muted">Only SELECT queries are allowed. Limited to first 1,000 rows.</div>
                <button
                  onClick={handleSQLQuery}
                  disabled={queryLoading}
                  className="btn-violet flex items-center gap-2"
                >
                  {queryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                  Run Query
                </button>
              </div>
            </div>

            {queryResult && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-dark-border flex items-center justify-between">
                  <span className="text-sm text-text-secondary font-mono">
                    {queryResult.total_rows} rows returned
                  </span>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-xs font-mono">
                    <thead className="sticky top-0 bg-dark-surface">
                      <tr>
                        {queryResult.columns?.map((col: string) => (
                          <th key={col} className="px-3 py-2 text-left text-text-muted border-b border-dark-border whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.data?.slice(0, 100).map((row: any, i: number) => (
                        <tr key={i} className="border-b border-dark-border hover:bg-white/2">
                          {queryResult.columns?.map((col: string) => (
                            <td key={col} className="px-3 py-1.5 text-text-secondary max-w-xs truncate">
                              {String(row[col] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="h-8 bg-dark-border rounded-lg shimmer w-64" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-dark-border rounded-xl shimmer" />)}
      </div>
      <div className="h-64 bg-dark-border rounded-xl shimmer" />
    </div>
  );
}

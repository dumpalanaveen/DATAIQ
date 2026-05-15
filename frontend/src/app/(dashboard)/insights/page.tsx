'use client';
import { useQuery } from '@tanstack/react-query';
import { datasetsApi, insightsApi } from '@/lib/api';
import Link from 'next/link';
import { clsx } from 'clsx';
import { Brain, Database, AlertTriangle, CheckCircle, TrendingUp, Cpu, Lightbulb, ArrowRight } from 'lucide-react';

const categoryConfig: Record<string, { label: string; icon: any; color: string }> = {
  overview:            { label: 'Overview',           icon: Database,      color: 'text-brand-500'  },
  quality:             { label: 'Data Quality',       icon: CheckCircle,   color: 'text-emerald-400'},
  patterns:            { label: 'Patterns',           icon: TrendingUp,    color: 'text-violet-400' },
  anomalies:           { label: 'Anomalies',          icon: AlertTriangle, color: 'text-amber-400'  },
  recommendations:     { label: 'Recommendations',    icon: Lightbulb,     color: 'text-brand-500'  },
  ml_suggestions:      { label: 'ML Suggestions',     icon: Cpu,           color: 'text-violet-400' },
  feature_engineering: { label: 'Feature Eng.',       icon: Brain,         color: 'text-pink-400'   },
  business_insights:   { label: 'Business Insights',  icon: TrendingUp,    color: 'text-amber-400'  },
};

const severityStyles: Record<string, string> = {
  info:     'border-l-brand-500/60 bg-brand-500/5',
  success:  'border-l-emerald-500/60 bg-emerald-500/5',
  warning:  'border-l-amber-500/60 bg-amber-500/5',
  critical: 'border-l-red-500/60 bg-red-500/5',
};

export default function InsightsPage() {
  const { data: datasets } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => datasetsApi.list({ ordering: '-created_at' }).then(r => r.data),
  });

  const readyDatasets = datasets?.results?.filter((d: any) => d.status === 'ready') || [];

  const insightQueries = readyDatasets.slice(0, 5).map((ds: any) => ({
    id: ds.id,
    name: ds.name,
  }));

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-white flex items-center gap-3">
          <Brain className="w-8 h-8 text-brand-500" />
          AI Insights
        </h1>
        <p className="text-text-secondary mt-1">AI-generated analysis across all your datasets.</p>
      </div>

      {readyDatasets.length === 0 ? (
        <div className="card p-16 text-center">
          <Brain className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="font-display text-xl text-white mb-2">No insights yet</h3>
          <p className="text-text-secondary mb-6">Upload and process a dataset to get AI-powered insights.</p>
          <Link href="/upload" className="btn-primary inline-flex items-center gap-2">
            <Database className="w-4 h-4" /> Upload Dataset
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {readyDatasets.slice(0, 5).map((ds: any) => (
            <DatasetInsightSection key={ds.id} dataset={ds} />
          ))}
        </div>
      )}
    </div>
  );
}

function DatasetInsightSection({ dataset }: { dataset: any }) {
  const { data: insights, isLoading } = useQuery({
    queryKey: ['insights', dataset.id],
    queryFn: () => insightsApi.list(dataset.id).then(r => r.data),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href={`/datasets/${dataset.id}`} className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-brand-500/10 border border-brand-500/20 rounded-lg flex items-center justify-center">
            <Database className="w-4 h-4 text-brand-500" />
          </div>
          <span className="font-display font-bold text-white group-hover:text-brand-500 transition-colors">{dataset.name}</span>
          <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-brand-500 transition-colors" />
        </Link>
        <span className="text-text-muted text-sm font-mono">{insights?.length || 0} insights</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-dark-border rounded-xl shimmer" />)}
        </div>
      ) : !insights || insights.length === 0 ? (
        <div className="card p-6 text-center text-text-muted">Generating insights...</div>
      ) : (
        <div className="grid gap-3">
          {insights.map((insight: any) => {
            const cat = categoryConfig[insight.category] || categoryConfig.overview;
            const Icon = cat.icon;
            return (
              <div key={insight.id} className={clsx('card border-l-4 p-5', severityStyles[insight.severity] || severityStyles.info)}>
                <div className="flex items-start gap-3">
                  <Icon className={clsx('w-4 h-4 mt-0.5 flex-shrink-0', cat.color)} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-text-muted">{cat.label}</span>
                    </div>
                    <div className="font-semibold text-white text-sm">{insight.title}</div>
                    <p className="text-text-secondary text-sm mt-1 leading-relaxed">{insight.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

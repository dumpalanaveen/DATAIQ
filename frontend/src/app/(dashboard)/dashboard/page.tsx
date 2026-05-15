'use client';
import { useQuery } from '@tanstack/react-query';
import { authApi, datasetsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import Link from 'next/link';
import {
  Database, BarChart3, Brain, Upload, TrendingUp,
  AlertCircle, CheckCircle, Clock, ArrowRight, Zap, Plus
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';

const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  ready:      { label: 'Ready',      dot: 'status-ready',      badge: 'badge-green'  },
  processing: { label: 'Processing', dot: 'status-processing', badge: 'badge-amber'  },
  error:      { label: 'Error',      dot: 'status-error',      badge: 'badge-red'    },
  uploaded:   { label: 'Uploaded',   dot: 'status-uploading',  badge: 'badge-cyan'   },
  uploading:  { label: 'Uploading',  dot: 'status-uploading',  badge: 'badge-cyan'   },
};

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => authApi.dashboardStats().then(r => r.data),
    refetchInterval: 15000,
  });

  const { data: datasets } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => datasetsApi.list({ ordering: '-created_at' }).then(r => r.data),
    refetchInterval: 10000,
  });

  const recentDatasets = datasets?.results?.slice(0, 5) || [];

  const metricCards = [
    {
      label: 'Total Datasets',
      value: stats?.total_datasets ?? 0,
      icon: Database,
      color: 'brand',
      href: '/datasets',
    },
    {
      label: 'Analyses Run',
      value: stats?.total_analyses ?? 0,
      icon: BarChart3,
      color: 'violet',
      href: '/datasets',
    },
    {
      label: 'Storage Used',
      value: `${(stats?.storage_used_mb ?? 0).toFixed(1)} MB`,
      icon: Brain,
      color: 'amber',
      href: '/datasets',
    },
    {
      label: 'Plan',
      value: (user?.plan ?? 'free').toUpperCase(),
      icon: Zap,
      color: 'green',
      href: '/settings',
    },
  ];

  const colorMap: Record<string, string> = {
    brand: 'text-brand-500 bg-brand-500/10 border-brand-500/20',
    violet: 'text-violet-400 bg-violet-600/10 border-violet-600/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            Welcome back, {user?.first_name || 'Analyst'} 👋
          </h1>
          <p className="text-text-secondary mt-1">
            Here's what's happening with your data today.
          </p>
        </div>
        <Link href="/upload" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Upload Dataset
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href} className="metric-card card-hover group">
            <div className={clsx('w-10 h-10 rounded-xl border flex items-center justify-center mb-4', colorMap[color])}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
            <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>

      {/* Recent Datasets + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Datasets */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between p-6 border-b border-dark-border">
            <h2 className="font-display font-bold text-lg text-white">Recent Datasets</h2>
            <Link href="/datasets" className="text-brand-500 text-sm hover:text-brand-400 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-dark-border">
            {recentDatasets.length === 0 ? (
              <div className="p-12 text-center">
                <Database className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <p className="text-text-secondary">No datasets yet.</p>
                <Link href="/upload" className="btn-primary inline-flex mt-4 items-center gap-2 text-sm">
                  <Upload className="w-4 h-4" /> Upload your first dataset
                </Link>
              </div>
            ) : recentDatasets.map((ds: any) => {
              const sc = statusConfig[ds.status] || statusConfig.uploaded;
              return (
                <Link
                  key={ds.id}
                  href={`/datasets/${ds.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-white/2 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <Database className="w-4 h-4 text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm truncate group-hover:text-brand-400 transition-colors">
                      {ds.name}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5 font-mono">
                      {ds.row_count ? `${ds.row_count.toLocaleString()} rows` : '—'}
                      {ds.column_count ? ` × ${ds.column_count} cols` : ''}
                      {' · '}
                      {formatDistanceToNow(new Date(ds.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <span className={clsx('badge', sc.badge)}>
                    <span className={clsx('status-dot', sc.dot)} />
                    {sc.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Actions + Tips */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-display font-bold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { href: '/upload', icon: Upload, label: 'Upload Dataset', sub: 'CSV, Excel, JSON, Parquet', color: 'text-brand-500' },
                { href: '/datasets', icon: BarChart3, label: 'View Analytics', sub: 'Charts & profiles', color: 'text-violet-400' },
                { href: '/insights', icon: Brain, label: 'AI Insights', sub: 'Natural language analysis', color: 'text-amber-400' },
                { href: '/reports', icon: Brain, label: 'Export Reports', sub: 'PDF reports', color: 'text-emerald-400' },
              ].map(({ href, icon: Icon, label, sub, color }) => (
                <Link key={href} href={href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group">
                  <Icon className={clsx('w-4 h-4 flex-shrink-0', color)} />
                  <div>
                    <div className="text-sm font-medium text-white group-hover:text-brand-400 transition-colors">{label}</div>
                    <div className="text-xs text-text-muted">{sub}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="card p-5 border-brand-500/20 bg-brand-500/5">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-brand-500" />
              <span className="text-sm font-semibold text-brand-500">Pro Tip</span>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Upload any CSV and DataIQ will automatically detect column types, find outliers, generate charts, and provide AI-powered insights within seconds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

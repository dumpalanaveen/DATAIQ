'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { datasetsApi } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import {
  Database, Search, Plus, Trash2, RefreshCw,
  ArrowUpDown, BarChart3, FileText, ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const statusConfig: Record<string, any> = {
  ready:      { label: 'Ready',      cls: 'badge-green',  dot: 'status-ready'      },
  processing: { label: 'Processing', cls: 'badge-amber',  dot: 'status-processing' },
  error:      { label: 'Error',      cls: 'badge-red',    dot: 'status-error'      },
  uploaded:   { label: 'Queued',     cls: 'badge-cyan',   dot: 'status-uploading'  },
  uploading:  { label: 'Uploading',  cls: 'badge-cyan',   dot: 'status-uploading'  },
};

const fileTypeColors: Record<string, string> = {
  csv: 'text-green-400', excel: 'text-emerald-400',
  json: 'text-amber-400', parquet: 'text-violet-400',
};

export default function DatasetsPage() {
  const [search, setSearch] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['datasets', search, ordering],
    queryFn: () => datasetsApi.list({ search, ordering }).then(r => r.data),
    refetchInterval: 8000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => datasetsApi.delete(id),
    onSuccess: () => { toast.success('Dataset deleted'); qc.invalidateQueries({ queryKey: ['datasets'] }); },
    onError: () => toast.error('Failed to delete'),
  });

  const reprocessMutation = useMutation({
    mutationFn: (id: string) => datasetsApi.reprocess(id),
    onSuccess: () => { toast.success('Reprocessing started'); qc.invalidateQueries({ queryKey: ['datasets'] }); },
  });

  const datasets = data?.results || [];

  const toggleOrder = (field: string) => {
    setOrdering(o => o === field ? `-${field}` : field);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Datasets</h1>
          <p className="text-text-secondary mt-1">{data?.count || 0} datasets in your workspace</p>
        </div>
        <Link href="/upload" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Dataset
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
            placeholder="Search datasets..."
          />
        </div>
        <button onClick={() => refetch()} className="btn-ghost flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  <button onClick={() => toggleOrder('name')} className="flex items-center gap-1 hover:text-white transition-colors">
                    Name <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  <button onClick={() => toggleOrder('row_count')} className="flex items-center gap-1 hover:text-white transition-colors">
                    Dimensions <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  <button onClick={() => toggleOrder('file_size')} className="flex items-center gap-1 hover:text-white transition-colors">
                    Size <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  <button onClick={() => toggleOrder('-created_at')} className="flex items-center gap-1 hover:text-white transition-colors">
                    Created <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-dark-border rounded shimmer" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : datasets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Database className="w-10 h-10 text-text-muted mx-auto mb-3" />
                    <p className="text-text-secondary">No datasets found.</p>
                    <Link href="/upload" className="btn-primary inline-flex mt-4 items-center gap-2 text-sm">
                      <Plus className="w-4 h-4" /> Upload first dataset
                    </Link>
                  </td>
                </tr>
              ) : datasets.map((ds: any) => {
                const sc = statusConfig[ds.status] || statusConfig.uploaded;
                return (
                  <tr key={ds.id} className="hover:bg-white/2 transition-colors group">
                    <td className="px-5 py-4">
                      <Link href={`/datasets/${ds.id}`} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Database className="w-4 h-4 text-brand-500" />
                        </div>
                        <div>
                          <div className="font-medium text-white text-sm group-hover:text-brand-400 transition-colors">
                            {ds.name}
                          </div>
                          {ds.description && (
                            <div className="text-xs text-text-muted truncate max-w-xs">{ds.description}</div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <span className={clsx('text-xs font-mono font-bold uppercase', fileTypeColors[ds.file_type])}>
                        {ds.file_type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-mono text-text-secondary">
                        {ds.row_count ? `${ds.row_count.toLocaleString()} × ${ds.column_count}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-mono text-text-secondary">
                        {ds.file_size_mb ? `${ds.file_size_mb} MB` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={clsx('badge', sc.cls)}>
                        <span className={clsx('status-dot', sc.dot)} />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-text-muted font-mono">
                      {formatDistanceToNow(new Date(ds.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/datasets/${ds.id}`}
                          className="p-1.5 rounded-lg hover:bg-brand-500/10 text-text-muted hover:text-brand-500 transition-colors"
                          title="View"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        {ds.status === 'error' && (
                          <button
                            onClick={() => reprocessMutation.mutate(ds.id)}
                            className="p-1.5 rounded-lg hover:bg-amber-500/10 text-text-muted hover:text-amber-400 transition-colors"
                            title="Reprocess"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Delete this dataset and all its analysis?')) {
                              deleteMutation.mutate(ds.id);
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

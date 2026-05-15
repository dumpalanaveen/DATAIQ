'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { datasetsApi, reportsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { FileText, Download, Loader2, Database, CheckCircle, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';

export default function ReportsPage() {
  const [selectedDataset, setSelectedDataset] = useState('');
  const [options, setOptions] = useState({
    include_visualizations: true,
    include_ai_insights: true,
    include_ml_suggestions: true,
  });
  const [generatedReport, setGeneratedReport] = useState<any>(null);

  const { data: datasets } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => datasetsApi.list().then(r => r.data),
  });

  const readyDatasets = datasets?.results?.filter((d: any) => d.status === 'ready') || [];

  const generateMutation = useMutation({
    mutationFn: () => reportsApi.generate(selectedDataset, options),
    onSuccess: ({ data }) => {
      setGeneratedReport(data);
      toast.success('Report generation started!');
    },
    onError: () => toast.error('Failed to generate report'),
  });

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white flex items-center gap-3">
          <FileText className="w-8 h-8 text-brand-500" />
          Export Reports
        </h1>
        <p className="text-text-secondary mt-1">Generate comprehensive PDF/HTML reports for your datasets.</p>
      </div>

      <div className="card p-6 space-y-5">
        <h3 className="font-display font-bold text-white">Generate New Report</h3>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Select Dataset</label>
          <select
            value={selectedDataset}
            onChange={e => setSelectedDataset(e.target.value)}
            className="input"
          >
            <option value="">Choose a dataset...</option>
            {readyDatasets.map((ds: any) => (
              <option key={ds.id} value={ds.id}>
                {ds.name} ({ds.row_count?.toLocaleString() || 0} rows)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-3">Include Sections</label>
          <div className="space-y-2">
            {[
              { key: 'include_visualizations', label: 'Charts & Visualizations', desc: 'All generated charts embedded as images' },
              { key: 'include_ai_insights', label: 'AI Insights', desc: 'AI-generated analysis and recommendations' },
              { key: 'include_ml_suggestions', label: 'ML Recommendations', desc: 'Suitable models and feature suggestions' },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-start gap-3 p-3 rounded-lg border border-dark-border hover:border-brand-500/30 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={(options as any)[key]}
                  onChange={e => setOptions({ ...options, [key]: e.target.checked })}
                  className="mt-0.5 accent-cyan-400"
                />
                <div>
                  <div className="text-sm font-medium text-white">{label}</div>
                  <div className="text-xs text-text-muted">{desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={() => generateMutation.mutate()}
          disabled={!selectedDataset || generateMutation.isPending}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {generateMutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
          ) : (
            <><FileText className="w-4 h-4" /> Generate Report</>
          )}
        </button>
      </div>

      {/* Generated Report */}
      {generatedReport && (
        <div className="card p-6">
          <h3 className="font-display font-bold text-white mb-4">Report Status</h3>
          <ReportStatus report={generatedReport} />
        </div>
      )}

      {readyDatasets.length === 0 && (
        <div className="card p-10 text-center">
          <Database className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">No ready datasets found. Upload and process a dataset first.</p>
        </div>
      )}
    </div>
  );
}

function ReportStatus({ report }: { report: any }) {
  const { data, refetch } = useQuery({
    queryKey: ['report', report.id],
    queryFn: () => reportsApi.status(report.id).then((r: any) => r.data),
    refetchInterval: (data: any) => data?.status === 'ready' ? false : 3000,
    initialData: report,
  });

  const status = data?.status || 'pending';

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {status === 'ready' ? (
          <CheckCircle className="w-5 h-5 text-emerald-400" />
        ) : (
          <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
        )}
        <div>
          <div className="text-sm font-medium text-white">{data?.title || 'Analysis Report'}</div>
          <div className="text-xs text-text-muted capitalize">{status}</div>
        </div>
      </div>
      {status === 'ready' && (
        <a
          href={reportsApi.download(report.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Download className="w-4 h-4" /> Download
        </a>
      )}
    </div>
  );
}

'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { datasetsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Upload, File, X, CheckCircle, AlertCircle, Zap, Database } from 'lucide-react';
import { clsx } from 'clsx';

const SUPPORTED = ['.csv', '.xlsx', '.xls', '.json', '.parquet'];

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      const baseName = accepted[0].name.replace(/\.[^.]+$/, '');
      setName(baseName);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json'],
      'application/octet-stream': ['.parquet'],
    },
    maxSize: 100 * 1024 * 1024,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name || file.name.replace(/\.[^.]+$/, ''));
    if (description) formData.append('description', description);
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      formData.append('tags', JSON.stringify(tagList));
    }

    try {
      // Simulate progress
      const interval = setInterval(() => setProgress(p => Math.min(p + 8, 85)), 300);

      const { data } = await datasetsApi.upload(formData);
      clearInterval(interval);
      setProgress(100);

      toast.success('Dataset uploaded! Analysis starting...');
      setTimeout(() => router.push(`/datasets/${data.id}`), 600);
    } catch (err: any) {
      setUploading(false);
      setProgress(0);
      const msg = err.response?.data?.file?.[0] || err.response?.data?.detail || 'Upload failed';
      toast.error(msg);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    const colors: Record<string, string> = {
      csv: 'text-green-400', xlsx: 'text-emerald-400', xls: 'text-emerald-400',
      json: 'text-amber-400', parquet: 'text-violet-400',
    };
    return colors[ext || ''] || 'text-brand-500';
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Upload Dataset</h1>
        <p className="text-text-secondary mt-1">
          Upload your data and let DataIQ's AI engine analyze it automatically.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={clsx(
          'relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300',
          isDragActive
            ? 'border-brand-500 bg-brand-500/10 scale-[1.01]'
            : file
            ? 'border-emerald-500/50 bg-emerald-500/5'
            : 'border-dark-border hover:border-brand-500/50 hover:bg-brand-500/5',
        )}
      >
        <input {...getInputProps()} />

        {file ? (
          <div className="space-y-3">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
            <div>
              <div className={clsx('text-lg font-semibold', getFileIcon(file.name))}>{file.name}</div>
              <div className="text-sm text-text-muted font-mono mt-1">{formatBytes(file.size)}</div>
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setFile(null); setName(''); }}
              className="text-xs text-text-muted hover:text-red-400 transition-colors flex items-center gap-1 mx-auto"
            >
              <X className="w-3 h-3" /> Remove file
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-brand-500/10 border border-brand-500/20 rounded-2xl flex items-center justify-center mx-auto">
              <Upload className={clsx('w-7 h-7', isDragActive ? 'text-brand-500 animate-bounce' : 'text-brand-500/60')} />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">
                {isDragActive ? 'Drop it here!' : 'Drag & drop your dataset'}
              </p>
              <p className="text-text-secondary text-sm mt-1">or click to browse files</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUPPORTED.map(ext => (
                <span key={ext} className="badge-cyan text-xs px-2 py-0.5 rounded font-mono">
                  {ext}
                </span>
              ))}
            </div>
            <p className="text-text-muted text-xs">Maximum file size: 100 MB</p>
          </div>
        )}

        {fileRejections.length > 0 && (
          <div className="mt-4 flex items-center gap-2 text-red-400 text-sm justify-center">
            <AlertCircle className="w-4 h-4" />
            {fileRejections[0].errors[0].message}
          </div>
        )}
      </div>

      {/* Metadata Form */}
      {file && (
        <div className="card p-6 space-y-5">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-brand-500" /> Dataset Details
          </h3>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Dataset Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="input"
              placeholder="My Dataset"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Description <span className="text-text-muted">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="input resize-none h-20"
              placeholder="Brief description of what this dataset contains..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Tags <span className="text-text-muted">(comma separated)</span>
            </label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="input"
              placeholder="sales, 2024, quarterly"
            />
          </div>

          {/* AI features preview */}
          <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-brand-500" />
              <span className="text-sm font-semibold text-brand-500">Automatic Analysis Includes</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
              {[
                '✦ Data profiling & statistics',
                '✦ Missing value analysis',
                '✦ Outlier detection',
                '✦ Correlation analysis',
                '✦ Auto chart generation',
                '✦ AI insights & recommendations',
                '✦ ML model suggestions',
                '✦ Feature engineering tips',
              ].map(item => <div key={item}>{item}</div>)}
            </div>
          </div>
        </div>
      )}

      {/* Upload Button & Progress */}
      {file && (
        <div className="space-y-3">
          {uploading && (
            <div>
              <div className="flex justify-between text-xs text-text-muted mb-1.5 font-mono">
                <span>Uploading & analyzing...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-dark-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading || !name.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {uploading ? (
              <>
                <span className="w-4 h-4 border-2 border-dark-bg/30 border-t-dark-bg rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload & Analyze
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

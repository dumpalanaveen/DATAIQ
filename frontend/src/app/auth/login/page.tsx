'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Database, Zap, BarChart3, Brain } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Login failed. Check credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg bg-grid flex">
      {/* Left Panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-16 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/5 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500/10 border border-brand-500/30 rounded-xl flex items-center justify-center glow-cyan">
              <Database className="w-5 h-5 text-brand-500" />
            </div>
            <span className="font-display text-xl font-bold text-white">DataIQ</span>
          </div>
        </div>
        
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="font-display text-5xl font-bold text-white leading-tight">
              Intelligent<br />
              <span className="text-brand-500">Dataset</span><br />
              Analytics
            </h1>
            <p className="mt-4 text-text-secondary text-lg leading-relaxed max-w-md">
              Upload any dataset and instantly get AI-powered insights, auto-generated visualizations, and actionable recommendations.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Brain, label: 'AI Insights', desc: 'Auto-generated' },
              { icon: BarChart3, label: 'Smart Charts', desc: '15+ chart types' },
              { icon: Zap, label: 'Fast Analysis', desc: 'Background processing' },
              { icon: Database, label: 'Any Format', desc: 'CSV, Excel, JSON, Parquet' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-dark-card/50 border border-dark-border rounded-xl p-4">
                <Icon className="w-5 h-5 text-brand-500 mb-2" />
                <div className="font-semibold text-white text-sm">{label}</div>
                <div className="text-xs text-text-muted">{desc}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="relative z-10 text-text-muted text-sm">
          © 2024 DataIQ Platform
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <Database className="w-7 h-7 text-brand-500" />
            <span className="font-display text-xl font-bold text-white">DataIQ</span>
          </div>
          
          <div className="card p-8">
            <div className="mb-8">
              <h2 className="font-display text-2xl font-bold text-white">Sign in</h2>
              <p className="text-text-secondary mt-1">Enter your credentials to access the platform</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@company.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input pr-12"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full text-center"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-dark-bg/30 border-t-dark-bg rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : 'Sign in'}
              </button>
            </form>
            
            <div className="mt-6 pt-6 border-t border-dark-border text-center">
              <p className="text-text-secondary text-sm">
                Don't have an account?{' '}
                <Link href="/auth/register" className="text-brand-500 hover:text-brand-400 font-medium">
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

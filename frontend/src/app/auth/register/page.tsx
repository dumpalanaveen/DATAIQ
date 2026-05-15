'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import { Database } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: '', first_name: '', last_name: '',
    organization: '', password: '', password2: ''
  });
  const { register, isLoading } = useAuthStore();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.password2) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await register(form);
      toast.success('Account created! Welcome to DataIQ.');
      router.push('/dashboard');
    } catch (err: any) {
      const errors = err.response?.data;
      if (errors) {
        const msg = Object.values(errors).flat().join(' ');
        toast.error(msg || 'Registration failed');
      }
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg bg-grid flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center gap-3">
          <Database className="w-7 h-7 text-brand-500" />
          <span className="font-display text-xl font-bold text-white">DataIQ</span>
        </div>
        
        <div className="card p-8">
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold text-white">Create account</h2>
            <p className="text-text-secondary mt-1">Start analyzing datasets with AI in minutes</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">First name</label>
                <input name="first_name" value={form.first_name} onChange={handleChange}
                  className="input" placeholder="Jane" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Last name</label>
                <input name="last_name" value={form.last_name} onChange={handleChange}
                  className="input" placeholder="Smith" required />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange}
                className="input" placeholder="jane@company.com" required />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Organization <span className="text-text-muted">(optional)</span></label>
              <input name="organization" value={form.organization} onChange={handleChange}
                className="input" placeholder="Acme Corp" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Password</label>
              <input type="password" name="password" value={form.password} onChange={handleChange}
                className="input" placeholder="Min. 8 characters" required />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Confirm password</label>
              <input type="password" name="password2" value={form.password2} onChange={handleChange}
                className="input" placeholder="••••••••" required />
            </div>
            
            <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-dark-border text-center">
            <p className="text-text-secondary text-sm">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-brand-500 hover:text-brand-400 font-medium">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

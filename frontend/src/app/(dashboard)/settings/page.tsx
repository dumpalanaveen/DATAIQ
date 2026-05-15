'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Settings, User, Key, Bell, Database, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { user, updateProfile } = useAuthStore();
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    bio: (user as any)?.bio || '',
    organization: (user as any)?.organization || '',
    theme: user?.theme || 'dark',
    ai_provider_preference: (user as any)?.ai_provider_preference || 'gemini',
  });
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      await authApi.changePassword(passwordForm);
      toast.success('Password changed!');
      setPasswordForm({ old_password: '', new_password: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.old_password?.[0] || 'Failed to change password');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white flex items-center gap-3">
          <Settings className="w-8 h-8 text-brand-500" />
          Settings
        </h1>
      </div>

      {/* Profile */}
      <div className="card p-6 space-y-5">
        <h3 className="font-display font-bold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-brand-500" /> Profile
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">First Name</label>
            <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Last Name</label>
            <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} className="input" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Organization</label>
          <input value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} className="input" placeholder="Your company" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Bio</label>
          <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} className="input resize-none h-20" placeholder="Tell us about yourself..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">AI Provider</label>
          <select value={form.ai_provider_preference} onChange={e => setForm({ ...form, ai_provider_preference: e.target.value })} className="input">
            <option value="gemini">Google Gemini (Recommended)</option>
            <option value="openai">OpenAI GPT-4</option>
          </select>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Password */}
      <div className="card p-6 space-y-4">
        <h3 className="font-display font-bold text-white flex items-center gap-2">
          <Key className="w-4 h-4 text-violet-400" /> Change Password
        </h3>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Current Password</label>
          <input type="password" value={passwordForm.old_password}
            onChange={e => setPasswordForm({ ...passwordForm, old_password: e.target.value })} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">New Password</label>
          <input type="password" value={passwordForm.new_password}
            onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })} className="input" />
        </div>
        <button onClick={handleChangePassword} className="btn-ghost">Update Password</button>
      </div>

      {/* Account Info */}
      <div className="card p-6 space-y-3">
        <h3 className="font-display font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" /> Account Info
        </h3>
        {[
          { label: 'Email', value: user?.email },
          { label: 'Plan', value: (user?.plan || 'free').toUpperCase() },
          { label: 'Datasets Uploaded', value: user?.datasets_uploaded?.toString() },
          { label: 'Analyses Run', value: user?.analyses_run?.toString() },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between py-2 border-b border-dark-border last:border-0">
            <span className="text-text-secondary text-sm">{label}</span>
            <span className="text-white text-sm font-mono">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

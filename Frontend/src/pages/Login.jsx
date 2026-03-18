import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Lock, ArrowRight, Briefcase } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@abc.com', role: 'Full access' },
  { label: 'Manager', email: 'manager@abc.com', role: 'Team management' },
  { label: 'Employee', email: 'priya@abc.com', role: 'Self-service' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, mockAuthEnabled } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(
        mockAuthEnabled
          ? 'Invalid demo credentials. Use one of the demo emails with password: admin123'
          : err?.response?.data?.error || 'Invalid credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc) => {
    setEmail(acc.email);
    setPassword('admin123');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-500 rounded-full opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-400 rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 border border-white/20">
            <Briefcase className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">LeaveFlow</h1>
          <p className="text-brand-200 mt-1.5 text-sm">ABC Company Leave Management</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Sign in to continue</h2>

          {mockAuthEnabled && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              Mock auth mode is enabled. Login works with demo accounts only.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="you@abc.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Demo Accounts (password: admin123)</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.email}
                  onClick={() => fillDemo(acc)}
                  className="flex flex-col items-center p-3 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition-all text-left group"
                >
                  <span className="text-xs font-bold text-slate-700 group-hover:text-brand-600">{acc.label}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{acc.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
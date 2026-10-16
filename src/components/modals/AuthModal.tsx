import React, { useState } from 'react';
import { X, Mail, Lock, User, Building, AlertCircle, CheckCircle, ArrowRight, RefreshCw, KeyRound } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { DepartmentType } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
  initialMode?: 'login' | 'signup' | 'reset';
  departments?: DepartmentType[];
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
  departments = ['Technical', 'Design', 'Marketing', 'Event Management', 'Media', 'Content'],
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState<DepartmentType>('Technical');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfigured = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isConfigured || !supabase) {
      setErrorMsg('Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not configured. Running in Demo Mode.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (data.session) {
          setSuccessMsg('Signed in successfully!');
          setTimeout(() => {
            onClose();
            if (onAuthSuccess) onAuthSuccess();
          }, 800);
        }
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              name: fullName.trim(),
              department,
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          setSuccessMsg('Account created and signed in! Welcome to ClubFlow.');
          setTimeout(() => {
            onClose();
            if (onAuthSuccess) onAuthSuccess();
          }, 1000);
        } else if (data.user) {
          setSuccessMsg(
            'Account created! Please check your email to confirm your registration before logging in.'
          );
        }
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
        setSuccessMsg('Password reset instructions have been sent to your email.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication operation failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-600" />
              {mode === 'login' && 'Sign in to ClubFlow'}
              {mode === 'signup' && 'Create Member Account'}
              {mode === 'reset' && 'Reset Password'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'login' && 'Enter your university credentials to access the portal'}
              {mode === 'signup' && 'Register as a student club member or lead'}
              {mode === 'reset' && 'Receive recovery instructions at your university email'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isConfigured && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex gap-2.5 items-start">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Demo Sandbox Mode Active:</span> To connect real user authentication, set{' '}
                <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and{' '}
                <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code>.
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex gap-2 items-start">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dishank Solanki"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Department</label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as DepartmentType)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden bg-white transition"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@campus.edu"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden transition"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden transition"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {mode === 'login' && 'Sign In'}
                {mode === 'signup' && 'Complete Registration'}
                {mode === 'reset' && 'Send Reset Link'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Modal Footer Switcher */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-600">
          {mode === 'login' && (
            <p>
              New member on campus?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                Create an account
              </button>
            </p>
          )}

          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                Sign in here
              </button>
            </p>
          )}

          {mode === 'reset' && (
            <p>
              Remembered your credentials?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                Back to Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

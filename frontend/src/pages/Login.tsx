import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { trpc } from '../utils/trpc.js';
import { Scale, Lock, Mail, AlertTriangle, Loader2 } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const loginMutation = trpc.auth.login.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const response = await loginMutation.mutateAsync({ email, password });
      onLoginSuccess(response.token, response.user);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center space-y-4">
        <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-white tracking-wide">
          <Scale size={28} className="text-indigo-400" />
          Themis
        </Link>
        <h2 className="text-3xl font-extrabold text-white">Welcome back</h2>
        <p className="text-sm text-slate-400">
          Or{' '}
          <Link to="/register" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-slate-900/60 backdrop-blur-xl py-8 px-4 border border-slate-800 shadow-2xl sm:rounded-3xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
                <AlertTriangle size={18} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email address
              </label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail size={18} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="block w-full pl-10 pr-3 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                  Password
                </label>
              </div>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loginMutation.isLoading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-55"
              >
                {loginMutation.isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

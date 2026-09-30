import { trpc } from '../utils/trpc.js';
import { useAuth } from '../hooks/useAuth.js';
import {
  User, Mail, Shield, Clock, Edit3, Save, UserCheck
} from 'lucide-react';
import { useState } from 'react';

export default function Profile() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');

  const { data: me } = trpc.auth.me.useQuery();

  const profile = me?.user;
  const advocateStatus = (profile as any)?.advocateStatus;

  const statusStyles: Record<string, string> = {
    approved: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    pending: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    rejected: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-600/8 rounded-full blur-[110px] pointer-events-none" />

      <div className="space-y-6">
        {/* Header Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/30 to-purple-600/30 border border-indigo-500/20 flex items-center justify-center text-3xl font-extrabold text-indigo-400">
              {profile?.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 space-y-1">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-lg font-bold focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => setEditing(false)}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all"
                    title="Save"
                  >
                    <Save size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-white">{profile?.name}</h1>
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              )}
              <p className="text-slate-400 text-sm flex items-center gap-1.5">
                <Mail size={14} /> {profile?.email}
              </p>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold capitalize">
                <Shield size={12} /> {profile?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Advocate Status Card */}
        {profile?.role === 'advocate' && (
          <div className={`rounded-3xl border p-6 flex items-center gap-4 ${advocateStatus ? statusStyles[advocateStatus] : statusStyles['pending']}`}>
            <UserCheck size={28} className="flex-shrink-0" />
            <div>
              <h3 className="font-bold text-sm">Bar Council Verification Status</h3>
              <p className="text-xs mt-0.5 font-light capitalize">
                {advocateStatus === 'approved'
                  ? 'Your advocate profile is verified and listed in the public directory.'
                  : advocateStatus === 'rejected'
                  ? 'Your verification was rejected. Please contact platform support with corrected credentials.'
                  : 'Your application is under review by our admin team. You will be notified once approved.'}
              </p>
              <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider capitalize">
                Status: {advocateStatus || 'pending'}
              </span>
            </div>
          </div>
        )}

        {/* Account Info Card */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Account Information</h2>
          <div className="divide-y divide-slate-800/80">
            {[
              { label: 'Full Name', value: profile?.name, icon: <User size={15} /> },
              { label: 'Email Address', value: profile?.email, icon: <Mail size={15} /> },
              { label: 'Account Role', value: profile?.role, icon: <Shield size={15} /> },
            ].map((row) => (
              <div key={row.label} className="py-3.5 flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="text-slate-600">{row.icon}</span>
                  {row.label}
                </div>
                <span className="text-sm font-medium text-slate-200 capitalize">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Session Info */}
        <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl px-6 py-4 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><Clock size={13} /> Session active · JWT token-based auth</span>
          <span className="text-emerald-400 font-semibold">● Connected</span>
        </div>
      </div>
    </div>
  );
}

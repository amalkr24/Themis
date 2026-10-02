import { trpc } from '../utils/trpc.js';
import { useAuth } from '../hooks/useAuth.js';
import {
  User, Mail, Shield, Clock, Edit3, Save, UserCheck, Lock, CheckCircle2, AlertCircle, Loader2, KeyRound
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Profile() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [advocateBio, setAdvocateBio] = useState('');
  const [advocatePractice, setAdvocatePractice] = useState('');
  const [isEditingAdvocate, setIsEditingAdvocate] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: me, refetch: refetchMe } = trpc.auth.me.useQuery();
  const updateProfileMutation = trpc.auth.updateProfile.useMutation();
  const changePasswordMutation = trpc.auth.changePassword.useMutation();

  const profile = me?.user;
  const advocateStatus = (profile as any)?.advocateStatus;
  const advocateDetails = (profile as any)?.advocateProfile;

  useEffect(() => {
    if (profile?.name) setNewName(profile.name);
    if (advocateDetails?.bio) setAdvocateBio(advocateDetails.bio);
    if (advocateDetails?.practiceAreas) setAdvocatePractice(advocateDetails.practiceAreas);
  }, [profile, advocateDetails]);

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    try {
      await updateProfileMutation.mutateAsync({ name: newName.trim() });
      const saved = localStorage.getItem('themis_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.name = newName.trim();
        localStorage.setItem('themis_user', JSON.stringify(parsed));
      }
      setEditing(false);
      refetchMe();
    } catch (err: any) {
      alert(err.message || 'Error updating profile name');
    }
  };

  const handleSaveAdvocateInfo = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        bio: advocateBio,
        practiceAreas: advocatePractice,
      });
      setIsEditingAdvocate(false);
      refetchMe();
    } catch (err: any) {
      alert(err.message || 'Error updating advocate credentials');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      });
      setPasswordMsg({ type: 'success', text: 'Password successfully changed!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to change password' });
    }
  };

  const statusStyles: Record<string, string> = {
    approved: 'neo-card border-black/15 text-[#111317]',
    pending: 'neo-inset-sm text-slate-700',
    rejected: 'neo-card-sm text-rose-600',
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 relative">
      <div className="space-y-6">
        {/* Header Card */}
        <div className="neo-card p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-20 h-20 rounded-3xl neo-inset-sm flex items-center justify-center text-3xl font-extrabold text-[#111317]">
              {profile?.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 space-y-1">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="px-3.5 py-2 neo-inset rounded-xl text-[#0f172a] text-lg font-bold focus:outline-none"
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={updateProfileMutation.isLoading}
                    className="p-2.5 neo-btn-black rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
                    title="Save"
                  >
                    {updateProfileMutation.isLoading ? <Loader2 size={16} className="animate-spin text-white" /> : <Save size={16} className="text-white" />}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-3.5 py-2 neo-btn text-slate-700 hover:text-black rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-[#111317]">{profile?.name}</h1>
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1.5 neo-btn text-slate-700 hover:text-black rounded-lg transition-all"
                    title="Edit Name"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              )}
              <p className="text-slate-600 text-sm flex items-center gap-1.5 font-medium">
                <Mail size={14} className="text-[#111317]" /> {profile?.email}
              </p>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg neo-inset-sm text-slate-800 text-xs font-bold capitalize">
                  <Shield size={12} className="text-[#111317]" /> {profile?.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Advocate Status Card */}
        {profile?.role === 'advocate' && (
          <div className={`p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${advocateStatus ? statusStyles[advocateStatus] : statusStyles['pending']}`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl neo-inset-sm flex items-center justify-center flex-shrink-0">
                <UserCheck size={24} className="text-[#111317]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#111317]">Bar Council Verification Status</h3>
                <p className="text-xs mt-0.5 text-slate-600 font-medium">
                  {advocateStatus === 'approved'
                    ? 'Your advocate profile is verified and active in the public Advocate Directory.'
                    : advocateStatus === 'rejected'
                    ? 'Your verification was rejected by Registry Admin. Please update your Bar credentials.'
                    : 'Your Bar Council registration is pending Registry review. You will be notified once approved.'}
                </p>
                <div className="flex items-center gap-3 mt-2 text-[11px] font-bold">
                  <span className="neo-btn-black px-2.5 py-0.5 rounded-lg text-[9px] uppercase tracking-wider">
                    Status: {advocateStatus || 'pending'}
                  </span>
                  {advocateDetails?.barCouncilNumber && (
                    <span className="font-mono text-slate-700 neo-inset-sm px-2.5 py-0.5 rounded-lg text-[10px]">
                      Bar ID: {advocateDetails.barCouncilNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advocate Profile Details Editor */}
        {profile?.role === 'advocate' && (
          <div className="neo-card p-6 md:p-8 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Practice Profile & Bio</h2>
              {!isEditingAdvocate ? (
                <button
                  onClick={() => setIsEditingAdvocate(true)}
                  className="px-3.5 py-1.5 neo-btn text-slate-800 hover:text-black text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Edit3 size={12} /> Edit Practice Details
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveAdvocateInfo}
                    disabled={updateProfileMutation.isLoading}
                    className="px-3.5 py-1.5 neo-btn-black text-xs font-bold rounded-xl flex items-center gap-1"
                  >
                    <Save size={12} className="text-white" /> Save
                  </button>
                  <button
                    onClick={() => setIsEditingAdvocate(false)}
                    className="px-3.5 py-1.5 neo-btn text-slate-700 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {isEditingAdvocate ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Practice Areas</label>
                  <input
                    value={advocatePractice}
                    onChange={(e) => setAdvocatePractice(e.target.value)}
                    className="w-full px-3.5 py-2.5 neo-inset rounded-xl text-xs text-slate-800 focus:outline-none"
                    placeholder="e.g. Criminal, Consumer, Civil Litigation"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Professional Bio</label>
                  <textarea
                    value={advocateBio}
                    onChange={(e) => setAdvocateBio(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 neo-inset rounded-xl text-xs text-slate-800 focus:outline-none"
                    placeholder="Describe your legal representation background..."
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 font-bold block mb-0.5">Practice Areas:</span>
                  <span className="text-[#111317] font-semibold">{advocateDetails?.practiceAreas || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block mb-0.5">Experience:</span>
                  <span className="text-[#111317] font-semibold">{advocateDetails?.experienceYears ?? 0} Years Active Practice</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block mb-0.5">Professional Bio:</span>
                  <p className="text-slate-700 italic neo-inset p-3.5 rounded-xl leading-relaxed">{advocateDetails?.bio || 'No bio provided'}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Account Info Card */}
        <div className="neo-card p-6 md:p-8 space-y-4">
          <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-3">Account Information</h2>
          <div className="divide-y divide-slate-200">
            {[
              { label: 'Full Legal Name', value: profile?.name, icon: <User size={15} className="text-[#111317]" /> },
              { label: 'Registered Email', value: profile?.email, icon: <Mail size={15} className="text-[#111317]" /> },
              { label: 'Platform Role', value: profile?.role, icon: <Shield size={15} className="text-[#111317]" /> },
            ].map((row) => (
              <div key={row.label} className="py-3.5 flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  {row.icon}
                  {row.label}
                </div>
                <span className="text-sm font-bold text-[#111317] capitalize">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Change Password Card */}
        <div className="neo-card p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-3">
            <KeyRound size={16} className="text-[#111317]" />
            Security & Change Password
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordMsg && (
              <div
                className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  passwordMsg.type === 'success'
                    ? 'neo-inset-sm text-emerald-700'
                    : 'neo-inset-sm text-rose-600'
                }`}
              >
                {passwordMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 neo-inset rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 chars"
                  className="w-full px-3.5 py-2.5 neo-inset rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new"
                  className="w-full px-3.5 py-2.5 neo-inset rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={changePasswordMutation.isLoading}
              className="px-5 py-2.5 neo-btn-black font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {changePasswordMutation.isLoading ? <Loader2 size={13} className="animate-spin text-white" /> : <Lock size={13} className="text-white" />}
              Update Password
            </button>
          </form>
        </div>

        {/* Session Info */}
        <div className="neo-inset-sm rounded-2xl px-6 py-4 flex items-center justify-between text-xs text-slate-600 font-semibold">
          <span className="flex items-center gap-1.5"><Clock size={13} /> Session active · Encrypted JWT token</span>
          <span className="text-[#111317] font-bold">● Secure & Connected</span>
        </div>
      </div>
    </div>
  );
}

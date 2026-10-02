import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { trpc } from '../utils/trpc.js';
import { Scale, Lock, Mail, User, BookOpen, Clock, AlertTriangle, Loader2, UploadCloud } from 'lucide-react';

interface RegisterProps {
  onRegisterSuccess: (token: string, user: any) => void;
}

export default function Register({ onRegisterSuccess }: RegisterProps) {
  const [role, setRole] = useState<'citizen' | 'advocate'>('citizen');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Advocate specific states
  const [barNumber, setBarNumber] = useState('');
  const [practiceAreas, setPracticeAreas] = useState('');
  const [experience, setExperience] = useState('0');
  const [bio, setBio] = useState('');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const signupMutation = trpc.auth.signup.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      let certificateUrl: string | undefined;

      if (role === 'advocate' && certificateFile) {
        const formData = new FormData();
        formData.append('file', certificateFile);
        const uploadRes = await fetch('http://localhost:4000/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || 'Failed to upload Bar Council certificate proof');
        }

        const uploadJson = await uploadRes.json();
        certificateUrl = uploadJson.filePath;
      }

      const payload: any = {
        name,
        email,
        password,
        role,
      };

      if (role === 'advocate') {
        payload.advocateDetails = {
          barCouncilNumber: barNumber,
          practiceAreas,
          experienceYears: Number(experience) || 0,
          bio,
          certificateUrl,
        };
      }

      const response = await signupMutation.mutateAsync(payload);
      onRegisterSuccess(response.token, response.user);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please check details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative bg-[#edf0f5]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center space-y-3">
        <Link to="/" className="inline-flex items-center gap-2.5 text-2xl font-black text-[#0f172a] tracking-tight group">
          <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-[4px_4px_10px_rgba(0,0,0,0.18),-2px_-2px_6px_rgba(255,255,255,0.9)] group-hover:scale-105 transition-transform">
            <Scale size={22} />
          </div>
          <span>Themis</span>
        </Link>
        <h2 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">Create an account</h2>
        <p className="text-xs md:text-sm text-slate-500 font-semibold">
          Already have an account?{' '}
          <Link to="/login" className="font-extrabold text-black hover:underline transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl z-10">
        <div className="neo-card py-8 px-6 sm:px-10 shadow-xl space-y-6">
          {/* Role selection tab */}
          <div className="grid grid-cols-2 p-1.5 neo-inset-sm rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setRole('citizen')}
              className={`py-2.5 text-xs font-extrabold rounded-xl transition-all ${
                role === 'citizen'
                  ? 'neo-btn-black shadow-sm'
                  : 'text-slate-600 hover:text-black'
              }`}
            >
              I am a Citizen Client
            </button>
            <button
              type="button"
              onClick={() => setRole('advocate')}
              className={`py-2.5 text-xs font-extrabold rounded-xl transition-all ${
                role === 'advocate'
                  ? 'neo-btn-black shadow-sm'
                  : 'text-slate-600 hover:text-black'
              }`}
            >
              I am a Legal Advocate
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="p-3.5 rounded-xl neo-inset text-rose-600 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={16} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Adv. John Doe"
                    className="w-full pl-10 pr-3.5 py-3 neo-inset rounded-xl text-[#0f172a] placeholder-slate-400 focus:outline-none text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full pl-10 pr-3.5 py-3 neo-inset rounded-xl text-[#0f172a] placeholder-slate-400 focus:outline-none text-xs font-medium"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full pl-10 pr-3.5 py-3 neo-inset rounded-xl text-[#0f172a] placeholder-slate-400 focus:outline-none text-xs font-medium"
                />
              </div>
            </div>

            {/* Advocate specific details form */}
            {role === 'advocate' && (
              <div className="space-y-4 border-t border-black/5 pt-4 mt-4 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-black inline-block" />
                  <h3 className="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider">
                    Bar Council Practice Credentials
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Bar Council ID / Certificate Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Scale size={16} />
                      </div>
                      <input
                        type="text"
                        required={role === 'advocate'}
                        value={barNumber}
                        onChange={(e) => setBarNumber(e.target.value)}
                        placeholder="e.g. K/1245/2018"
                        className="w-full pl-10 pr-3.5 py-2.5 neo-inset rounded-xl text-[#0f172a] placeholder-slate-400 focus:outline-none text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Years of Experience
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Clock size={16} />
                      </div>
                      <input
                        type="number"
                        min="0"
                        required={role === 'advocate'}
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 neo-inset rounded-xl text-[#0f172a] placeholder-slate-400 focus:outline-none text-xs font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Practice Areas</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <BookOpen size={16} />
                    </div>
                    <input
                      type="text"
                      required={role === 'advocate'}
                      value={practiceAreas}
                      onChange={(e) => setPracticeAreas(e.target.value)}
                      placeholder="e.g. Criminal Law, Consumer Protection, Labor Court"
                      className="w-full pl-10 pr-3.5 py-2.5 neo-inset rounded-xl text-[#0f172a] placeholder-slate-400 focus:outline-none text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Professional Bio</label>
                  <textarea
                    required={role === 'advocate'}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={2}
                    placeholder="Describe your legal practice, credentials, and representation style..."
                    className="w-full p-3 neo-inset rounded-xl text-[#0f172a] placeholder-slate-400 focus:outline-none text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Bar Council Certificate / ID Proof <span className="text-black font-extrabold">(Required)</span>
                  </label>
                  <div className="p-4 border-2 border-dashed border-slate-300 hover:border-black rounded-2xl neo-inset text-center transition-colors">
                    <input
                      type="file"
                      id="certUpload"
                      accept=".pdf,image/png,image/jpeg"
                      onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label htmlFor="certUpload" className="cursor-pointer flex flex-col items-center gap-1.5">
                      <UploadCloud size={20} className="text-black" />
                      <span className="text-xs font-bold text-black hover:underline">
                        {certificateFile ? `✓ ${certificateFile.name}` : 'Click to select Certificate (PDF, PNG, JPEG max 5MB)'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">Official proof reviewed by court admin before public directory listing.</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || signupMutation.isPending}
                className="w-full flex justify-center py-3.5 px-4 neo-btn-black rounded-xl text-xs font-extrabold transition-all disabled:opacity-55"
              >
                {isSubmitting || signupMutation.isPending ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  'Complete Registration'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

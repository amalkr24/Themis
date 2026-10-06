import { useState, useEffect } from 'react';
import { trpc } from '../utils/trpc.js';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Users,
  Gavel,
  FolderOpen,
  AlertCircle,
  Plus,
  Check,
  X,
  UserCheck,
  ShieldAlert,
  Mail,
  ArrowRight,
  BarChart3,
  FileText,
  CheckCircle2,
  Search,
  Landmark,
  Layers,
  Eye,
  Download,
  Video,
  MessageSquare,
  Sparkles,
  HelpCircle,
  Clock,
  Trash2,
} from 'lucide-react';
import LegalDocumentPreview, { DocumentData } from '../components/LegalDocumentPreview.js';

interface DashboardProps {
  user: any;
  onUpdateStatus: (status: string) => void;
}

export default function Dashboard({ user, onUpdateStatus }: DashboardProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentAdminTab = searchParams.get('tab') || 'overview';

  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCaseDesc, setNewCaseDesc] = useState('');
  const [newCaseCat, setNewCaseCat] = useState('consumer');
  const [newCaseAdvocate, setNewCaseAdvocate] = useState('');
  const [newCaseClient, setNewCaseClient] = useState('');

  // Handle URL query parameters to auto-fill and launch New Case modal (e.g. from Assessment or Client Roster)
  useEffect(() => {
    const isNewCase = searchParams.get('newCase');
    if (isNewCase === 'true') {
      const cat = searchParams.get('cat');
      const title = searchParams.get('title');
      const desc = searchParams.get('desc');
      const client = searchParams.get('client');
      if (cat) setNewCaseCat(cat);
      if (title) setNewCaseTitle(title);
      if (desc) setNewCaseDesc(desc);
      if (client) setNewCaseClient(client);
      setShowNewCaseModal(true);
    }
  }, [searchParams]);

  // Admin filters
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'citizen' | 'advocate'>('all');
  const [advocateStatusFilter, setAdvocateStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [caseStatusFilter, setCaseStatusFilter] = useState<'all' | 'pending' | 'active' | 'closed'>('all');
  const [previewAdminDoc, setPreviewAdminDoc] = useState<DocumentData | null>(null);

  // Queries for Citizens & Advocates
  const { data: cases, refetch: refetchCases, isLoading: loadingCases } = trpc.cases.list.useQuery();
  const { data: advocates } = trpc.advocates.listApproved.useQuery();
  const { data: myAssessments, refetch: refetchAssessments } = trpc.assessments.listMyAssessments.useQuery(undefined, {
    enabled: user?.role === 'citizen',
  });

  // Connections Queries & Mutations
  const { data: incomingRequests, refetch: refetchIncoming } = trpc.connections.listIncoming.useQuery(undefined, {
    enabled: user?.role === 'advocate',
  });
  const { data: connectedClients, refetch: refetchConnectedClients } = trpc.connections.getConnectedClients.useQuery(undefined, {
    enabled: user?.role === 'advocate',
  });
  const { data: myAdvocate } = trpc.connections.getMyAdvocate.useQuery(undefined, {
    enabled: user?.role === 'citizen',
  });

  // Dedicated Admin Queries
  const { data: adminStats, refetch: refetchAdminStats } = trpc.admin.getStats.useQuery(undefined, {
    enabled: user?.role === 'admin',
  });
  const { data: pendingAdvocates, refetch: refetchPendingAdvocates } = trpc.admin.getPendingAdvocates.useQuery(undefined, {
    enabled: user?.role === 'admin',
  });
  const { data: allUsers } = trpc.admin.getUsersList.useQuery(undefined, {
    enabled: user?.role === 'admin' && (currentAdminTab === 'users' || currentAdminTab === 'overview'),
  });
  const { data: allAdvocates, refetch: refetchAllAdvocates } = trpc.admin.getAllAdvocates.useQuery(undefined, {
    enabled: user?.role === 'admin' && currentAdminTab === 'advocates',
  });
  const { data: allCases, refetch: refetchAllCases } = trpc.admin.getAllCases.useQuery(undefined, {
    enabled: user?.role === 'admin' && currentAdminTab === 'cases',
  });
  const { data: allDocs } = trpc.admin.getAllDocuments.useQuery(undefined, {
    enabled: user?.role === 'admin' && currentAdminTab === 'documents',
  });
  const { data: detailedReports } = trpc.admin.getDetailedReports.useQuery(undefined, {
    enabled: user?.role === 'admin' && currentAdminTab === 'reports',
  });

  const navigate = useNavigate();

  const respondRequestMutation = trpc.connections.respondToRequest.useMutation();
  const createCaseMutation = trpc.cases.create.useMutation();
  const deleteCaseMutation = trpc.cases.deleteCase.useMutation();
  const deleteAssessmentMutation = trpc.assessments.deleteAssessment.useMutation();
  const verifyAdvocateMutation = trpc.admin.verifyAdvocate.useMutation();
  const createConsultationMutation = trpc.consultations.createSession.useMutation();

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this legal claim assessment?')) return;
    try {
      await deleteAssessmentMutation.mutateAsync({ id: assessmentId });
      refetchAssessments();
    } catch (err: any) {
      alert(err.message || 'Error deleting assessment');
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    if (!window.confirm('Are you sure you want to delete this case file? All hearings and documents linked to it will also be removed.')) return;
    try {
      await deleteCaseMutation.mutateAsync({ caseId });
      refetchCases();
      if (user?.role === 'admin') {
        refetchAllCases();
        refetchAdminStats();
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting case');
    }
  };

  const handleStartConsultation = async (targetUserId: string, caseId?: string, connectionId?: string, title?: string) => {
    try {
      const session = await createConsultationMutation.mutateAsync({
        targetUserId,
        caseId,
        connectionId,
        title: title || 'Legal Case Consultation',
      });
      navigate(`/consultation/${session.id}`);
    } catch (err: any) {
      alert(err.message || 'Error launching video consultation room.');
    }
  };

  const handleRespondRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await respondRequestMutation.mutateAsync({ requestId, status });
      refetchIncoming();
      refetchConnectedClients();
      refetchCases();
    } catch (err: any) {
      alert(err.message || 'Error responding to request.');
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCaseMutation.mutateAsync({
        title: newCaseTitle,
        description: newCaseDesc,
        category: newCaseCat,
        advocateId: user?.role === 'citizen' ? (newCaseAdvocate || undefined) : undefined,
        citizenId: user?.role === 'advocate' ? (newCaseClient || undefined) : undefined,
      });
      setShowNewCaseModal(false);
      setNewCaseTitle('');
      setNewCaseDesc('');
      setNewCaseCat('consumer');
      setNewCaseAdvocate('');
      setNewCaseClient('');
      refetchCases();
    } catch (err: any) {
      let msg = err.message;
      try {
        const parsed = JSON.parse(err.message);
        if (Array.isArray(parsed)) {
          msg = parsed
            .map((e: any) => {
              const fieldName = e.path.join('.') === 'description' ? 'Detailed Case Facts' : e.path.join('.');
              return `${fieldName}: ${e.message}`;
            })
            .join('\n');
        }
      } catch (e) {
        // Fallback
      }
      alert(msg || 'Error creating case. Please try again.');
    }
  };

  const handleVerifyAdvocate = async (profileId: string, status: 'approved' | 'rejected') => {
    try {
      await verifyAdvocateMutation.mutateAsync({ profileId, status });
      refetchPendingAdvocates();
      refetchAdminStats();
      if (currentAdminTab === 'advocates') {
        refetchAllAdvocates();
      }
      if (user?.role === 'advocate' && user?.id === profileId) {
        onUpdateStatus(status);
      }
    } catch (err) {
      alert('Error verifying advocate.');
    }
  };

  const pendingRequests = incomingRequests?.filter((r) => r.status === 'pending');

  const setAdminTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Filtered Users List
  const filteredUsers = (allUsers || []).filter((u) => {
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
    if (!userSearchQuery) return true;
    const q = userSearchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  // Filtered Advocates List
  const filteredAdvocates = (allAdvocates || []).filter((a) => {
    if (advocateStatusFilter !== 'all' && a.status !== advocateStatusFilter) return false;
    return true;
  });

  // Filtered Cases List
  const filteredAdminCases = (allCases || []).filter((c) => {
    if (caseStatusFilter !== 'all' && c.status !== caseStatusFilter) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 relative">
      {/* Header Banner */}
      <div className="neo-card p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {user?.role === 'admin' ? 'Court Registry & Administration' : 'Legal Workspace'}
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-[#111317]">Hello, {user?.name}</h1>
          <p className="text-slate-600 text-xs mt-1">
            {user?.role === 'admin'
              ? 'Central Administrative Control • User Management, Advocate Verification, Case Registry & Reports'
              : `Access your legal workspace. Role: `}
            {user?.role !== 'admin' && (
              <span className="capitalize font-bold text-[#111317]">{user?.role}</span>
            )}
          </p>
        </div>

        {user?.role === 'citizen' && (
          <button
            onClick={() => setShowNewCaseModal(true)}
            className="neo-btn-black px-6 py-3 rounded-2xl text-xs font-bold flex items-center gap-2"
          >
            <Plus size={16} /> Register New Case
          </button>
        )}

        {user?.role === 'advocate' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Verification:</span>
            {user?.advocateStatus === 'approved' ? (
              <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#111317] text-white flex items-center gap-1.5 shadow-sm">
                <UserCheck size={14} /> Approved Advocate
              </span>
            ) : user?.advocateStatus === 'rejected' ? (
              <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold neo-card text-rose-600 flex items-center gap-1.5">
                <ShieldAlert size={14} /> Rejected
              </span>
            ) : (
              <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold neo-inset-sm text-slate-800 flex items-center gap-1.5 animate-pulse">
                <AlertCircle size={14} /> Pending Verification
              </span>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ────────────────────────── ADMIN PORTAL TABS ─────────────────────────── */}
      {/* ========================================================================= */}
      {user?.role === 'admin' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Admin Navigation Bar */}
          <div className="flex flex-wrap items-center gap-2 p-2 neo-inset rounded-2xl">
            {[
              { id: 'overview', label: 'Dashboard', icon: <Layers size={14} /> },
              { id: 'users', label: 'Users', icon: <Users size={14} /> },
              {
                id: 'advocates',
                label: 'Advocates',
                icon: <UserCheck size={14} />,
                badge: adminStats?.pendingAdvocatesCount ? `${adminStats.pendingAdvocatesCount}` : null,
              },
              { id: 'cases', label: 'Cases', icon: <FolderOpen size={14} /> },
              { id: 'documents', label: 'Documents', icon: <FileText size={14} /> },
              { id: 'reports', label: 'Reports', icon: <BarChart3 size={14} /> },
            ].map((tab) => {
              const active = currentAdminTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setAdminTab(tab.id)}
                  className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    active
                      ? 'neo-btn-black'
                      : 'text-slate-600 hover:text-[#111317]'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge && (
                    <span className="px-1.5 py-0.2 rounded-full bg-white text-[#111317] text-[10px] font-black">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ──────────────── 1. OVERVIEW TAB ──────────────── */}
          {currentAdminTab === 'overview' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                <div className="neo-card p-6 flex flex-col justify-between">
                  <div className="p-3 w-fit neo-inset-sm text-[#111317] rounded-xl mb-3">
                    <Users size={20} />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total Citizens</span>
                    <h3 className="text-3xl md:text-4xl font-black text-[#111317] mt-1">{adminStats?.citizensCount || 0}</h3>
                  </div>
                </div>

                <div className="neo-card p-6 flex flex-col justify-between">
                  <div className="p-3 w-fit neo-inset-sm text-[#111317] rounded-xl mb-3">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Approved Counsel</span>
                    <h3 className="text-3xl md:text-4xl font-black text-[#111317] mt-1">{adminStats?.approvedAdvocatesCount || 0}</h3>
                  </div>
                </div>

                <div className="neo-card p-6 flex flex-col justify-between">
                  <div className="p-3 w-fit neo-inset-sm text-[#111317] rounded-xl mb-3">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Pending Approvals</span>
                    <h3 className="text-3xl md:text-4xl font-black text-[#111317] mt-1">{adminStats?.pendingAdvocatesCount || 0}</h3>
                  </div>
                </div>

                <div className="neo-card p-6 flex flex-col justify-between">
                  <div className="p-3 w-fit neo-inset-sm text-[#111317] rounded-xl mb-3">
                    <FolderOpen size={20} />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total Cases</span>
                    <h3 className="text-3xl md:text-4xl font-black text-[#111317] mt-1">{adminStats?.casesCount || 0}</h3>
                  </div>
                </div>
              </div>

              {/* Pending Advocates Verification Queue */}
              <div className="neo-card p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-bold text-[#111317] flex items-center gap-2">
                    <Gavel className="text-[#111317]" size={18} /> Pending Advocate Verification Queue
                  </h2>
                  <button
                    onClick={() => setAdminTab('advocates')}
                    className="text-xs text-[#111317] hover:underline font-bold flex items-center gap-1"
                  >
                    View All Counsel <ArrowRight size={13} />
                  </button>
                </div>

                {pendingAdvocates && pendingAdvocates.length > 0 ? (
                  <div className="divide-y divide-slate-200">
                    {pendingAdvocates.map((profile) => (
                      <div
                        key={profile.id}
                        className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                      >
                        <div className="space-y-1">
                          <h4 className="font-bold text-[#111317] text-sm">{profile.user?.name}</h4>
                          <p className="text-xs text-slate-500 font-normal">Email: {profile.user?.email}</p>
                          <div className="flex flex-wrap gap-3 text-[10px] text-slate-600 font-medium pt-1">
                            <span>Bar ID: <strong className="text-[#111317]">{profile.barCouncilNumber}</strong></span>
                            <span>Exp: <strong className="text-[#111317]">{profile.experienceYears} Years</strong></span>
                            <span>Areas: <strong className="text-[#111317]">{profile.practiceAreas}</strong></span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerifyAdvocate(profile.id, 'approved')}
                            className="neo-btn-black px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                          >
                            <Check size={14} /> Approve
                          </button>
                          <button
                            onClick={() => handleVerifyAdvocate(profile.id, 'rejected')}
                            className="neo-btn px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5"
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="mx-auto text-slate-400 mb-2" size={32} />
                    <p className="text-slate-500 text-xs font-medium">All advocate applications have been reviewed and processed.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──────────────── 2. USERS MANAGEMENT TAB ──────────────── */}
          {currentAdminTab === 'users' && (
            <div className="neo-card p-6 space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#111317] flex items-center gap-2">
                    <Users className="text-[#111317]" size={20} /> Registered Platform Users ({filteredUsers.length})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Manage citizens, advocates, and administrative roles.</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full sm:w-48 pl-9 pr-3 py-1.5 neo-inset rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 p-1 neo-inset-sm rounded-xl">
                    {(['all', 'citizen', 'advocate'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setUserRoleFilter(r)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                          userRoleFilter === r ? 'neo-btn-black' : 'text-slate-600 hover:text-[#111317]'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto rounded-2xl neo-inset-sm p-1">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Verification / Status</th>
                      <th className="py-3 px-4">Joined Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#111317]">
                          <div>{u.name}</div>
                          <div className="text-[11px] text-slate-500 font-normal">{u.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                              u.role === 'admin'
                                ? 'bg-[#111317] text-white'
                                : u.role === 'advocate'
                                ? 'neo-inset-sm text-[#111317]'
                                : 'neo-card-sm text-slate-700'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {u.profile ? (
                            <span
                              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                u.profile.status === 'approved'
                                  ? 'bg-[#111317] text-white'
                                  : u.profile.status === 'rejected'
                                  ? 'text-rose-600 bg-rose-50'
                                  : 'neo-inset-sm text-slate-700 animate-pulse'
                              }`}
                            >
                              {u.profile.status}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Active</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ──────────────── 3. ADVOCATES MANAGEMENT TAB ──────────────── */}
          {currentAdminTab === 'advocates' && (
            <div className="neo-card p-6 space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#111317] flex items-center gap-2">
                    <UserCheck className="text-[#111317]" size={20} /> Advocate Verification & Directory ({filteredAdvocates.length})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Review credentials, practice areas, and bar council numbers.</p>
                </div>

                <div className="flex items-center gap-1 p-1 neo-inset-sm rounded-xl">
                  {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setAdvocateStatusFilter(s)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        advocateStatusFilter === s ? 'neo-btn-black' : 'text-slate-600 hover:text-[#111317]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advocates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredAdvocates.map((adv) => (
                  <div
                    key={adv.id}
                    className="p-6 neo-card flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-[#111317] text-base">
                            {adv.user?.name?.startsWith('Adv.') ? adv.user?.name : `Adv. ${adv.user?.name || 'Advocate'}`}
                          </h3>
                          <p className="text-xs text-slate-500">{adv.user?.email}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                            adv.status === 'approved'
                              ? 'bg-[#111317] text-white'
                              : adv.status === 'rejected'
                              ? 'text-rose-600 neo-card-sm'
                              : 'neo-inset-sm text-slate-800'
                          }`}
                        >
                          {adv.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-3 border-t border-slate-200 mt-3">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Bar Council ID</span>
                          <span className="text-[#111317] font-bold">{adv.barCouncilNumber}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Experience</span>
                          <span className="text-[#111317] font-bold">{adv.experienceYears} Years</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Practice Areas</span>
                          <span className="text-[#111317] font-semibold">{adv.practiceAreas}</span>
                        </div>
                      </div>

                      {adv.bio && <p className="text-xs italic text-slate-500 mt-2">"{adv.bio}"</p>}
                    </div>

                    {/* Action buttons */}
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                      <div className="text-[11px] text-slate-500">
                        {adv.status === 'approved' && (
                          <span className="text-slate-800 font-bold flex items-center gap-1">
                            <CheckCircle2 size={13} className="text-emerald-600" /> Verified & Listed
                          </span>
                        )}
                        {adv.status === 'pending' && (
                          <span className="text-slate-700 font-semibold">
                            Pending Admin Verification
                          </span>
                        )}
                        {adv.status === 'rejected' && (
                          <span className="text-rose-600 font-semibold">
                            Application Rejected
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {adv.certificateUrl && (
                          <a
                            href={adv.certificateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl text-xs font-bold neo-btn flex items-center gap-1"
                          >
                            <FileText size={13} /> Certificate
                          </a>
                        )}
                        {adv.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleVerifyAdvocate(adv.id, 'approved')}
                              className="neo-btn-black px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              onClick={() => handleVerifyAdvocate(adv.id, 'rejected')}
                              className="neo-btn px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 flex items-center gap-1"
                            >
                              <X size={13} /> Reject
                            </button>
                          </>
                        )}
                        {adv.status === 'rejected' && (
                          <button
                            onClick={() => handleVerifyAdvocate(adv.id, 'approved')}
                            className="neo-btn-black px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
                          >
                            <Check size={13} /> Re-Approve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ──────────────── 4. CASES MANAGEMENT TAB ──────────────── */}
          {currentAdminTab === 'cases' && (
            <div className="neo-card p-6 space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#111317] flex items-center gap-2">
                    <FolderOpen className="text-[#111317]" size={20} /> Court Case Registry ({filteredAdminCases.length})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Central register of all citizen cases, hearings, and assigned counsel.</p>
                </div>

                <div className="flex items-center gap-1 p-1 neo-inset-sm rounded-xl">
                  {(['all', 'active', 'pending', 'closed'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setCaseStatusFilter(s)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        caseStatusFilter === s ? 'neo-btn-black' : 'text-slate-600 hover:text-[#111317]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Case Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredAdminCases.map((c) => (
                  <Link
                    key={c.id}
                    to={`/cases/${c.id}`}
                    className="p-6 neo-card space-y-3 flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider neo-inset-sm text-slate-700">
                          {c.category}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                            c.status === 'active'
                              ? 'bg-[#111317] text-white'
                              : c.status === 'closed'
                              ? 'text-slate-400 neo-card-sm'
                              : 'neo-inset-sm text-slate-800'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>

                      <h3 className="font-bold text-[#111317] group-hover:underline transition-colors text-base line-clamp-1">
                        {c.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{c.description}</p>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-3 border-t border-slate-200 mt-3">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Citizen</span>
                          <span className="text-[#111317] font-semibold">{c.citizen?.name}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Counsel</span>
                          <span className="text-[#111317] font-semibold">
                            {c.advocate ? `Adv. ${c.advocate.name}` : 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                      <span>{c.hearings?.length || 0} Hearings · {c.documents?.length || 0} Documents</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteCase(c.id);
                          }}
                          className="p-2 rounded-xl neo-btn text-slate-600 hover:text-rose-600 cursor-pointer"
                          title="Delete Case"
                        >
                          <Trash2 size={13} />
                        </button>
                        <span className="text-[#111317] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Manage Case <ArrowRight size={13} />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ──────────────── 5. DOCUMENTS MANAGEMENT TAB ──────────────── */}
          {currentAdminTab === 'documents' && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 animate-fadeIn">
              {previewAdminDoc ? (
                <LegalDocumentPreview
                  document={previewAdminDoc}
                  onBack={() => setPreviewAdminDoc(null)}
                />
              ) : (
                <>
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <FileText className="text-indigo-400" size={20} /> System Documents Registry ({allDocs?.length || 0})
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Centralized register of all RTI applications, Consumer complaints, and legal proformas.</p>
                  </div>

                  <div className="space-y-3">
                    {allDocs?.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                            <FileText size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm">{doc.template?.title}</h4>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span>User: <strong className="text-slate-200">{doc.user?.name}</strong> ({doc.user?.role})</span>
                              <span>·</span>
                              <span>{new Date(doc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() =>
                              setPreviewAdminDoc({
                                title: doc.template?.title || 'Legal Document',
                                category: doc.template?.category || 'general',
                                filledData: doc.filledData as any,
                                date: doc.createdAt as any,
                              })
                            }
                            className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                          >
                            <Eye size={13} /> View Proforma
                          </button>
                          <a
                            href={doc.filePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition-all flex items-center gap-1.5"
                          >
                            <Download size={13} /> Text File
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ──────────────── 6. REPORTS & ANALYTICS TAB ──────────────── */}
          {currentAdminTab === 'reports' && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-8 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 className="text-indigo-400" size={20} /> Platform Intelligence & Analytics
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Real-time breakdown of case distribution, legal domains, and resolution metrics.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cases by Legal Category */}
                <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Landmark size={14} className="text-indigo-400" /> Cases by Domain / Category
                  </h3>
                  <div className="space-y-3">
                    {detailedReports?.casesByCategory?.map((item) => {
                      const total = adminStats?.casesCount || 1;
                      const pct = Math.round((item.count / total) * 100);
                      return (
                        <div key={item.category} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-300 capitalize">{item.category} Law</span>
                            <span className="text-indigo-400">{item.count} cases ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Case Resolution Status */}
                <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <FolderOpen size={14} className="text-emerald-400" /> Case Status Breakdown
                  </h3>
                  <div className="space-y-3">
                    {detailedReports?.casesByStatus?.map((item) => {
                      const total = adminStats?.casesCount || 1;
                      const pct = Math.round((item.count / total) * 100);
                      const color =
                        item.status === 'active'
                          ? 'bg-emerald-500'
                          : item.status === 'closed'
                          ? 'bg-slate-500'
                          : 'bg-amber-500';
                      return (
                        <div key={item.status} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-300 capitalize">{item.status}</span>
                            <span className="text-slate-200">{item.count} ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                            <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ──────────────────────── CITIZEN & ADVOCATE WORKSPACE ──────────────────── */}
      {/* ========================================================================= */}
      {user?.role !== 'admin' && (
        <>
          {/* --- CITIZEN: MY CONNECTED ADVOCATE SECTION --- */}
          {user?.role === 'citizen' && myAdvocate && (
            <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-indigo-950/40 border border-emerald-500/30 rounded-3xl p-6 shadow-xl animate-fadeIn space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <UserCheck size={16} /> My Assigned Advocate Representation
                </div>
                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg flex items-center gap-1">
                  <Check size={12} /> Active Connection
                </span>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-t border-slate-800/80 pt-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl font-extrabold">
                    {myAdvocate.advocate?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      Adv. {myAdvocate.advocate?.name}
                    </h3>
                    <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <Mail size={12} className="text-emerald-400" /> {myAdvocate.advocate?.email}
                    </p>
                    {myAdvocate.advocateProfile && (
                      <div className="flex flex-wrap gap-3 text-[11px] text-slate-400 mt-2 font-medium">
                        <span>Bar ID: <strong className="text-slate-200">{myAdvocate.advocateProfile.barCouncilNumber}</strong></span>
                        <span>Exp: <strong className="text-slate-200">{myAdvocate.advocateProfile.experienceYears} Years</strong></span>
                        <span>Practice: <strong className="text-emerald-300">{myAdvocate.advocateProfile.practiceAreas}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                  {myAdvocate.case && (
                    <div className="bg-slate-950/60 p-4 border border-slate-800 rounded-2xl text-xs space-y-1 min-w-[200px]">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Assigned Case File</span>
                      <p className="font-bold text-white line-clamp-1">{myAdvocate.case.title}</p>
                      <Link to={`/cases/${myAdvocate.case.id}`} className="inline-flex items-center gap-1 text-emerald-400 hover:underline text-[11px] pt-1">
                        View Case Details <ArrowRight size={12} />
                      </Link>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/messages?user=${myAdvocate.advocateId}`}
                      className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 cursor-pointer"
                    >
                      <MessageSquare size={16} /> Direct Message
                    </Link>

                    <button
                      onClick={() =>
                        handleStartConsultation(
                          myAdvocate.advocateId,
                          myAdvocate.caseId || undefined,
                          myAdvocate.id,
                          `Legal Consultation with Adv. ${myAdvocate.advocate?.name}`
                        )
                      }
                      disabled={createConsultationMutation.isPending}
                      className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl text-xs transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer"
                    >
                      <Video size={16} /> Video Call
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- CITIZEN: SAVED LEGAL ASSESSMENTS SECTION --- */}
          {user?.role === 'citizen' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-[#111317] flex items-center gap-2">
                  <Sparkles className="text-[#111317]" size={18} /> My Legal Claim Assessments ({myAssessments?.length || 0})
                </h2>
                <Link
                  to="/assessment"
                  className="neo-btn-black px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Plus size={14} /> New Assessment
                </Link>
              </div>

              {myAssessments && myAssessments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {myAssessments.map((item) => (
                    <div
                      key={item.id}
                      className="p-6 neo-card space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="neo-inset-sm px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            {item.category} Claim
                          </span>
                          <span className="bg-[#111317] text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
                            {item.status} Standing (Score: {item.score})
                          </span>
                        </div>

                        <h3 className="font-bold text-[#111317] text-base">{item.title}</h3>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.summary}</p>
                        
                        {item.actionRecommendation && (
                          <div className="p-3.5 neo-inset rounded-xl text-[11px] text-slate-800 leading-relaxed">
                            <strong className="text-[#111317]">Recommended:</strong> {item.actionRecommendation}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                          <Clock size={11} /> {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setNewCaseCat(item.category);
                              setNewCaseTitle(item.title);
                              setNewCaseDesc(`${item.summary}\n\nRecommended Action:\n${item.actionRecommendation || ''}`);
                              setShowNewCaseModal(true);
                            }}
                            className="neo-btn-black px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                          >
                            <FolderOpen size={13} /> File Case
                          </button>
                          <Link
                            to="/assessment"
                            className="neo-btn px-4 py-2 rounded-xl text-xs font-bold text-slate-800 transition-all"
                          >
                            Retake
                          </Link>
                          <button
                            onClick={() => handleDeleteAssessment(item.id)}
                            className="p-2 neo-btn rounded-xl text-slate-500 hover:text-rose-600 transition-all flex items-center justify-center cursor-pointer"
                            title="Delete Assessment"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 neo-card text-center space-y-3">
                  <HelpCircle className="mx-auto text-slate-400" size={32} />
                  <p className="text-xs text-slate-600 max-w-md mx-auto font-medium">
                    Evaluate your legal standing for disputes like Consumer complaints, Tenancy issues, Property or Family disputes.
                  </p>
                  <Link
                    to="/assessment"
                    className="inline-flex items-center gap-2 neo-btn-black px-5 py-2.5 rounded-xl text-xs font-bold"
                  >
                    <Sparkles size={14} /> Start Guided Assessment
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* --- ADVOCATE: INCOMING REQUESTS & CONNECTED CLIENTS --- */}
          {user?.role === 'advocate' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Pending Connection Requests */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Users className="text-emerald-400" /> Citizen Connection Requests
                </h2>

                {pendingRequests && pendingRequests.length > 0 ? (
                  <div className="divide-y divide-slate-800">
                    {pendingRequests.map((req) => (
                      <div key={req.id} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h4 className="font-bold text-white text-base">{req.citizen?.name}</h4>
                          <p className="text-xs text-slate-400">Email: {req.citizen?.email}</p>
                          {req.case && (
                            <p className="text-xs text-indigo-400 mt-1 font-medium">
                              Linked Case: {req.case.title} ({req.case.category})
                            </p>
                          )}
                          {req.message && (
                            <p className="text-xs text-slate-300 mt-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                              "{req.message}"
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRespondRequest(req.id, 'accepted')}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                          >
                            Accept Client
                          </button>
                          <button
                            onClick={() => handleRespondRequest(req.id, 'rejected')}
                            className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/20 text-rose-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-4">No pending representation requests from citizens.</p>
                )}
              </div>

              {/* Connected Clients Roster */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <UserCheck className="text-indigo-400" /> My Connected Clients ({connectedClients?.length || 0})
                  </h2>
                  {connectedClients && connectedClients.length > 0 && (
                    <button
                      onClick={() => {
                        setNewCaseClient(connectedClients[0].citizenId);
                        setShowNewCaseModal(true);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1 shadow-md"
                    >
                      <Plus size={14} /> File Case for Client
                    </button>
                  )}
                </div>

                {connectedClients && connectedClients.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {connectedClients.map((client) => (
                      <div key={client.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-white text-sm">{client.citizen?.name}</h4>
                              <p className="text-xs text-slate-400">{client.citizen?.email}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Active Client
                            </span>
                          </div>

                          {client.case ? (
                            <div className="pt-2 border-t border-slate-800/80 mt-2 flex justify-between items-center text-xs">
                              <span className="text-slate-400 truncate max-w-[180px]">{client.case.title}</span>
                              <Link to={`/cases/${client.case.id}`} className="text-indigo-400 hover:underline font-semibold text-[11px]">
                                Case File →
                              </Link>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-500 pt-1">Direct representation</p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-800/60 grid grid-cols-3 gap-2">
                          <Link
                            to={`/messages?user=${client.citizenId}`}
                            className="py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-300 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1"
                          >
                            <MessageSquare size={13} /> Chat
                          </Link>

                          <button
                            onClick={() =>
                              handleStartConsultation(
                                client.citizenId,
                                client.caseId || undefined,
                                client.id,
                                `Counsel Consultation for ${client.citizen?.name}`
                              )
                            }
                            disabled={createConsultationMutation.isPending}
                            className="py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Video size={13} /> Call
                          </button>

                          <button
                            onClick={() => {
                              setNewCaseClient(client.citizenId);
                              setShowNewCaseModal(true);
                            }}
                            className="py-2 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1"
                          >
                            <Plus size={13} /> Case
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-4">You have not accepted any client requests yet.</p>
                )}
              </div>
            </div>
          )}

          {/* --- CASE TRACKER --- */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderOpen className="text-indigo-400" /> Active Case Files
              </h2>
            </div>

            {loadingCases ? (
              <div className="text-center py-16">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
              </div>
            ) : cases && cases.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cases.map((c) => (
                  <div
                    key={c.id}
                    className="glow-card p-6 rounded-3xl flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-950 text-indigo-400 border border-indigo-500/20">
                          {c.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            c.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                              : c.status === 'closed'
                              ? 'bg-slate-800 text-slate-500'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>

                      <Link to={`/cases/${c.id}`}>
                        <h3 className="font-bold text-white hover:text-indigo-400 transition-colors text-lg mb-2">
                          {c.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-2">{c.description}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-slate-500">
                      <div>
                        {user?.role === 'citizen' && (
                          <span>Advocate: <strong className="text-slate-300">{c.advocate?.name || 'Pending assignment'}</strong></span>
                        )}
                        {user?.role === 'advocate' && (
                          <span>Client: <strong className="text-slate-300">{c.citizen?.name}</strong></span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {(user?.role === 'citizen' ? c.advocateId : c.citizenId) && (
                          <Link
                            to={`/messages?user=${user?.role === 'citizen' ? c.advocateId : c.citizenId}`}
                            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-slate-800 transition-colors"
                            title="Message"
                          >
                            <MessageSquare size={14} />
                          </Link>
                        )}
                        {(user?.role === 'admin' || (user?.role === 'citizen' && user?.id === c.citizenId)) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCase(c.id)}
                            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-500/40 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete Case File"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <Link
                          to={`/cases/${c.id}`}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white font-semibold flex items-center gap-1 transition-all"
                        >
                          Dossier <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-900/20 border border-slate-800/60 rounded-3xl">
                <FolderOpen className="mx-auto text-slate-600 mb-3" size={36} />
                <h3 className="text-sm font-bold text-white mb-1">No case files recorded</h3>
                <p className="text-slate-500 text-xs max-w-sm mx-auto mb-4">
                  {user?.role === 'citizen'
                    ? 'You have not registered any legal cases yet. Use the button above to begin.'
                    : 'No active cases assigned to your roster.'}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* --- NEW CASE MODAL (FOR CITIZENS & ADVOCATES) --- */}
      {showNewCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setShowNewCaseModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-white mb-1">
              {user?.role === 'advocate' ? 'File Case for Connected Client' : 'Register New Case'}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              {user?.role === 'advocate'
                ? 'Create a formal case dossier on behalf of your client.'
                : 'File a new dispute record to coordinate with advocates.'}
            </p>

            <form onSubmit={handleCreateCase} className="space-y-4">
              {user?.role === 'advocate' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Select Client *
                  </label>
                  <select
                    required
                    value={newCaseClient}
                    onChange={(e) => setNewCaseClient(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Choose Connected Client --</option>
                    {connectedClients?.map((c) => (
                      <option key={c.id} value={c.citizenId}>
                        {c.citizen?.name} ({c.citizen?.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Case Title</label>
                <input
                  required
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  placeholder="e.g. Unfair Deduction from Security Deposit"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Legal Domain</label>
                <select
                  value={newCaseCat}
                  onChange={(e) => setNewCaseCat(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="consumer">Consumer Dispute</option>
                  <option value="rent">Tenancy & Rent</option>
                  <option value="labor">Labor & Employment</option>
                  <option value="family">Family & Matrimonial</option>
                  <option value="civil">Property & Civil</option>
                  <option value="cyber">Cyber Crime</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Detailed Case Facts</label>
                <textarea
                  required
                  rows={4}
                  value={newCaseDesc}
                  onChange={(e) => setNewCaseDesc(e.target.value)}
                  placeholder="Describe the incident, involved parties, dates, and what outcome you are seeking..."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {user?.role === 'citizen' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Assign Advocate (Optional)
                  </label>
                  <select
                    value={newCaseAdvocate}
                    onChange={(e) => setNewCaseAdvocate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Let Court / Direct Search Match --</option>
                    {advocates?.map((a) => (
                      <option key={a.id} value={a.userId || a.id}>
                        Adv. {a.user?.name || a.barCouncilNumber} ({a.user?.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewCaseModal(false)}
                  className="px-5 py-2.5 text-xs text-slate-400 hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCaseMutation.isPending}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg"
                >
                  {createCaseMutation.isPending ? 'Filing...' : 'Submit Case File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

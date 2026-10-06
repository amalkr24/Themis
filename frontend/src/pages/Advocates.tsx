import { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { useAuth } from '../hooks/useAuth.js';
import { UserCheck, Scale, Briefcase, Clock, Search, ArrowRight, Loader2, Send, CheckCircle2, AlertCircle, X, Award, Sparkles, Filter, Landmark, BookOpen, ShieldCheck, MapPin, Info, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

const FIELD_EXPLANATIONS: Record<string, { title: string; description: string; matters: string[]; courts: string }> = {
  'Constitutional': {
    title: 'Constitutional & Public Law',
    description: 'Enforcement of fundamental citizen rights against state agencies, arbitrary administrative actions, and service disputes.',
    matters: ['Article 226 Writ Petitions (Mandamus, Certiorari, Habeas Corpus)', 'Public Interest Litigation (PIL)', 'Service Regularization & Pension Disputes'],
    courts: 'High Court of Kerala (Ernakulam), Supreme Court of India'
  },
  'Criminal': {
    title: 'Criminal Defense & Trial Jurisprudence',
    description: 'Representation in police investigations, trial proceedings, bail pleas, and statutory defense under BNSS and IPC/BNS.',
    matters: ['Anticipatory Bail & Regular Bail Applications', 'Quashing of False FIRs (Sec 482 / 528 BNSS)', 'Sessions Court Trial Defense & Appellate Cross-examinations'],
    courts: 'Judicial First Class Magistrate (JFCM), Sessions Courts, High Court'
  },
  'Civil & Property': {
    title: 'Civil Jurisprudence, Land & Property Disputes',
    description: 'Litigation regarding land boundaries, property title deeds, ancestral partition, tenant eviction, and money recovery.',
    matters: ['Suits for Permanent Injunction & Title Declaration', 'Ancestral Land Partition & Inheritance Suits', 'Eviction Defense & Specific Performance of Contract'],
    courts: 'Munsiff Courts, Subordinate Courts, District Courts across Kerala'
  },
  'Family Law': {
    title: 'Family, Matrimonial & Domestic Welfare Law',
    description: 'Comprehensive resolution of matrimonial discords, alimony, custody of minors, and protection against domestic violence.',
    matters: ['Mutual Consent & Contested Divorce Petitions', 'Maintenance Claims under Section 125', 'Child Custody, Visitation Rights & Domestic Violence Protection Orders'],
    courts: 'Family Courts across Kerala'
  },
  'Consumer Law': {
    title: 'Consumer Protection & Fair Trade Enforcement',
    description: 'Redressal against defective goods, hospital/travel/banking deficiency in service, and unfair commercial trade practices.',
    matters: ['Consumer Compensation & Refund Complaints', 'Medical & Professional Deficiency in Service', 'Builder & Developer Delay Claims (RERA & Consumer Forum)'],
    courts: 'District Consumer Disputes Redressal Commissions (DCDRC), State Commission'
  },
  'Human Rights': {
    title: 'Human Rights, Labor & Women\'s Legal Aid',
    description: 'Protection of civil liberties, labor rights, gender protection statutes (POCSO/POSH), and legal aid for underprivileged citizens.',
    matters: ['State Human Rights Commission (KSHRC) Petitions', 'Labor Commissioner Disputes & Gratuity Claims', 'Free Legal Aid Representation under KELSA'],
    courts: 'Human Rights Commission, Labor Tribunals, High Court of Kerala'
  },
  'Cyber Law': {
    title: 'Cybercrime, Digital Evidence & IT Law',
    description: 'Legal recourse against digital financial fraud, unauthorized data access, cyber defamation, and Information Technology Act offences.',
    matters: ['Online Banking & UPI Financial Fraud Recovery', 'Social Media Harassment & Cyber Blackmail Defense', 'Corporate IT Contracts & Digital Evidence Admissibility'],
    courts: 'Cyber Crime Police Cells, Magistrate Courts, High Court'
  },
};

export default function Advocates() {
  const auth = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Profile Modal State
  const [viewingAdvocate, setViewingAdvocate] = useState<any | null>(null);

  // Connection Request Modal State
  const [selectedAdvocate, setSelectedAdvocate] = useState<{ id: string; name: string } | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [requestMessage, setRequestMessage] = useState<string>('');

  // Queries & Mutations
  const { data: advocates, isLoading, refetch: refetchAdvocates } = trpc.advocates.listApproved.useQuery();
  const seedAdvocatesMutation = trpc.advocates.seedSampleAdvocates.useMutation();

  const { data: myCases } = trpc.cases.list.useQuery(undefined, {
    enabled: auth.isAuthenticated && auth.user?.role === 'citizen',
  });
  const { data: myRequests, refetch: refetchRequests } = trpc.connections.listMyRequests.useQuery(undefined, {
    enabled: auth.isAuthenticated && auth.user?.role === 'citizen',
  });

  const sendRequestMutation = trpc.connections.sendRequest.useMutation();

  const handleSeedFamousAdvocates = async () => {
    try {
      await seedAdvocatesMutation.mutateAsync();
      refetchAdvocates();
    } catch (err: any) {
      alert(err.message || 'Error loading Kerala advocates.');
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdvocate) return;
    try {
      await sendRequestMutation.mutateAsync({
        advocateId: selectedAdvocate.id,
        caseId: selectedCaseId || undefined,
        message: requestMessage || undefined,
      });
      alert(`Connection request sent successfully to ${selectedAdvocate.name}!`);
      setSelectedAdvocate(null);
      setSelectedCaseId('');
      setRequestMessage('');
      refetchRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to send connection request.');
    }
  };

  const getRequestForAdvocate = (advocateUserId: string) => {
    return myRequests?.find((r) => r.advocateId === advocateUserId);
  };

  const CATEGORIES = ['All', 'Constitutional', 'Criminal', 'Civil & Property', 'Family Law', 'Consumer Law', 'Human Rights', 'Cyber Law'];

  const filtered = advocates?.filter((a) => {
    const q = searchQuery.toLowerCase().trim();
    const name = (a.user?.name || '').toLowerCase();
    const email = (a.user?.email || '').toLowerCase();
    const practiceAreas = (a.practiceAreas || '').toLowerCase();
    const bio = (a.bio || '').toLowerCase();
    const barId = (a.barCouncilNumber || '').toLowerCase();

    const matchesSearch =
      !q ||
      name.includes(q) ||
      email.includes(q) ||
      practiceAreas.includes(q) ||
      bio.includes(q) ||
      barId.includes(q);

    const matchesCategory =
      selectedCategory === 'All' ||
      practiceAreas.includes(selectedCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  // Helper to extract matching category explanations for an advocate
  const getAdvocateFieldExplanations = (practiceAreas?: string | null) => {
    if (!practiceAreas) return [];
    const matched: { key: string; details: typeof FIELD_EXPLANATIONS[string] }[] = [];
    const lowerAreas = practiceAreas.toLowerCase();
    Object.keys(FIELD_EXPLANATIONS).forEach((catKey) => {
      const lowerKey = catKey.toLowerCase();
      if (
        lowerAreas.includes(lowerKey) || 
        (lowerKey.includes('criminal') && lowerAreas.includes('criminal')) ||
        (lowerKey.includes('civil') && lowerAreas.includes('civil')) ||
        (lowerKey.includes('family') && lowerAreas.includes('family')) ||
        (lowerKey.includes('consumer') && lowerAreas.includes('consumer')) ||
        (lowerKey.includes('cyber') && lowerAreas.includes('cyber')) ||
        (lowerKey.includes('human') && (lowerAreas.includes('human') || lowerAreas.includes('labor') || lowerAreas.includes('women'))) ||
        (lowerKey.includes('constitutional') && lowerAreas.includes('constitutional'))
      ) {
        matched.push({ key: catKey, details: FIELD_EXPLANATIONS[catKey] });
      }
    });
    return matched;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 relative">
      <div className="absolute top-10 right-10 w-[350px] h-[350px] bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="text-center space-y-4 mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full neo-inset-sm text-slate-800 text-xs font-bold">
          <Award size={14} className="text-[#111317]" /> Bar Council Verified • Advocate Directory
        </div>
        <h1 className="text-4xl font-black text-[#111317]">Find & Consult Advocates</h1>
        <p className="text-slate-600 text-sm max-w-xl mx-auto font-medium">
          Explore certified advocates practicing before High Courts, District Courts, and Specialized Tribunals. Click any advocate to inspect full career credentials, court jurisdictions, and domain specializations.
        </p>
      </div>

      {/* Search Bar & Category Filter Bar */}
      <div className="max-w-3xl mx-auto mb-10 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by advocate name, legal domain (e.g. Constitutional, Corporate, PIL)..."
            className="w-full pl-11 pr-4 py-3.5 neo-inset rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none text-sm"
          />
        </div>

        {/* Practice Area Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none justify-center">
          <span className="text-xs text-slate-500 font-bold flex items-center gap-1 mr-1">
            <Filter size={12} /> Filter:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? 'neo-btn-black'
                  : 'neo-pill text-slate-600 hover:text-[#111317]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Advocate Cards Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-[#111317]" size={36} />
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((advocate) => {
            const existingReq = advocate.user ? getRequestForAdvocate(advocate.user.id) : null;
            return (
              <div
                key={advocate.id}
                className="neo-card p-6 flex flex-col justify-between group cursor-pointer"
                onClick={() => setViewingAdvocate(advocate)}
              >
                <div>
                  {/* Header / Avatar */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl neo-inset-sm flex items-center justify-center text-[#111317] font-black text-xl flex-shrink-0">
                      {advocate.user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-bold text-[#111317] group-hover:underline transition-colors truncate">
                          {advocate.user?.name}
                        </h3>
                        <UserCheck size={14} className="text-[#111317] flex-shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{advocate.user?.email}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="px-2.5 py-0.5 rounded-lg neo-inset-sm text-slate-700 text-[9px] font-bold uppercase tracking-wider">
                          Bar ID: {advocate.barCouncilNumber}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-lg neo-btn-black text-[9px] font-bold">
                          Verified
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Practice Details */}
                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <Briefcase size={14} className="text-[#111317] flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2 font-semibold">{advocate.practiceAreas}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Clock size={14} className="text-[#111317] flex-shrink-0" />
                      <span><strong>{advocate.experienceYears} Years</strong> Active Legal Practice</span>
                    </div>
                    {advocate.bio && (
                      <p className="text-xs text-slate-500 italic leading-relaxed border-t border-slate-200 pt-3 line-clamp-2">
                        "{advocate.bio}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setViewingAdvocate(advocate)}
                    className="w-full py-2.5 neo-btn text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <BookOpen size={13} /> View Full Profile & Field Details
                  </button>

                  {auth.isAuthenticated && (
                    <Link
                      to={`/messages?user=${advocate.user?.id || advocate.userId}`}
                      className="w-full py-2.5 neo-btn text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:text-black"
                    >
                      <MessageSquare size={13} /> Message Advocate
                    </Link>
                  )}

                  {existingReq ? (
                    <div className="w-full py-2 px-3 neo-inset-sm rounded-xl flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-bold">Case Link:</span>
                      {existingReq.status === 'accepted' ? (
                        <span className="px-2.5 py-0.5 rounded-lg neo-btn-black font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 size={12} className="text-white" /> Connected
                        </span>
                      ) : existingReq.status === 'pending' ? (
                        <span className="px-2.5 py-0.5 rounded-lg neo-card-sm text-slate-800 font-bold flex items-center gap-1 text-[11px]">
                          <Clock size={12} /> Pending Approval
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-lg text-rose-600 font-bold flex items-center gap-1 text-[11px]">
                          <AlertCircle size={12} /> Declined
                        </span>
                      )}
                    </div>
                  ) : auth.user?.role === 'citizen' ? (
                    <button
                      onClick={() => setSelectedAdvocate({ id: advocate.user?.id || advocate.userId, name: advocate.user?.name || 'Advocate' })}
                      className="w-full flex items-center justify-center gap-2 py-3 neo-btn-black rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <Send size={14} /> Request Case Connection
                    </button>
                  ) : !auth.isAuthenticated ? (
                    <Link
                      to="/login"
                      className="w-full flex items-center justify-center gap-2 py-3 neo-btn-black rounded-xl text-xs font-bold"
                    >
                      <Send size={14} /> Sign In to Request Connection
                    </Link>
                  ) : (
                    <Link
                      to="/dashboard"
                      className="w-full flex items-center justify-center gap-2 py-2.5 neo-btn text-slate-800 font-bold rounded-xl text-xs"
                    >
                      Workspace Details <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900/20 border border-slate-800/60 rounded-3xl space-y-4">
          <Scale className="mx-auto text-slate-600" size={44} />
          <p className="text-slate-400 text-sm">
            {searchQuery || selectedCategory !== 'All'
              ? 'No advocates found matching your filter criteria.'
              : 'No verified advocates registered yet.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={handleSeedFamousAdvocates}
              disabled={seedAdvocatesMutation.isLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
            >
              <Sparkles size={14} /> Load Renowned Advocates Directory
            </button>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
            >
              Register as Advocate <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* --- ADVOCATE FULL PROFILE & SPECIALIZATION BREAKDOWN MODAL --- */}
      {viewingAdvocate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="neo-card max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setViewingAdvocate(null)}
              className="absolute right-5 top-5 p-2 neo-btn rounded-xl text-slate-700 hover:text-black transition-colors"
            >
              <X size={18} />
            </button>

            {/* Advocate Header */}
            <div className="flex items-start gap-4 pb-6 border-b border-slate-200">
              <div className="w-16 h-16 rounded-2xl neo-inset-sm flex items-center justify-center text-[#111317] font-extrabold text-2xl flex-shrink-0">
                {viewingAdvocate.user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 pr-6">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#111317]">
                    {viewingAdvocate.user?.name}
                  </h2>
                  <ShieldCheck size={18} className="text-[#111317]" />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{viewingAdvocate.user?.email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="px-2.5 py-0.5 rounded-lg neo-inset-sm text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                    Bar ID: {viewingAdvocate.barCouncilNumber}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg neo-btn-black text-[10px] font-bold flex items-center gap-1">
                    <Landmark size={11} className="text-white" /> Bar Council Verified
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg neo-card-sm text-slate-800 text-[10px] font-bold flex items-center gap-1">
                    <Clock size={11} /> {viewingAdvocate.experienceYears} Years Practice
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Practice Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 neo-inset rounded-xl space-y-1">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <MapPin size={12} className="text-[#111317]" /> Primary Court Forum
                </span>
                <p className="font-bold text-[#111317]">High Court (Ernakulam) &amp; District Courts</p>
              </div>
              <div className="p-3 neo-inset rounded-xl space-y-1">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <BookOpen size={12} className="text-[#111317]" /> Working Languages
                </span>
                <p className="font-bold text-[#111317]">Malayalam, English, Hindi</p>
              </div>
            </div>

            {/* Professional Biography */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Info size={14} className="text-[#111317]" /> Professional Background & Career Overview
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed neo-inset p-4 rounded-2xl font-normal">
                {viewingAdvocate.bio}
              </p>
            </div>

            {/* Specialization & Field Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Briefcase size={14} className="text-[#111317]" /> Domain Specializations & Category Guide
                </h3>
                <span className="text-[10px] text-slate-500">What these fields cover</span>
              </div>

              <div className="space-y-3">
                {getAdvocateFieldExplanations(viewingAdvocate.practiceAreas).map(({ key, details }) => (
                  <div key={key} className="p-4 neo-card-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#111317] flex items-center gap-1.5">
                        <Scale size={13} /> {details.title}
                      </h4>
                      <span className="text-[9px] px-2 py-0.5 rounded-lg neo-inset-sm text-slate-700 font-mono font-bold">
                        {details.courts}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {details.description}
                    </p>
                    <div className="pt-1.5 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Common Legal Matters Handled:
                      </span>
                      <ul className="grid grid-cols-1 gap-1 text-[11px] text-slate-600">
                        {details.matters.map((m, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-black font-bold">•</span>
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => setViewingAdvocate(null)}
                className="w-full sm:w-auto px-5 py-2.5 neo-btn text-slate-700 hover:text-black rounded-xl text-xs font-bold transition-all"
              >
                Close Profile
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {auth.isAuthenticated && (
                  <Link
                    to={`/messages?user=${viewingAdvocate.user?.id || viewingAdvocate.userId}`}
                    className="w-full sm:w-auto px-5 py-2.5 neo-btn text-slate-800 hover:text-black font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare size={14} /> Message Advocate
                  </Link>
                )}

                {auth.user?.role === 'citizen' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAdvocate({ id: viewingAdvocate.user?.id || viewingAdvocate.userId, name: viewingAdvocate.user?.name || 'Advocate' });
                      setViewingAdvocate(null);
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 neo-btn-black font-bold rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send size={14} className="text-white" /> Request Case Representation
                  </button>
                ) : !auth.isAuthenticated ? (
                  <Link
                    to="/login"
                    className="w-full sm:w-auto px-6 py-2.5 neo-btn-black font-bold rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-1.5"
                  >
                    <Send size={14} className="text-white" /> Sign In to Request
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CONNECTION REQUEST MODAL --- */}
      {selectedAdvocate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="neo-card max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedAdvocate(null)}
              className="absolute right-5 top-5 p-2 neo-btn rounded-xl text-slate-700 hover:text-black transition-colors"
            >
              <X size={16} />
            </button>

            <div>
              <h2 className="text-xl font-black text-[#111317] flex items-center gap-2">
                <Send className="text-[#111317]" size={20} /> Request Advocate Representation
              </h2>
              <p className="text-slate-600 text-xs mt-1">
                Send a formal representation request to <strong className="text-[#111317]">{selectedAdvocate.name}</strong>.
              </p>
            </div>

            <form onSubmit={handleSendRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Link an Existing Case (Optional)
                </label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 neo-inset rounded-xl text-slate-800 text-xs focus:outline-none"
                >
                  <option value="">-- No specific case / General Legal Consultation --</option>
                  {myCases?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.category.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Introduction / Note to Advocate (Optional)
                </label>
                <textarea
                  rows={4}
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Briefly state your legal issue, urgency, or specific assistance needed..."
                  className="w-full px-3.5 py-2.5 neo-inset rounded-xl text-slate-800 text-xs focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAdvocate(null)}
                  className="px-5 py-2.5 neo-btn text-slate-700 hover:text-black rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendRequestMutation.isPending}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-55 flex items-center gap-1.5 cursor-pointer"
                >
                  {sendRequestMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

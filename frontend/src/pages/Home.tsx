import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { trpc } from '../utils/trpc.js';
import LadyJusticeViewer from '../components/LadyJusticeViewer.js';
import {
  Scale, Search, ArrowRight, UserCheck,
  Lock, AlertTriangle, Loader2,
  Landmark, FileText, Sparkles,
  Gavel, Layers, ArrowUpRight, X
} from 'lucide-react';

interface HomeProps {
  auth: {
    token: string | null;
    user: any;
    isAuthenticated: boolean;
    login: (token: string, user: any) => void;
    logout: () => void;
  };
}

export default function Home({ auth }: HomeProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  // Scroll section tracking (0: Hero, 1: BNS, 2: Assessment, 3: Advocates, 4: Notices)
  const [activeSection, setActiveSection] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Section element references for smooth scroll snapping/jumping
  const sectionRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];

  // Login form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register form states
  const [regRole, setRegRole] = useState<'citizen' | 'advocate'>('citizen');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [barNumber, setBarNumber] = useState('');
  const [practiceAreas, setPracticeAreas] = useState('');
  const [experience, setExperience] = useState('0');
  const [bio, setBio] = useState('');
  const [regError, setRegError] = useState('');

  // Interactive Dispute Simulator State
  const [simCategory, setSimCategory] = useState<'consumer' | 'tenant' | 'cheque' | 'criminal'>('consumer');
  const [simHasProof, setSimHasProof] = useState(true);
  const [simNoticeSent, setSimNoticeSent] = useState(false);
  const [simTimelineValid, setSimTimelineValid] = useState(true);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Mutations
  const loginMutation = trpc.auth.login.useMutation();
  const signupMutation = trpc.auth.signup.useMutation();

  // Scroll listener to update activeSection and scrollProgress with high precision
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const progress = docHeight > 0 ? Math.min(Math.max(scrollY / docHeight, 0), 1) : 0;
          setScrollProgress(progress);

          // Determine active section by checking element offsets
          const windowMid = scrollY + window.innerHeight * 0.42;
          for (let i = sectionRefs.length - 1; i >= 0; i--) {
            const ref = sectionRefs[i];
            if (ref.current && ref.current.offsetTop <= windowMid) {
              setActiveSection(i);
              break;
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (index: number) => {
    const targetRef = sectionRefs[index];
    if (targetRef && targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await loginMutation.mutateAsync({
        email: loginEmail,
        password: loginPassword,
      });
      auth.login(response.token, response.user);
      setShowAuthModal(false);
      navigate('/dashboard');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid email or password.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    try {
      const payload: any = {
        name: regName,
        email: regEmail,
        password: regPassword,
        role: regRole,
      };

      if (regRole === 'advocate') {
        payload.advocateDetails = {
          barCouncilNumber: barNumber,
          practiceAreas,
          experienceYears: Number(experience) || 0,
          bio,
        };
      }

      const response = await signupMutation.mutateAsync(payload);
      auth.login(response.token, response.user);
      setShowAuthModal(false);
      navigate('/dashboard');
    } catch (err: any) {
      setRegError(err.message || 'Registration failed.');
    }
  };

  // Calculate dynamic simulator score
  const calculateSimScore = () => {
    let score = 50;
    if (simHasProof) score += 25;
    if (simNoticeSent) score += 15;
    if (simTimelineValid) score += 10;
    return Math.min(score, 98);
  };

  const simScore = calculateSimScore();

  return (
    <div className="relative min-h-screen bg-[#edf0f5] text-[#0f172a] selection:bg-black selection:text-white overflow-x-hidden font-sans">
      
      {/* ========================================================
          BACKGROUND 1: SUBTLE VERTICAL ARCHITECTURAL GRID LINES
          Tactile monochrome styling on light clay
          ======================================================== */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40 flex justify-between px-8 md:px-20 max-w-7xl mx-auto">
        <div className="w-[1px] h-full bg-slate-300/40" />
        <div className="w-[1px] h-full bg-slate-300/40 hidden sm:block" />
        <div className="w-[1px] h-full bg-slate-300/40 hidden md:block" />
        <div className="w-[1px] h-full bg-slate-300/40 hidden lg:block" />
        <div className="w-[1px] h-full bg-slate-300/40" />
      </div>

      {/* ========================================================
          BACKGROUND 2: CONTINUOUS FIXED 3D LADY JUSTICE SCENE
          With 3D WebGL GLTFLoader and Smooth Cubic Interpolation
          ======================================================== */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <LadyJusticeViewer
          scrollProgress={scrollProgress}
          currentSection={activeSection}
        />
      </div>

      {/* ========================================================
          LEFT PAGINATION / PROGRESS TRACKER (Tactile Clay Neomorphism)
          ======================================================== */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center gap-3.5 neo-card-sm p-2.5 backdrop-blur-md">
        {[
          { id: 0, label: '01' },
          { id: 1, label: '02' },
          { id: 2, label: '03' },
          { id: 3, label: '04' },
          { id: 4, label: '05' },
        ].map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="group flex items-center gap-2 transition-all text-left"
              title={`Jump to Section ${item.label}`}
            >
              <div
                className={`transition-all duration-300 rounded-full ${
                  isActive
                    ? 'w-5 h-[3px] bg-[#111317]'
                    : 'w-2 h-[2px] bg-slate-400 group-hover:bg-slate-700 group-hover:w-3.5'
                }`}
              />
              <span
                className={`font-mono text-[9px] tracking-widest transition-colors ${
                  isActive ? 'text-[#111317] font-extrabold' : 'text-slate-500 group-hover:text-black font-semibold'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================
          SECTION 0: HERO (EQUAL JUSTICE UNDER LAW)
          ======================================================== */}
      <section
        ref={sectionRefs[0]}
        className="relative min-h-[92vh] flex flex-col justify-center px-6 md:px-20 max-w-7xl mx-auto z-10 pt-16 pb-20"
      >
        <div className={`max-w-2xl space-y-6 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          activeSection === 0 ? 'opacity-100 translate-y-0' : 'opacity-70 translate-y-3'
        }`}>
          
          {/* Pill Tag */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full neo-pill text-xs font-black text-slate-800 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
            <span>National Repository of Indian Law • India Code Codified</span>
          </div>

          {/* Monumental Editorial Serif Headline */}
          <div className="space-y-1">
            <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-normal tracking-tight text-[#0f172a] leading-[0.98]">
              Equal Justice <br />
              <span className="italic font-light text-slate-800">Codified</span> Under Law
            </h1>
          </div>

          <p className="text-slate-600 text-sm sm:text-base font-medium max-w-lg leading-relaxed pt-2">
            A high-precision statutory intelligence engine. Search 150+ Central Acts and the 2024 Bharatiya Nyaya Sanhita, calculate dispute merits with evidentiary clarity, and consult Bar Council verified advocates.
          </p>

          {/* Search Bar - Tactile Neomorphic Inset */}
          <div className="max-w-md pt-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                }
              }}
              className="relative flex items-center"
            >
              <Search className="absolute left-4 text-slate-400" size={17} />
              <input
                type="text"
                placeholder="Search bare acts (e.g. BNS 103, NI Act 138, Consumer)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-24 py-3.5 neo-inset rounded-2xl text-[#0f172a] placeholder-slate-400 focus:outline-none text-xs sm:text-sm font-semibold transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 px-4 py-2 neo-btn-black font-extrabold rounded-xl text-xs flex items-center gap-1"
              >
                Search
              </button>
            </form>

            {/* Quick Keyword Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-3 text-[11px] font-semibold text-slate-500">
              <span className="font-bold text-slate-700">Codified:</span>
              {[
                { label: 'BNS 103 (Murder)', q: 'BNS 103' },
                { label: 'NI 138 (Cheque Bounce)', q: '138' },
                { label: 'Consumer Forum', q: 'Consumer' },
                { label: 'RTI Act', q: 'RTI' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(chip.q)}`)}
                  className="px-2 py-0.5 rounded-lg neo-inset-sm text-slate-700 hover:text-black hover:bg-white/60 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-4">
            <Link
              to="/search"
              className="px-6 py-3.5 neo-btn-black font-extrabold text-xs sm:text-sm uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-md"
            >
              <Landmark size={15} className="text-white" /> Explore Codified Laws
            </Link>

            <Link
              to="/assessment"
              className="px-6 py-3.5 neo-btn font-extrabold text-xs sm:text-sm uppercase tracking-wider rounded-2xl text-slate-800 hover:text-black flex items-center gap-2"
            >
              <Sparkles size={15} /> Claim Assessment
            </Link>

            {!auth.isAuthenticated ? (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-5 py-3.5 neo-btn text-xs font-bold text-slate-700 hover:text-black rounded-2xl uppercase tracking-wider"
              >
                Sign In / Register →
              </button>
            ) : (
              <Link
                to="/dashboard"
                className="px-5 py-3.5 neo-btn text-xs font-bold text-slate-800 hover:text-black rounded-2xl flex items-center gap-1.5 uppercase tracking-wider"
              >
                <UserCheck size={14} /> My Workspace →
              </Link>
            )}
          </div>

          {/* Metric Stats Banner */}
          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-200 max-w-lg">
            <div>
              <div className="font-serif text-3xl font-extrabold text-[#0f172a]">152+</div>
              <div className="text-[10px] font-bold tracking-wider uppercase text-slate-500 pt-0.5">Codified Sections</div>
            </div>
            <div>
              <div className="font-serif text-3xl font-extrabold text-[#0f172a]">100%</div>
              <div className="text-[10px] font-bold tracking-wider uppercase text-slate-500 pt-0.5">Bar Verified</div>
            </div>
            <div>
              <div className="font-serif text-3xl font-extrabold text-[#0f172a]">₹0</div>
              <div className="text-[10px] font-bold tracking-wider uppercase text-slate-500 pt-0.5">Free Public Aid</div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================
          SECTION 1: BNS 2024 STATUTORY TRANSITION GUIDE
          ======================================================== */}
      <section
        ref={sectionRefs[1]}
        className="relative min-h-[92vh] flex flex-col justify-center px-6 md:px-20 max-w-7xl mx-auto z-10 py-20"
      >
        <div className={`max-w-xl space-y-6 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          activeSection === 1 ? 'opacity-100 translate-y-0' : 'opacity-70 translate-y-3'
        }`}>
          <div className="inline-flex items-center gap-2 text-xs font-black tracking-widest uppercase text-slate-500">
            <Layers size={14} className="text-[#111317]" /> 2024 Criminal Law Transition
          </div>

          <h2 className="font-serif text-4xl sm:text-6xl font-normal text-[#0f172a] leading-tight">
            Bharatiya Nyaya <br />
            <span className="italic text-slate-800">Sanhita</span> Codification
          </h2>

          <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">
            The colonial Indian Penal Code (1860) and CrPC (1973) have been replaced by the 2024 Bharatiya Nyaya Sanhita and BNSS. Themis provides instant cross-referencing and plain-language summaries for every provision.
          </p>

          <div className="space-y-3 pt-2">
            {[
              {
                old: 'IPC 302',
                bns: 'BNS Section 103(1)',
                title: 'Punishment for Murder',
                desc: 'Codified penalties for culpable homicide amounting to murder. Capital punishment or life imprisonment.',
                bailable: 'Non-Bailable',
              },
              {
                old: 'IPC 420',
                bns: 'BNS Section 318(4)',
                title: 'Cheating & Dishonesty',
                desc: 'Fraudulent deception and delivery of valuable securities or property.',
                bailable: 'Non-Bailable',
              },
              {
                old: 'IPC 498A',
                bns: 'BNS Section 85',
                title: 'Cruelty to Married Woman',
                desc: 'Subjecting a woman to physical or mental cruelty by husband or relatives.',
                bailable: 'Non-Bailable',
              },
              {
                old: 'CrPC 154',
                bns: 'BNSS Section 173',
                title: 'FIR & Cognizable Offence',
                desc: 'Electronic FIR filing protocols and preliminary inquiry procedure.',
                bailable: 'Procedure',
              },
            ].map((statute, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl neo-card flex items-start justify-between gap-4 group hover:translate-y-[-2px] transition-transform"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#111317] group-hover:underline">
                      {statute.bns}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 line-through">
                      {statute.old}
                    </span>
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded neo-inset-sm text-slate-700">
                      {statute.bailable}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-800">{statute.title}</div>
                  <p className="text-[11px] text-slate-600 font-medium line-clamp-1">{statute.desc}</p>
                </div>

                <Link
                  to={`/search?q=${encodeURIComponent(statute.bns)}`}
                  className="p-2.5 rounded-xl neo-btn text-slate-700 hover:text-black transition-all shrink-0 mt-1"
                >
                  <ArrowRight size={13} />
                </Link>
              </div>
            ))}
          </div>

          <Link
            to="/search?category=Criminal%20Law"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#111317] hover:underline pt-2"
          >
            Explore all 2024 Codified Criminal Laws →
          </Link>
        </div>
      </section>

      {/* ========================================================
          SECTION 2: AUTOMATED LEGAL CLAIM ASSESSMENTS
          ======================================================== */}
      <section
        ref={sectionRefs[2]}
        className="relative min-h-[92vh] flex flex-col justify-center px-6 md:px-20 max-w-7xl mx-auto z-10 py-20"
      >
        <div className={`max-w-xl space-y-6 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          activeSection === 2 ? 'opacity-100 translate-y-0' : 'opacity-70 translate-y-3'
        }`}>
          <div className="inline-flex items-center gap-2 text-xs font-black tracking-widest uppercase text-slate-500">
            <Sparkles size={14} className="text-[#111317]" /> Algorithmic Standing Engine
          </div>

          <h2 className="font-serif text-4xl sm:text-6xl font-normal text-[#0f172a] leading-tight">
            Claim Merits & <br />
            <span className="italic text-slate-800">Standing</span> Assessment
          </h2>

          <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">
            Citizens can test their dispute in our interactive sandbox. The engine analyzes evidentiary proof, notice requirements, and limitation periods to calculate real legal standing.
          </p>

          {/* Interactive Claim Sandbox Card (Neomorphic Tactile Card) */}
          <div className="p-6 md:p-7 rounded-3xl neo-card space-y-5">
            
            {/* Category Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'consumer', label: 'Consumer' },
                { id: 'tenant', label: 'Rent Dispute' },
                { id: 'cheque', label: 'Cheque Bounce' },
                { id: 'criminal', label: 'Criminal BNS' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSimCategory(c.id as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    simCategory === c.id ? 'neo-pill-active' : 'neo-pill'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Fact Verification Toggles */}
            <div className="space-y-2.5">
              <div
                onClick={() => setSimHasProof(!simHasProof)}
                className="p-3 neo-inset-sm rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 text-xs">
                  <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                    simHasProof ? 'neo-btn-black text-white' : 'neo-card-sm text-slate-400'
                  }`}>
                    {simHasProof ? '✓' : ''}
                  </div>
                  <span className="text-[#111317] font-semibold">Written Proof / Receipts Attached</span>
                </div>
                <span className="font-mono text-xs font-bold text-slate-700">{simHasProof ? '+25%' : '+0%'}</span>
              </div>

              <div
                onClick={() => setSimNoticeSent(!simNoticeSent)}
                className="p-3 neo-inset-sm rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 text-xs">
                  <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                    simNoticeSent ? 'neo-btn-black text-white' : 'neo-card-sm text-slate-400'
                  }`}>
                    {simNoticeSent ? '✓' : ''}
                  </div>
                  <span className="text-[#111317] font-semibold">Statutory Notice Delivered via RPAD</span>
                </div>
                <span className="font-mono text-xs font-bold text-slate-700">{simNoticeSent ? '+15%' : '+0%'}</span>
              </div>

              <div
                onClick={() => setSimTimelineValid(!simTimelineValid)}
                className="p-3 neo-inset-sm rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 text-xs">
                  <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                    simTimelineValid ? 'neo-btn-black text-white' : 'neo-card-sm text-slate-400'
                  }`}>
                    {simTimelineValid ? '✓' : ''}
                  </div>
                  <span className="text-[#111317] font-semibold">Within Limitation Act Timeline</span>
                </div>
                <span className="font-mono text-xs font-bold text-slate-700">{simTimelineValid ? '+10%' : '+0%'}</span>
              </div>
            </div>

            {/* Score Output Banner */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Calculated Standing</span>
                <span className="font-serif text-2xl font-bold text-[#111317]">
                  {simScore >= 75 ? 'Strong Standing' : simScore >= 50 ? 'Moderate Standing' : 'Low Evidence'}
                </span>
              </div>
              <div className="font-mono text-3xl font-extrabold text-[#111317]">
                {simScore}<span className="text-sm font-normal text-slate-400">/100</span>
              </div>
            </div>

            <Link
              to="/assessment"
              className="w-full py-3 neo-btn-black font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm"
            >
              Start Official Assessment <ArrowRight size={14} className="text-white" />
            </Link>

          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 3: VERIFIED BAR COUNCIL ADVOCATES NETWORK
          ======================================================== */}
      <section
        ref={sectionRefs[3]}
        className="relative min-h-[92vh] flex flex-col justify-center px-6 md:px-20 max-w-7xl mx-auto z-10 py-20"
      >
        <div className={`max-w-xl space-y-6 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          activeSection === 3 ? 'opacity-100 translate-y-0' : 'opacity-70 translate-y-3'
        }`}>
          <div className="inline-flex items-center gap-2 text-xs font-black tracking-widest uppercase text-slate-500">
            <Gavel size={14} className="text-[#111317]" /> High Court & District Judiciary
          </div>

          <h2 className="font-serif text-4xl sm:text-6xl font-normal text-[#0f172a] leading-tight">
            Bar Council <br />
            <span className="italic text-slate-800">Verified</span> Counsel
          </h2>

          <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">
            Every advocate on Themis is verified against official Bar Council rosters with enrollment IDs, certified years of practice, and forum specialties across Kerala and National High Courts.
          </p>

          <div className="space-y-3 pt-2">
            {[
              {
                name: 'Adv. K. Gopalakrishna Kurup',
                bar: 'BAR ID: K/182/1976',
                exp: '48 Years Practice',
                domain: 'Constitutional Law, Civil Litigation & Administrative Service',
              },
              {
                name: 'Adv. Sumathi Dandapani',
                bar: 'BAR ID: K/245/1982',
                exp: '42 Years Practice',
                domain: 'Civil & Property, Family Law, Partition & Land Disputes',
              },
              {
                name: 'Adv. P. Vijaya Bhanu',
                bar: 'BAR ID: K/312/1984',
                exp: '40 Years Practice',
                domain: 'Criminal Defense, Trial Advocacy, Bail & Appellate Litigation',
              },
            ].map((adv, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl neo-card flex items-center justify-between gap-4 hover:translate-y-[-2px] transition-transform"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-sm font-bold text-[#111317]">{adv.name}</span>
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded neo-btn-black">
                      Verified
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono font-semibold text-slate-500">
                    <span>{adv.bar}</span>
                    <span>•</span>
                    <span>{adv.exp}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">{adv.domain}</div>
                </div>

                <Link
                  to="/advocates"
                  className="px-3.5 py-2 rounded-xl neo-btn text-xs font-bold text-slate-800 hover:text-black transition-all shrink-0"
                >
                  Consult
                </Link>
              </div>
            ))}
          </div>

          <Link
            to="/advocates"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#111317] hover:underline pt-2"
          >
            Browse Directory of 48+ Verified Advocates →
          </Link>
        </div>
      </section>

      {/* ========================================================
          SECTION 4: AUTOMATED LEGAL NOTICE GENERATOR
          ======================================================== */}
      <section
        ref={sectionRefs[4]}
        className="relative min-h-[92vh] flex flex-col justify-center px-6 md:px-20 max-w-7xl mx-auto z-10 py-20"
      >
        <div className={`max-w-xl space-y-6 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          activeSection === 4 ? 'opacity-100 translate-y-0' : 'opacity-70 translate-y-3'
        }`}>
          <div className="inline-flex items-center gap-2 text-xs font-black tracking-widest uppercase text-slate-500">
            <FileText size={14} className="text-[#111317]" /> Instant Document Automation
          </div>

          <h2 className="font-serif text-4xl sm:text-6xl font-normal text-[#0f172a] leading-tight">
            Statutory Notices & <br />
            <span className="italic text-slate-800">Pleadings</span> Generator
          </h2>

          <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">
            Generate legally binding Section 138 demand notices, landlord-tenant eviction demands, and Consumer Forum complaints formatted strictly according to Indian procedural law.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[
              {
                title: 'Section 138 NI Act Notice',
                desc: 'Mandatory 15-day statutory demand notice for dishonoured bank cheques.',
                badge: 'Negotiable Instruments',
              },
              {
                title: 'Tenant Eviction Demand',
                desc: 'Formal demand notice under State Rent Control Act for lease default.',
                badge: 'Property Law',
              },
              {
                title: 'Consumer Forum Complaint',
                desc: 'Formal complaint petition under Section 35 of Consumer Protection Act 2019.',
                badge: 'Consumer Protection',
              },
              {
                title: 'RTI Section 6 Application',
                desc: 'Statutory Right to Information application to Public Information Officer.',
                badge: 'Constitutional Rights',
              },
            ].map((doc, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl neo-card space-y-2 hover:translate-y-[-2px] transition-transform"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  {doc.badge}
                </span>
                <h4 className="font-serif text-sm font-bold text-[#111317]">{doc.title}</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">{doc.desc}</p>
                <Link
                  to="/documents"
                  className="text-xs font-bold text-[#111317] hover:underline inline-flex items-center gap-1 pt-1"
                >
                  Generate Draft →
                </Link>
              </div>
            ))}
          </div>

          {/* Action CTA */}
          <div className="pt-4 flex flex-wrap items-center gap-3">
            <Link
              to="/documents"
              className="px-6 py-3.5 neo-btn-black font-extrabold text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2"
            >
              <FileText size={15} className="text-white" /> Open Notice Generator
            </Link>

            {!auth.isAuthenticated && (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-3.5 neo-btn font-extrabold text-xs uppercase tracking-wider text-slate-800 hover:text-black rounded-2xl"
              >
                Access Workspace
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================
          FAQ SECTION (Collapsible Accordion on Light Clay)
          ======================================================== */}
      <section className="relative px-6 md:px-20 max-w-4xl mx-auto z-10 py-20 border-t border-slate-200">
        <div className="text-center space-y-2 mb-10">
          <span className="text-xs font-black tracking-widest uppercase text-slate-500">Constitutional Assurance</span>
          <h3 className="font-serif text-3xl sm:text-4xl font-normal text-[#0f172a]">Frequently Addressed Questions</h3>
        </div>

        <div className="space-y-3">
          {[
            {
              q: 'Is Themis free for Indian citizens seeking legal aid?',
              a: 'Yes. Searching codified Central Acts, reviewing plain-language statutory summaries, running claim merit assessments, and browsing verified advocates are 100% free with zero paywalls. Advocates establish their own consultation fees or provide pro bono representation for deserving cases.',
            },
            {
              q: 'How does Themis incorporate the 2024 criminal laws (BNS, BNSS, BSA)?',
              a: 'Themis contains active codified statutory sections from the Bharatiya Nyaya Sanhita, 2023 (Act No. 45 of 2023), Bharatiya Nagarik Suraksha Sanhita, and Bharatiya Sakshya Adhiniyam, directly mapped alongside legacy IPC and CrPC numbers for cross-referencing.',
            },
            {
              q: 'How are advocates verified on the platform?',
              a: 'Every advocate registered on Themis must provide a valid Bar Council Enrollment ID (e.g., K/182/1976), active practice jurisdiction, and years of experience. Registry administrators verify credentials against official Bar Council rosters before directory publication.',
            },
            {
              q: 'Are the documents generated on Themis legally valid?',
              a: 'The notice templates (such as Section 138 Negotiable Instruments demand notices, eviction notices, and Consumer complaints) are drafted in compliance with standard Indian statutory requirements. Citizens can customize and export them for formal service via Registered Post with Acknowledgment Due (RPAD).',
            },
          ].map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl neo-card overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-serif text-sm sm:text-base font-bold text-[#111317]"
                >
                  <span>{faq.q}</span>
                  <span className={`text-base font-mono font-bold transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                    ›
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed font-medium border-t border-slate-200 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================
          AUTHENTICATION MODAL (Tactile Clay Neomorphic Drawer)
          ======================================================== */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="neo-card max-w-md w-full p-6 sm:p-8 space-y-5 relative my-8 shadow-2xl">
            
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute right-5 top-5 p-2 neo-btn rounded-xl text-slate-700 hover:text-black transition-all"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl neo-btn-black flex items-center justify-center text-white">
                <Scale size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#111317]">Themis Workspace</h3>
                <p className="text-xs text-slate-500 font-semibold">Sign in to your legal dossier</p>
              </div>
            </div>

            {/* Segmented Tabs */}
            <div className="grid grid-cols-2 p-1.5 neo-inset-sm rounded-xl gap-1 text-xs">
              <button
                onClick={() => { setAuthModalTab('login'); setLoginError(''); }}
                className={`py-2 rounded-lg font-bold transition-all ${
                  authModalTab === 'login' ? 'neo-pill-active' : 'neo-pill'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthModalTab('register'); setRegError(''); }}
                className={`py-2 rounded-lg font-bold transition-all ${
                  authModalTab === 'register' ? 'neo-pill-active' : 'neo-pill'
                }`}
              >
                Register
              </button>
            </div>

            {authModalTab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                {loginError && (
                  <div className="p-3 rounded-xl neo-inset text-rose-600 text-xs font-semibold flex items-center gap-1.5">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="citizen@themis.org"
                    className="w-full px-3.5 py-2.5 neo-inset rounded-xl text-[#0f172a] placeholder-slate-400 text-xs font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 neo-inset rounded-xl text-[#0f172a] placeholder-slate-400 text-xs font-medium focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginMutation.isLoading}
                  className="w-full py-3 neo-btn-black font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5"
                >
                  {loginMutation.isLoading ? <Loader2 size={14} className="animate-spin text-white" /> : <Lock size={14} className="text-white" />}
                  Sign In to Workspace
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {regError && (
                  <div className="p-3 rounded-xl neo-inset text-rose-600 text-xs font-semibold flex items-center gap-1.5">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>{regError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 p-1 neo-inset-sm rounded-xl gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setRegRole('citizen')}
                    className={`py-1.5 rounded-lg font-bold ${regRole === 'citizen' ? 'neo-pill-active' : 'neo-pill'}`}
                  >
                    Citizen
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegRole('advocate')}
                    className={`py-1.5 rounded-lg font-bold ${regRole === 'advocate' ? 'neo-pill-active' : 'neo-pill'}`}
                  >
                    Advocate
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Adv. Rajesh Nair or Priya Menon"
                    className="w-full px-3 py-2 neo-inset rounded-xl text-[#0f172a] placeholder-slate-400 text-xs font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 neo-inset rounded-xl text-[#0f172a] placeholder-slate-400 text-xs font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full px-3 py-2 neo-inset rounded-xl text-[#0f172a] placeholder-slate-400 text-xs font-medium focus:outline-none"
                  />
                </div>

                {regRole === 'advocate' && (
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Bar Council Number</label>
                      <input
                        type="text"
                        required
                        value={barNumber}
                        onChange={(e) => setBarNumber(e.target.value)}
                        placeholder="e.g. K/182/1976"
                        className="w-full px-3 py-2 neo-inset rounded-xl text-[#0f172a] placeholder-slate-400 text-xs font-medium focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Practice Areas</label>
                      <input
                        type="text"
                        required
                        value={practiceAreas}
                        onChange={(e) => setPracticeAreas(e.target.value)}
                        placeholder="e.g. Criminal Law, Civil Litigation"
                        className="w-full px-3 py-2 neo-inset rounded-xl text-[#0f172a] placeholder-slate-400 text-xs font-medium focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Years of Practice</label>
                      <input
                        type="number"
                        min="0"
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        placeholder="e.g. 12"
                        className="w-full px-3 py-2 neo-inset rounded-xl text-[#0f172a] placeholder-slate-400 text-xs font-medium focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Bio Summary</label>
                      <textarea
                        rows={2}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Brief summary of court practice..."
                        className="w-full px-3 py-2 neo-inset rounded-xl text-[#0f172a] placeholder-slate-400 text-xs font-medium focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={signupMutation.isLoading}
                  className="w-full py-3 neo-btn-black font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 mt-2"
                >
                  {signupMutation.isLoading ? <Loader2 size={14} className="animate-spin text-white" /> : <UserCheck size={14} className="text-white" />}
                  Complete Registration
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ========================================================
          TACTILE CLAY EDITORIAL FOOTER
          ======================================================== */}
      <footer className="relative py-12 px-6 md:px-20 border-t border-slate-200 z-10 bg-[#edf0f5]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-slate-600 font-semibold">
          <div className="flex items-center gap-3">
            <span className="font-serif text-sm font-bold text-[#111317] tracking-wider">THEMIS</span>
            <span>•</span>
            <span>National Repository & Legal Aid</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-slate-700">
            <Link to="/search" className="hover:text-black transition-colors">Codified Acts</Link>
            <Link to="/assessment" className="hover:text-black transition-colors">Claim Assessment</Link>
            <Link to="/advocates" className="hover:text-black transition-colors">Advocates</Link>
            <Link to="/documents" className="hover:text-black transition-colors">Notices</Link>
            <a href="https://www.indiacode.nic.in" target="_blank" rel="noopener noreferrer" className="hover:text-black flex items-center gap-1">
              India Code (NIC) <ArrowUpRight size={11} />
            </a>
          </div>

          <div className="text-[11px] text-slate-500 font-normal">
            © {new Date().getFullYear()} Themis. Compliant with Government of India Repository standards.
          </div>
        </div>
      </footer>

    </div>
  );
}

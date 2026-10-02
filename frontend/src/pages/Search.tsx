import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { trpc } from '../utils/trpc.js';
import {
  Search as SearchIcon,
  Scale,
  Book,
  Gavel,
  Landmark,
  FileSearch,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Layers,
  MapPin,
  CheckCircle,
  AlertCircle,
  Building,
  RefreshCw,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { LEGAL_DATABASE, LegalConcept } from '../data/legalDatabase.js';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [query, setQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState<'indiacode' | 'acts' | 'concepts'>('indiacode');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedActId, setSelectedActId] = useState<string>('');
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  // tRPC query to India Code national repository
  const {
    data: lawsResults = [],
    isLoading: lawsLoading,
    refetch: refetchLaws,
  } = trpc.laws.search.useQuery({
    query: queryParam || undefined,
    category: selectedCategory !== 'All' ? selectedCategory : undefined,
    actId: selectedActId || undefined,
    limit: 200,
  });

  // tRPC query for list of all acts
  const { data: actsList = [], isLoading: actsLoading } = trpc.laws.listActs.useQuery({
    category: selectedCategory !== 'All' ? selectedCategory : undefined,
  });

  // Mutation to re-seed repository if needed
  const seedMutation = trpc.laws.seed.useMutation({
    onSuccess: () => {
      refetchLaws();
    },
  });

  // Dedicated handler to filter by a specific Act reliably
  const handleFilterByAct = (actId: string) => {
    setSelectedActId(actId);
    setSelectedCategory('All');
    setQuery('');
    setSearchParams({});
    setActiveTab('indiacode');
    window.scrollTo({ top: 320, behavior: 'smooth' });
  };

  const handleClearActFilter = () => {
    setSelectedActId('');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(query.trim() ? { q: query.trim() } : {});
  };

  const handleResetAll = () => {
    setQuery('');
    setSelectedCategory('All');
    setSelectedActId('');
    setSearchParams({});
  };

  // Find active act metadata if an act is selected
  const activeActObj = selectedActId
    ? actsList.find((a) => a.id === selectedActId) || lawsResults.find((r) => r.actId === selectedActId)?.act
    : null;

  // Static legal concepts filter
  const filteredConcepts = LEGAL_DATABASE.filter((concept) => {
    if (selectedCategory !== 'All' && concept.category !== selectedCategory && concept.relatedTopic !== selectedCategory) {
      return false;
    }
    if (!queryParam) return true;
    const searchString = `${concept.term} ${concept.simpleMeaning} ${concept.category} ${concept.relatedTopic} ${concept.governingAct || ''} ${concept.statutorySection || ''} ${concept.keyPrecedent || ''} ${concept.relatedTerms.join(' ')}`.toLowerCase();
    return searchString.includes(queryParam.toLowerCase());
  });

  const quickFilterPills = [
    'All',
    'Criminal Law',
    'Criminal Procedure',
    'Constitutional Law',
    'Civil Law',
    'Civil Procedure',
    'Commercial Law',
    'Corporate Law',
    'Consumer Law',
    'Cyber Law',
    'Transport & Traffic Law',
    'Family & Matrimonial Law',
    'Labour & Employment Law',
    'Property Law',
    'Citizen Rights',
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative min-h-[85vh]">
      {/* Header Banner - White Prominent Monochrome Neomorphism */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full neo-pill text-xs font-bold text-slate-800">
          <Sparkles size={13} className="text-black" />
          National Legal Repository • Official Central & State Legislation
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f172a] tracking-tight flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-2xl neo-btn-black flex items-center justify-center shadow-[4px_4px_12px_rgba(0,0,0,0.18),-2px_-2px_6px_rgba(255,255,255,0.9)]">
            <FileSearch size={22} className="text-white" />
          </div>
          Search Indian Laws & Statutory Codes
        </h1>

        <p className="text-slate-600 text-xs md:text-sm max-w-2xl mx-auto font-medium">
          Query Central Acts, 2024 Bharatiya Nyaya Sanhita (BNS/BNSS), Commercial & Consumer laws, court jurisdictions, and precedents directly mapped to the official Government of India repository.
        </p>
      </div>

      {/* Main Search Bar - Neomorphic Inset Input with Black Button */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-3xl mx-auto mb-7">
        <div className="relative flex items-center">
          <SearchIcon className="absolute left-5 text-slate-400" size={20} />
          <input
            type="text"
            placeholder={
              activeActObj
                ? `Search within ${activeActObj.shortTitle} (e.g. section number, keyword)...`
                : "Search Sections, Acts, Offences, Rights (e.g. BNS 103, Cheque Bounce, Bail, Eviction, POCSO)..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-14 pr-32 py-4 neo-inset rounded-2xl text-[#0f172a] placeholder-slate-400 focus:outline-none text-sm md:text-base font-medium transition-all"
          />
          <button
            type="submit"
            className="absolute right-2 top-2 bottom-2 px-6 neo-btn-black font-extrabold rounded-xl text-xs md:text-sm flex items-center gap-1.5"
          >
            <SearchIcon size={14} className="text-white" /> Search
          </button>
        </div>
      </form>

      {/* Navigation Tabs - Tactile Neomorphic Segmented Capsule */}
      <div className="neo-inset-sm p-1.5 rounded-2xl flex max-w-3xl mx-auto mb-6 justify-between gap-1">
        <button
          onClick={() => setActiveTab('indiacode')}
          className={`flex-1 py-2.5 px-4 text-xs md:text-sm font-bold flex items-center justify-center gap-2 rounded-xl transition-all ${
            activeTab === 'indiacode'
              ? 'neo-btn-black shadow-sm'
              : 'text-slate-600 hover:text-black hover:bg-white/40'
          }`}
        >
          <Landmark size={15} /> Statutory Sections ({lawsResults.length})
        </button>
        <button
          onClick={() => setActiveTab('acts')}
          className={`flex-1 py-2.5 px-4 text-xs md:text-sm font-bold flex items-center justify-center gap-2 rounded-xl transition-all ${
            activeTab === 'acts'
              ? 'neo-btn-black shadow-sm'
              : 'text-slate-600 hover:text-black hover:bg-white/40'
          }`}
        >
          <Building size={15} /> Central Acts Catalog ({actsList.length})
        </button>
        <button
          onClick={() => setActiveTab('concepts')}
          className={`flex-1 py-2.5 px-4 text-xs md:text-sm font-bold flex items-center justify-center gap-2 rounded-xl transition-all ${
            activeTab === 'concepts'
              ? 'neo-btn-black shadow-sm'
              : 'text-slate-600 hover:text-black hover:bg-white/40'
          }`}
        >
          <Book size={15} /> Legal Dictionary ({filteredConcepts.length})
        </button>
      </div>

      {/* Active Act Filter Banner - Tactile Neomorphic Card */}
      {activeActObj && (
        <div className="max-w-4xl mx-auto mb-6 p-4 md:p-5 neo-card flex items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl neo-btn-black flex items-center justify-center shrink-0 shadow-[4px_4px_10px_rgba(0,0,0,0.18),-2px_-2px_6px_rgba(255,255,255,0.9)]">
              <Landmark size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider neo-btn-black">
                  Active Statute
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  {activeActObj.actNumber} ({activeActObj.actYear})
                </span>
              </div>
              <h3 className="text-[#0f172a] text-sm md:text-base font-extrabold mt-0.5">
                {activeActObj.title}
              </h3>
              <p className="text-xs text-slate-600 line-clamp-1 mt-0.5 font-medium">
                {activeActObj.overview}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeActObj.indiaCodeUrl && (
              <a
                href={activeActObj.indiaCodeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 neo-btn text-slate-700 hover:text-black text-xs font-bold rounded-xl"
              >
                Official Gazette <ExternalLink size={12} />
              </a>
            )}
            <button
              onClick={handleClearActFilter}
              className="px-3 py-1.5 neo-btn text-rose-600 hover:text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1"
            >
              <X size={14} /> Clear Act
            </button>
          </div>
        </div>
      )}

      {/* Quick Filter Pills - Neomorphic Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-5xl mx-auto mb-8">
        <div className="text-xs text-slate-500 font-extrabold uppercase tracking-wider flex items-center gap-1 mr-1">
          <SlidersHorizontal size={13} /> Categories:
        </div>
        {quickFilterPills.map((pill) => {
          const isActive = selectedCategory === pill && !selectedActId;
          return (
            <button
              key={pill}
              onClick={() => {
                setSelectedCategory(pill);
                setSelectedActId('');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isActive ? 'neo-pill-active' : 'neo-pill'
              }`}
            >
              {pill}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OFFICIAL INDIA CODE STATUTORY SECTIONS */}
      {activeTab === 'indiacode' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <Layers size={14} className="text-black" />
              {queryParam ? `Sections matching "${queryParam}"` : `Statutory Sections (${selectedCategory})`}
              <span className="text-slate-400 font-normal">({lawsResults.length} provisions)</span>
            </h3>

            {(queryParam || selectedCategory !== 'All' || selectedActId) && (
              <button
                onClick={handleResetAll}
                className="text-xs font-bold text-black hover:underline"
              >
                Reset All Filters
              </button>
            )}
          </div>

          {lawsLoading ? (
            <div className="text-center py-20 text-slate-600 flex flex-col items-center gap-3">
              <div className="w-9 h-9 border-3 border-black border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold">Querying India Code National Legal Repository...</p>
            </div>
          ) : lawsResults.length > 0 ? (
            <div className="space-y-6">
              {lawsResults.map((sec) => {
                const isExpanded = expandedSectionId === sec.id;
                return (
                  <div
                    key={sec.id}
                    className="neo-card p-6 md:p-8 space-y-5 transition-all"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-black/5 pb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <button
                            onClick={() => handleFilterByAct(sec.actId)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider neo-btn-black shadow-[2px_2px_6px_rgba(0,0,0,0.15)] hover:bg-neutral-800 transition-colors"
                            title="Filter by this Act"
                          >
                            {sec.act.shortTitle}
                          </button>
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider neo-inset-sm text-slate-700">
                            {sec.act.category}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold neo-pill text-slate-600">
                            {sec.act.actNumber} ({sec.act.actYear})
                          </span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-extrabold text-[#0f172a] flex items-center gap-2 tracking-tight">
                          <span>{sec.sectionNumber}:</span>
                          <span className="text-slate-800">{sec.sectionTitle}</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 font-semibold">{sec.act.title}</p>
                      </div>

                      {sec.act.indiaCodeUrl && (
                        <a
                          href={sec.act.indiaCodeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl neo-btn text-slate-800 hover:text-black text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto shrink-0"
                        >
                          <Landmark size={13} className="text-black" />
                          View on India Code (NIC)
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>

                    {/* Citizen-Friendly Plain English Meaning */}
                    <div>
                      <h4 className="text-[11px] font-extrabold text-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <CheckCircle size={14} className="text-black" /> Plain Language Citizen Summary
                      </h4>
                      <div className="neo-inset p-4 rounded-2xl text-slate-800 text-xs md:text-sm leading-relaxed font-medium">
                        {sec.plainSummary}
                      </div>
                    </div>

                    {/* Punishment & Classification Grid - Neomorphic Small Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      {sec.punishmentOrRemedy && sec.punishmentOrRemedy !== 'N/A' && (
                        <div className="p-3.5 neo-card-sm space-y-1">
                          <span className="text-black font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <AlertCircle size={12} /> Punishment / Remedy
                          </span>
                          <p className="text-slate-800 font-bold">{sec.punishmentOrRemedy}</p>
                        </div>
                      )}

                      {sec.bailable && sec.bailable !== 'N/A' && (
                        <div className="p-3.5 neo-card-sm space-y-1">
                          <span className="text-slate-500 font-extrabold text-[10px] uppercase tracking-wider">
                            Bail Classification
                          </span>
                          <p className="font-extrabold text-slate-900">
                            {sec.bailable}
                          </p>
                        </div>
                      )}

                      {sec.cognizable && sec.cognizable !== 'N/A' && (
                        <div className="p-3.5 neo-card-sm space-y-1">
                          <span className="text-slate-500 font-extrabold text-[10px] uppercase tracking-wider">
                            Arrest Authority
                          </span>
                          <p className="text-slate-900 font-extrabold">{sec.cognizable}</p>
                        </div>
                      )}

                      {sec.forum && (
                        <div className="p-3.5 neo-card-sm space-y-1">
                          <span className="text-slate-500 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <MapPin size={12} /> Trial Forum / Court
                          </span>
                          <p className="text-slate-900 font-bold">{sec.forum}</p>
                        </div>
                      )}
                    </div>

                    {/* Landmark Precedent */}
                    {sec.keyPrecedent && (
                      <div className="p-3.5 neo-card-sm space-y-1 text-xs">
                        <span className="text-black font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                          <Gavel size={12} /> Landmark Supreme Court Ruling / Doctrine
                        </span>
                        <p className="text-slate-700 italic font-semibold">{sec.keyPrecedent}</p>
                      </div>
                    )}

                    {/* Expandable Statutory Bare Act Legal Text */}
                    <div className="pt-1">
                      <button
                        onClick={() => setExpandedSectionId(isExpanded ? null : sec.id)}
                        className="px-3.5 py-1.5 neo-btn text-xs font-bold text-slate-800 hover:text-black rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        <Scale size={13} />
                        {isExpanded ? 'Hide Official Bare Act Legal Text ▲' : 'Show Official Bare Act Legal Text (Verbatim) ▼'}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 p-4 neo-inset rounded-2xl text-xs font-mono text-slate-800 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line animate-fadeIn">
                          {sec.legalText}
                        </div>
                      )}
                    </div>

                    {/* Action Footer */}
                    <div className="pt-3 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <p className="text-xs text-slate-500 font-medium">
                        Governing Ministry: <span className="text-slate-800 font-bold">{sec.act.ministry || 'Government of India'}</span>
                      </p>

                      <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <button
                          onClick={() => handleFilterByAct(sec.actId)}
                          className="px-3.5 py-2 neo-btn text-slate-800 text-xs font-bold rounded-xl transition-all"
                        >
                          View all in {sec.act.shortTitle}
                        </button>
                        <Link
                          to={`/advocates?search=${encodeURIComponent(sec.act.category)}`}
                          className="px-4 py-2 neo-btn-black text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-all"
                        >
                          Consult Advocate <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 neo-card space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-black/5 text-slate-500 mx-auto flex items-center justify-center mb-2">
                <Landmark size={24} />
              </div>
              <h3 className="text-base font-extrabold text-[#0f172a]">No statutory sections found</h3>
              <p className="text-slate-500 text-xs max-w-md mx-auto font-medium">
                No sections matched your query. Try searching for other criminal offences, civil relief, cheque bounce, or consumer complaints.
              </p>
              <div className="pt-3 flex justify-center gap-3">
                <button
                  onClick={handleResetAll}
                  className="px-4 py-2 neo-btn text-slate-800 text-xs font-bold rounded-xl"
                >
                  View All Sections
                </button>
                <button
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                  className="px-4 py-2 neo-btn-black text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={seedMutation.isPending ? 'animate-spin' : ''} />
                  Re-Sync India Code Database
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CENTRAL ACTS CATALOG */}
      {activeTab === 'acts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {actsLoading ? (
              <div className="col-span-2 text-center py-16 text-slate-500 font-semibold">Loading official Acts catalog...</div>
            ) : (
              actsList.map((act) => (
                <div
                  key={act.id}
                  className="neo-card p-6 md:p-7 transition-all space-y-4 group hover:translate-y-[-2px]"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded-lg neo-btn-black font-extrabold text-[10px]">
                          {act.shortTitle}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg neo-inset-sm text-slate-700 text-[10px] font-bold">
                          {act.category}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-[#0f172a] text-lg group-hover:text-black transition-colors">
                        {act.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold">{act.actNumber} • Year {act.actYear}</p>
                    </div>

                    {act.indiaCodeUrl && (
                      <a
                        href={act.indiaCodeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl neo-btn text-slate-700 hover:text-black transition-colors"
                        title="View Gazette Record on India Code"
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed neo-inset p-3.5 rounded-xl font-medium">
                    {act.overview}
                  </p>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-black/5">
                    <span className="text-slate-500 font-semibold">
                      {act.sectionCount} codified statutory sections
                    </span>

                    <button
                      onClick={() => handleFilterByAct(act.id)}
                      className="text-black font-extrabold flex items-center gap-1 hover:underline"
                    >
                      Browse Sections <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LEGAL DICTIONARY & CONCEPTS */}
      {activeTab === 'concepts' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-2 px-1">
            <h3 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <Book size={14} className="text-black" />
              {queryParam ? `Dictionary results for "${queryParam}"` : `Legal Dictionary Concepts (${selectedCategory})`}
              <span className="text-slate-400 font-normal">({filteredConcepts.length} entries)</span>
            </h3>
          </div>

          <div className="space-y-6">
            {filteredConcepts.map((concept: LegalConcept) => (
              <div
                key={concept.id}
                className="neo-card p-6 md:p-8 space-y-6 transition-all"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-black/5 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider neo-btn-black">
                        {concept.category}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider neo-inset-sm text-slate-700">
                        {concept.relatedTopic}
                      </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-extrabold text-[#0f172a]">{concept.term}</h2>
                  </div>

                  {concept.statutorySection && (
                    <span className="px-3 py-1.5 rounded-xl neo-btn text-slate-800 text-xs font-extrabold flex items-center gap-1.5 self-start sm:self-auto">
                      <Landmark size={13} /> {concept.statutorySection}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                    Legal Summary & Definition
                  </h4>
                  <p className="text-slate-800 text-xs md:text-sm leading-relaxed neo-inset p-4 rounded-xl font-medium">
                    {concept.simpleMeaning}
                  </p>
                </div>

                {(concept.governingAct || concept.jurisdictionForum || concept.limitationPeriod || concept.keyPrecedent) && (
                  <div className="neo-card-sm p-5 space-y-4">
                    <div className="flex items-center gap-2 text-black font-extrabold text-xs uppercase tracking-wider">
                      <Scale size={15} /> Statutory & Procedural Reference
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      {concept.governingAct && (
                        <div className="p-3 neo-inset rounded-xl space-y-1">
                          <span className="text-slate-500 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <Landmark size={12} /> Governing Act
                          </span>
                          <p className="text-slate-900 font-bold">{concept.governingAct}</p>
                        </div>
                      )}

                      {concept.jurisdictionForum && (
                        <div className="p-3 neo-inset rounded-xl space-y-1">
                          <span className="text-slate-500 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <MapPin size={12} /> Court Jurisdiction / Forum
                          </span>
                          <p className="text-slate-900 font-bold">{concept.jurisdictionForum}</p>
                        </div>
                      )}

                      {concept.keyPrecedent && (
                        <div className="p-3 neo-inset rounded-xl space-y-1">
                          <span className="text-slate-500 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <Gavel size={12} /> Landmark Precedent
                          </span>
                          <p className="text-slate-900 font-bold italic">{concept.keyPrecedent}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import {
  Search as SearchIcon,
  Scale,
  Book,
  ShieldAlert,
  Gavel,
  FileText,
  Landmark,
  FileSearch,
  ArrowRight,
  Sparkles,
  Layers,
  Clock,
  MapPin,
  FileEdit,
} from 'lucide-react';
import { LEGAL_DATABASE, LegalConcept } from '../data/legalDatabase.js';

export default function Search() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [query, setQuery] = useState(queryParam);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: query });
  };

  const filteredConcepts = LEGAL_DATABASE.filter((concept) => {
    // Category filter
    if (selectedCategory !== 'All' && concept.category !== selectedCategory && concept.relatedTopic !== selectedCategory) {
      return false;
    }

    if (!queryParam) return true; // Show items matching category if no query

    const searchString = `${concept.term} ${concept.simpleMeaning} ${concept.category} ${concept.relatedTopic} ${concept.governingAct || ''} ${concept.statutorySection || ''} ${concept.keyPrecedent || ''} ${concept.relatedTerms.join(' ')}`.toLowerCase();
    return searchString.includes(queryParam.toLowerCase());
  });

  const categories = [
    { icon: <ShieldAlert size={20} />, title: "Know Your Rights", desc: "Fundamental protections, citizen entitlements, and public inspection rights." },
    { icon: <Book size={20} />, title: "Legal Dictionary", desc: "Core legal terminology decoded into precise operational definitions." },
    { icon: <Landmark size={20} />, title: "Laws & Acts", desc: "Codified statutory legislation, consumer acts, and regulatory provisions." },
    { icon: <Gavel size={20} />, title: "Types of Cases", desc: "Civil suits, criminal proceedings, family disputes, and writ petitions." },
    { icon: <Scale size={20} />, title: "Court Procedures", desc: "Judicial process, charge sheets, summons service, and hearing timelines." },
    { icon: <FileText size={20} />, title: "Legal Documents", desc: "Affidavits, legal notices, sworn pleadings, and title deeds." },
  ];

  const quickFilterPills = [
    'All',
    'Criminal Procedure',
    'Civil Law',
    'Consumer Law',
    'Constitutional Law',
    'Family Law',
    'Citizen Rights',
    'Legal Documents',
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 relative min-h-[85vh]">
      <div className="absolute top-0 right-1/4 w-[350px] h-[350px] bg-indigo-600/5 rounded-full blur-[90px] pointer-events-none" />

      {/* Header Banner */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
          <Sparkles size={13} />
          Statutory Reference & Legal Knowledge Base
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-white flex items-center justify-center gap-3">
          <FileSearch className="text-indigo-400" size={34} />
          Search Legal Information & Research
        </h1>
        
        <p className="text-slate-400 text-xs md:text-sm max-w-xl mx-auto">
          Search codified laws, statutory provisions, procedural timelines, court jurisdictions, and legal terminology.
        </p>
      </div>

      {/* Main Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto mb-6 shadow-2xl">
        <SearchIcon className="absolute left-5 top-4 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search legal terms, sections, acts, or topics (e.g., Bail, Section 438, Consumer, FIR)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-14 pr-32 py-4 bg-slate-900 border-2 border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm md:text-base shadow-inner transition-all hover:border-slate-700"
        />
        <button
          type="submit"
          className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors text-sm flex items-center gap-1.5"
        >
          Search
        </button>
      </form>

      {/* Quick Filter Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto mb-10">
        {quickFilterPills.map((pill) => {
          const isActive = selectedCategory === pill;
          return (
            <button
              key={pill}
              onClick={() => {
                setSelectedCategory(pill);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
                isActive
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {pill}
            </button>
          );
        })}
      </div>

      {/* If No Query & Category is All, Show Popular Categories */}
      {!queryParam && selectedCategory === 'All' && (
        <div className="space-y-6 mb-12 animate-fadeIn">
          <h2 className="text-base font-bold text-slate-300 text-center uppercase tracking-wider">
            Explore Legal Domains
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat, idx) => (
              <div
                key={idx}
                className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 hover:border-indigo-500/40 transition-all cursor-pointer group hover:bg-slate-900/70"
                onClick={() => {
                  setQuery(cat.title);
                  setSearchParams({ q: cat.title });
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-indigo-500/20">
                  {cat.icon}
                </div>
                <h3 className="font-bold text-white mb-1.5 text-sm">{cat.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{cat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Section */}
      <div className="space-y-6 animate-fadeIn">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Layers size={14} className="text-indigo-400" />
            {queryParam ? `Search Results for "${queryParam}"` : `Showing ${selectedCategory} Provisions`}
            <span className="text-slate-600 font-normal">({filteredConcepts.length} items)</span>
          </h3>

          {(queryParam || selectedCategory !== 'All') && (
            <button
              onClick={() => {
                setQuery('');
                setSelectedCategory('All');
                setSearchParams({});
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>

        {filteredConcepts.length > 0 ? (
          <div className="space-y-6">
            {filteredConcepts.map((concept: LegalConcept) => (
              <div
                key={concept.id}
                className="bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-xl transition-all space-y-6"
              >
                {/* Header of the Card */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-950 text-indigo-400 border border-indigo-500/20">
                        {concept.category}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-950 text-slate-400 border border-slate-800">
                        {concept.relatedTopic}
                      </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-extrabold text-white">{concept.term}</h2>
                  </div>

                  {concept.statutorySection && (
                    <span className="px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
                      <Landmark size={13} /> {concept.statutorySection}
                    </span>
                  )}
                </div>

                {/* Meaning / Explanation */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Legal Summary & Definition
                  </h4>
                  <p className="text-slate-200 text-xs md:text-sm leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                    {concept.simpleMeaning}
                  </p>
                </div>

                {/* STATUTORY & PROCEDURAL REFERENCE BLOCK */}
                {(concept.governingAct || concept.jurisdictionForum || concept.limitationPeriod || concept.keyPrecedent) && (
                  <div className="bg-gradient-to-br from-indigo-950/30 via-slate-950/80 to-purple-950/30 border border-indigo-500/30 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                      <Scale size={15} /> Statutory & Procedural Reference
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      {concept.governingAct && (
                        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                          <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <Landmark size={12} className="text-indigo-400" /> Governing Act
                          </span>
                          <p className="text-slate-200 font-semibold">{concept.governingAct}</p>
                        </div>
                      )}

                      {concept.jurisdictionForum && (
                        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                          <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <MapPin size={12} className="text-emerald-400" /> Court Jurisdiction / Forum
                          </span>
                          <p className="text-slate-200 font-semibold">{concept.jurisdictionForum}</p>
                        </div>
                      )}

                      {concept.limitationPeriod && (
                        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                          <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <Clock size={12} className="text-amber-400" /> Statutory Limitation / Timeline
                          </span>
                          <p className="text-amber-200/90 font-semibold">{concept.limitationPeriod}</p>
                        </div>
                      )}

                      {concept.keyPrecedent && (
                        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                          <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <Gavel size={12} className="text-purple-400" /> Landmark Precedent
                          </span>
                          <p className="text-purple-200/90 font-semibold italic">{concept.keyPrecedent}</p>
                        </div>
                      )}
                    </div>

                    {concept.draftingNote && (
                      <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-1 text-xs">
                        <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                          <FileEdit size={12} className="text-blue-400" /> Pleading & Drafting Note
                        </span>
                        <p className="text-slate-300 leading-relaxed text-xs">{concept.draftingNote}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Related Terms */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Related Legal Terms
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {concept.relatedTerms.map((term, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setQuery(term);
                          setSearchParams({ q: term });
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-indigo-600 rounded-lg text-[11px] font-medium text-slate-300 hover:text-white transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Important Note */}
                {concept.importantNote && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
                    <ShieldAlert className="text-amber-400 flex-shrink-0" size={18} />
                    <div>
                      <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">
                        Important Practical Note
                      </h4>
                      <p className="text-xs text-amber-200/90 leading-relaxed">{concept.importantNote}</p>
                    </div>
                  </div>
                )}

                {/* Action footer tailored by role */}
                <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {user?.role === 'advocate' ? (
                    <>
                      <p className="text-xs text-slate-400 text-center sm:text-left">
                        Need to prepare a court proforma or complaint proforma for your client?
                      </p>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Link
                          to="/documents"
                          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
                        >
                          <FileText size={13} /> Generate Document Proforma
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-slate-400 text-center sm:text-left">
                        Need guidance on how this applies to your situation or looking for counsel?
                      </p>
                      <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                        <Link
                          to="/assessment"
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
                        >
                          Legal Assessment <ArrowRight size={13} />
                        </Link>
                        <Link
                          to="/advocates"
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                        >
                          Find Advocate
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-900/40 border border-slate-800 rounded-3xl">
            <Book className="mx-auto text-slate-600 mb-3" size={44} />
            <h3 className="text-base font-bold text-white mb-1">No exact definitions found</h3>
            <p className="text-slate-400 text-xs max-w-sm mx-auto mb-5">
              We couldn't find a direct match for "{queryParam}". Try searching for related legal terms or statutory provisions.
            </p>
            <button
              onClick={() => {
                setQuery('');
                setSelectedCategory('All');
                setSearchParams({});
              }}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              View All Domains
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

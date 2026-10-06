import { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { FileText, Download, Clock, ArrowRight, Loader2, Inbox, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import LegalDocumentPreview, { DocumentData } from '../components/LegalDocumentPreview.js';

export default function MyDocuments() {
  const [previewDoc, setPreviewDoc] = useState<DocumentData | null>(null);
  const { data: userDocs, isLoading } = trpc.templates.listUserDocuments.useQuery();
  const { data: templates } = trpc.templates.list.useQuery();

  const categoryColors: Record<string, string> = {
    rti: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    consumer: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    agreement: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 relative">
      <div className="absolute top-10 right-10 w-[300px] h-[300px] bg-amber-600/5 rounded-full blur-[100px] pointer-events-none" />

      {previewDoc ? (
        <LegalDocumentPreview
          document={previewDoc}
          onBack={() => setPreviewDoc(null)}
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10">
            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
                <FileText className="text-amber-400" /> My Legal Documents
              </h1>
              <p className="text-slate-400 text-sm">All documents you have generated using Themis templates.</p>
            </div>
            <Link
              to="/documents"
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
            >
              Generate New <ArrowRight size={14} />
            </Link>
          </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="animate-spin text-amber-500" size={32} />
        </div>
      ) : userDocs && userDocs.length > 0 ? (
        <div className="space-y-4">
          {userDocs.map((doc) => {
            const cat = doc.template?.category || 'general';
            const colorClass = categoryColors[cat] || 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
            return (
              <div
                key={doc.id}
                className="bg-slate-900/40 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorClass}`}>
                    <FileText size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{doc.template?.title}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${colorClass}`}>
                        {cat}
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(doc.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewDoc({
                      title: doc.template?.title || 'Legal Document',
                      category: doc.template?.category || 'general',
                      filledData: doc.filledData as any,
                      date: doc.createdAt as any,
                    })}
                    className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Eye size={13} /> Preview
                  </button>
                  <a
                    href={doc.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Download size={13} /> Text
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-900/20 border border-slate-800/60 rounded-3xl space-y-4">
          <Inbox className="mx-auto text-slate-700" size={48} />
          <div>
            <p className="text-slate-400 font-semibold">No documents generated yet</p>
            <p className="text-slate-600 text-xs mt-1">Use the Document Automation tool to create RTI applications, consumer complaints, and more.</p>
          </div>
          <Link
            to="/documents"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all"
          >
            Start Generating <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Available Templates Preview */}
      {templates && templates.length > 0 && (
        <div className="mt-14 space-y-5">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Available Templates</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {templates.map((t) => (
              <Link
                key={t.id}
                to="/documents"
                className="bg-slate-900/30 hover:bg-slate-900/60 border border-slate-800 hover:border-amber-500/30 rounded-2xl p-4 flex justify-between items-center transition-all"
              >
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase border mb-1.5 ${categoryColors[t.category] || 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'}`}>
                    {t.category}
                  </span>
                  <h4 className="text-sm font-bold text-white">{t.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{t.description}</p>
                </div>
                <ArrowRight size={16} className="text-slate-600 flex-shrink-0 ml-4" />
              </Link>
            ))}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { trpc } from '../utils/trpc.js';
import { useAuth } from '../hooks/useAuth.js';
import {
  FileText,
  Download,
  ArrowLeft,
  Loader2,
  Sparkles,
  Eye,
  UserCheck,
  FolderOpen,
  Briefcase,
  Check,
} from 'lucide-react';
import LegalDocumentPreview, { DocumentData } from '../components/LegalDocumentPreview.js';
import DocumentOCRScanner from '../components/DocumentOCRScanner.js';

export default function Documents() {
  const { user } = useAuth();
  const isAdvocate = user?.role === 'advocate';

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [previewDoc, setPreviewDoc] = useState<DocumentData | null>(null);

  // Advocate-specific state
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // Queries
  const { data: templates, isLoading: loadingTemplates } = trpc.templates.list.useQuery();
  const { data: userDocs, refetch: refetchUserDocs } = trpc.templates.listUserDocuments.useQuery();

  // Advocate connected clients query
  const { data: connectedClients } = trpc.connections.getConnectedClients.useQuery(undefined, {
    enabled: isAdvocate,
  });

  // Mutations
  const generateMutation = trpc.templates.generate.useMutation();

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplateId(template.id);
    setPreviewDoc(null);

    // Initial pre-fill
    const initialData: Record<string, string> = {};
    
    // If advocate has a selected client, prefill client name
    if (isAdvocate && selectedClientId) {
      const selectedClient = connectedClients?.find((c) => c.citizenId === selectedClientId);
      if (selectedClient?.citizen?.name) {
        if (template.category === 'rti') {
          initialData['applicantName'] = selectedClient.citizen.name;
        } else if (template.category === 'consumer') {
          initialData['complainantName'] = selectedClient.citizen.name;
        }
      }
    } else if (!isAdvocate && user?.name) {
      // Citizen's own name
      if (template.category === 'rti') {
        initialData['applicantName'] = user.name;
      } else if (template.category === 'consumer') {
        initialData['complainantName'] = user.name;
      }
    }

    setFormData(initialData);
  };

  // When advocate changes the client in the dropdown
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const selectedClient = connectedClients?.find((c) => c.citizenId === clientId);
    if (selectedClient) {
      setSelectedCaseId(selectedClient.caseId || '');
      // Update form data if template is already active
      if (selectedClient.citizen?.name) {
        setFormData((prev) => ({
          ...prev,
          applicantName: selectedClient.citizen.name,
          complainantName: selectedClient.citizen.name,
        }));
      }
    } else {
      setSelectedCaseId('');
    }
  };

  const handleInputChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleApplyOCR = (_extractedText: string, smartFields?: Record<string, string>) => {
    if (!smartFields) return;
    setFormData((prev) => ({
      ...prev,
      ...smartFields,
    }));
  };

  const currentTemplate = templates?.find((t) => t.id === selectedTemplateId);
  const activeClientObj = connectedClients?.find((c) => c.citizenId === selectedClientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId || !currentTemplate) return;

    try {
      const result = await generateMutation.mutateAsync({
        templateId: selectedTemplateId,
        filledData: formData,
        caseId: isAdvocate && selectedCaseId ? selectedCaseId : undefined,
      });

      // Show Professional Document Preview immediately
      setPreviewDoc({
        title: currentTemplate.title,
        category: currentTemplate.category,
        filledData: formData,
        compiledText: result.compiledText,
        caseInfo: result.attachedToCase && activeClientObj?.case ? {
          id: activeClientObj.case.id,
          title: activeClientObj.case.title,
        } : undefined,
      });
      refetchUserDocs();
    } catch (err) {
      alert('Error generating document. Please try again.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 relative min-h-[85vh]">
      <div className="absolute top-10 left-10 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[90px] pointer-events-none" />

      {/* Dynamic Header based on Role */}
      {!previewDoc && (
        <div className="space-y-3 mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            {isAdvocate ? (
              <>
                <Briefcase size={13} />
                Advocate Client Document Management & Drafting
              </>
            ) : (
              <>
                <Sparkles size={13} />
                Citizen Legal Document Automation
              </>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-white flex items-center justify-center gap-2.5">
            <FileText className="text-amber-400" size={32} />
            {isAdvocate ? 'Legal Document Management' : 'Document Automation'}
          </h1>

          <p className="text-slate-400 text-xs md:text-sm max-w-xl mx-auto">
            {isAdvocate
              ? 'Draft and file formal court proformas, Consumer complaints, and RTI applications directly for your represented clients and attach them to their active cases.'
              : 'Generate official RTI applications, Consumer Forum notices, and complaint drafts with interactive proforma preview & PDF download.'}
          </p>
        </div>
      )}

      {/* ADVOCATE ONLY: Client & Case Selection Card */}
      {isAdvocate && !previewDoc && (
        <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/40 border border-indigo-500/30 p-6 rounded-3xl mb-8 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <UserCheck size={16} className="text-indigo-400" />
              1. Select Represented Client
            </div>
            {activeClientObj && (
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                <Check size={12} /> Representation Linked
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Connected Client & Case
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Independent / Direct Counsel Draft (No linked case) --</option>
                {connectedClients?.map((conn) => (
                  <option key={conn.id} value={conn.citizenId}>
                    {conn.citizen?.name} — Case: {conn.case?.title || 'General File'}
                  </option>
                ))}
              </select>
            </div>

            {/* Display active client representation details */}
            {activeClientObj ? (
              <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-2xl text-xs space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Client & Case Profile
                </span>
                <p className="font-bold text-slate-200">{activeClientObj.citizen?.name} ({activeClientObj.citizen?.email})</p>
                {activeClientObj.case && (
                  <p className="text-[11px] text-indigo-300 flex items-center gap-1">
                    <FolderOpen size={12} /> Case: <strong>{activeClientObj.case.title}</strong>
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-2xl text-xs text-slate-500">
                Select a connected client from your accepted roster to auto-fill their case facts and save the draft directly into their case file.
              </div>
            )}
          </div>
        </div>
      )}

      {/* View switching */}
      {previewDoc ? (
        // PROFESSIONAL LEGAL DOCUMENT PREVIEW
        <LegalDocumentPreview
          document={previewDoc}
          onBack={() => {
            setPreviewDoc(null);
          }}
        />
      ) : selectedTemplateId && currentTemplate ? (
        // DYNAMIC QUESTIONNAIRE FORM
        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl backdrop-blur-xl shadow-xl space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <button
              onClick={() => setSelectedTemplateId(null)}
              className="flex items-center gap-1 hover:text-slate-300 transition-colors"
            >
              <ArrowLeft size={14} /> Back to Templates
            </button>
            <span className="font-bold text-amber-400 uppercase tracking-wider">
              {currentTemplate.category} template
            </span>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">{currentTemplate.title}</h2>
            <p className="text-slate-400 text-xs mt-1">{currentTemplate.description}</p>
          </div>

          {/* Form Banner if Advocate has selected client */}
          {isAdvocate && activeClientObj && (
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs flex items-center justify-between">
              <span className="text-indigo-300 flex items-center gap-1.5 font-medium">
                <UserCheck size={14} className="text-indigo-400" />
                Drafting on behalf of Client: <strong>{activeClientObj.citizen?.name}</strong>
              </span>
              {activeClientObj.case && (
                <span className="text-slate-400 text-[11px]">
                  Will automatically attach to case: <strong>{activeClientObj.case.title}</strong>
                </span>
              )}
            </div>
          )}

          {/* OCR Document Scanner & Extractor */}
          <div className="pt-2">
            <DocumentOCRScanner onApplyText={handleApplyOCR} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 border-t border-slate-800/80 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(currentTemplate.fieldsSchema as any[]).map((field) => (
                <div
                  key={field.name}
                  className={field.type === 'textarea' ? 'md:col-span-2' : ''}
                >
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                    {field.label}
                  </label>

                  {field.type === 'select' ? (
                    <select
                      required
                      value={formData[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      className="w-full px-3 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 text-sm"
                    >
                      <option value="">-- Select Option --</option>
                      {field.options?.map((opt: string) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      required
                      rows={4}
                      value={formData[field.name] || ''}
                      placeholder={field.placeholder}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      className="w-full px-3 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                    />
                  ) : (
                    <input
                      type="text"
                      required
                      value={formData[field.name] || ''}
                      placeholder={field.placeholder}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      className="w-full px-3 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex justify-end">
              <button
                type="submit"
                disabled={generateMutation.isPending}
                className="w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Generating Document...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> {isAdvocate && selectedCaseId ? 'Generate & Save to Client Case' : 'Generate Document Draft'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        // TEMPLATES LIST GRID
        <div className="space-y-12">
          {loadingTemplates ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-amber-500" size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates?.map((tpl) => (
                <div
                  key={tpl.id}
                  className="glow-card gold-glow p-6 rounded-3xl flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {tpl.category} proforma
                    </span>
                    <h3 className="text-lg font-bold text-white">{tpl.title}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">{tpl.description}</p>
                  </div>
                  <button
                    onClick={() => handleSelectTemplate(tpl)}
                    className="mt-6 w-full py-2.5 bg-slate-950/80 hover:bg-amber-500 hover:text-slate-950 border border-slate-800 hover:border-transparent text-slate-300 font-semibold rounded-xl text-xs transition-all"
                  >
                    {isAdvocate ? 'Draft Proforma for Client' : 'Select Template'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* User's History of Generated Documents */}
          {userDocs && userDocs.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                {isAdvocate ? `Client Documents Drafted by You (${userDocs.length})` : `Your Generated Documents (${userDocs.length})`}
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {userDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex justify-between items-center bg-slate-900/30 border border-slate-800/80 hover:border-slate-800 p-4 rounded-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                        <FileText size={17} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{doc.template?.title}</h4>
                        <span className="text-[10px] text-slate-500">
                          Drafted on {new Date(doc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
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
                        className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                      >
                        <Eye size={12} /> Preview Proforma
                      </button>
                      <a
                        href={`http://localhost:4000${doc.filePath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                      >
                        <Download size={12} /> Raw .TXT
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

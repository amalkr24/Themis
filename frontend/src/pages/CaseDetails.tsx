import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { trpc } from '../utils/trpc.js';
import { useAuth } from '../hooks/useAuth.js';
import { Calendar, FileText, ArrowLeft, Plus, Download, Loader2, Video, Clock, Trash2, Scale } from 'lucide-react';

export default function CaseDetails() {
  const { id } = useParams<{ id: string }>();
  const auth = useAuth();

  const [hearingDate, setHearingDate] = useState('');
  const [hearingNotes, setHearingNotes] = useState('');
  const [showHearingForm, setShowHearingForm] = useState(false);

  const [docTitle, setDocTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showDocForm, setShowDocForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Queries
  const { data: caseItem, isLoading, refetch } = trpc.cases.getDetails.useQuery({
    id: id || '',
  });

  const { data: approvedAdvocates } = trpc.advocates.listApproved.useQuery(undefined, {
    enabled: auth.user?.role === 'admin',
  });

  const { data: caseConsultations } = trpc.consultations.listForCase.useQuery(
    { caseId: id || '' },
    { enabled: !!id }
  );

  // Mutations
  const addHearingMutation = trpc.cases.addHearing.useMutation();
  const addDocMutation = trpc.cases.addDocument.useMutation();
  const updateStatusMutation = trpc.cases.updateStatus.useMutation();
  const assignAdvocateMutation = trpc.cases.assignAdvocate.useMutation();
  const startConsultationMutation = trpc.consultations.createSession.useMutation();
  const deleteHearingMutation = trpc.cases.deleteHearing.useMutation();
  const deleteDocumentMutation = trpc.cases.deleteDocument.useMutation();
  const deleteCaseMutation = trpc.cases.deleteCase.useMutation();

  const navigate = useNavigate();
  const [isStartingConsultation, setIsStartingConsultation] = useState(false);

  const handleDeleteHearing = async (hearingId: string) => {
    if (!window.confirm('Are you sure you want to remove this scheduled hearing?')) return;
    try {
      await deleteHearingMutation.mutateAsync({ hearingId });
      refetch();
    } catch (err: any) {
      alert(err.message || 'Error deleting hearing');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this case document?')) return;
    try {
      await deleteDocumentMutation.mutateAsync({ documentId });
      refetch();
    } catch (err: any) {
      alert(err.message || 'Error deleting document');
    }
  };

  const handleDeleteCase = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this entire case file? This action cannot be undone.')) return;
    try {
      await deleteCaseMutation.mutateAsync({ caseId: id });
      alert('Case file deleted successfully.');
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Error deleting case file');
    }
  };

  const handleStartConsultation = async () => {
    if (!caseItem) return;
    const targetUserId =
      auth.user?.role === 'advocate' ? caseItem.citizenId : caseItem.advocateId;
    if (!targetUserId) {
      alert('Cannot start consultation: No counterpart user assigned to this case yet.');
      return;
    }

    setIsStartingConsultation(true);
    try {
      const session = await startConsultationMutation.mutateAsync({
        targetUserId,
        caseId: caseItem.id,
        title: `Case Consultation: ${caseItem.title}`,
      });
      navigate(`/consultation/${session.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to start video consultation.');
    } finally {
      setIsStartingConsultation(false);
    }
  };

  const handleAddHearing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      // Format to ISO String
      const isoDate = new Date(hearingDate).toISOString();
      await addHearingMutation.mutateAsync({
        caseId: id,
        hearingDate: isoDate,
        notes: hearingNotes,
      });
      setShowHearingForm(false);
      setHearingDate('');
      setHearingNotes('');
      refetch();
    } catch (err) {
      alert('Error scheduling hearing. Ensure date format is correct.');
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    try {
      const uForm = new FormData();
      uForm.append('file', selectedFile);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: uForm,
      });

      if (!uploadRes.ok) {
        const errJson = await uploadRes.json();
        throw new Error(errJson.error || 'Upload failed');
      }

      const uploadData = await uploadRes.json();

      await addDocMutation.mutateAsync({
        caseId: id,
        title: docTitle,
        filePath: uploadData.filePath,
        fileType: uploadData.fileType,
        fileSize: uploadData.fileSize,
      });

      setShowDocForm(false);
      setDocTitle('');
      setSelectedFile(null);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Error uploading document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStatusChange = async (status: 'pending' | 'active' | 'closed') => {
    if (!id) return;
    try {
      await updateStatusMutation.mutateAsync({
        caseId: id,
        status,
      });
      refetch();
    } catch (err) {
      alert('Error updating case status.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  if (!caseItem) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <h2 className="text-xl font-bold text-white">Case Not Found</h2>
        <p className="text-slate-400 mt-2">You might not have authorization to view this file.</p>
        <Link to="/dashboard" className="inline-block mt-4 text-indigo-400 font-semibold hover:text-indigo-300">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 relative">
      <div className="absolute top-10 right-10 w-[300px] h-[300px] bg-indigo-600/5 rounded-full blur-[90px] pointer-events-none" />

      {/* Navigation */}
      <div className="flex justify-between items-center text-xs">
        <Link to="/dashboard" className="flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          {auth.user?.role === 'admin' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Status Control:</span>
              <select
                value={caseItem.status}
                onChange={(e) => handleStatusChange(e.target.value as any)}
                className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-indigo-500 text-xs"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          )}

          {(auth.user?.role === 'admin' || auth.user?.id === caseItem.citizenId) && (
            <button
              onClick={handleDeleteCase}
              className="flex items-center gap-1 text-rose-400 hover:text-rose-300 text-xs font-semibold px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-all"
              title="Delete Case File"
            >
              <Trash2 size={13} /> Delete Case
            </button>
          )}
        </div>
      </div>

      {/* Main Details Panel */}
      <div className="neo-card p-6 md:p-8 space-y-6">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <span className="inline-block px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider neo-inset-sm text-slate-700 mb-2">
              Category: {caseItem.category}
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-[#111317] leading-snug">{caseItem.title}</h1>
          </div>
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${
              caseItem.status === 'active'
                ? 'bg-[#111317] text-white shadow-sm'
                : caseItem.status === 'closed'
                ? 'neo-card-sm text-slate-500'
                : 'neo-inset-sm text-slate-800'
            }`}
          >
            {caseItem.status}
          </span>
        </div>

        <p className="text-slate-600 text-sm leading-relaxed border-t border-slate-200 pt-5 font-medium">
          {caseItem.description}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 pt-5 text-xs text-slate-500 font-medium">
          <div>
            Client: <strong className="text-[#111317] ml-1">{caseItem.citizen?.name}</strong>
            <span className="block font-normal text-slate-500">({caseItem.citizen?.email})</span>
          </div>

          <div>
            {auth.user?.role === 'admin' ? (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Assign / Reassign Advocate:
                </span>
                <select
                  value={caseItem.advocateId || ''}
                  onChange={async (e) => {
                    const advId = e.target.value;
                    if (!advId || !id) return;
                    try {
                      await assignAdvocateMutation.mutateAsync({ caseId: id, advocateId: advId });
                      refetch();
                    } catch (err: any) {
                      alert(err.message || 'Error assigning advocate');
                    }
                  }}
                  className="w-full px-3 py-1.5 neo-inset rounded-xl text-slate-800 text-xs font-bold focus:outline-none"
                >
                  <option value="">-- Select Approved Advocate --</option>
                  {approvedAdvocates?.map((a) => (
                    <option key={a.id} value={a.userId || a.id}>
                      Adv. {a.user?.name || a.barCouncilNumber} ({a.practiceAreas || a.user?.email})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                Advocate Representation: <strong className="text-[#111317] ml-1">{caseItem.advocate?.name || 'Self-Managed'}</strong>
                <span className="block font-normal text-slate-500">({caseItem.advocate?.email || 'N/A'})</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────── VISUAL CASE TIMELINE STEPPER (SRS FR-6.3) ──────────────── */}
      <div className="neo-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Scale className="text-[#111317]" size={18} />
            <h3 className="text-sm font-bold text-[#111317] uppercase tracking-wider">
              Procedural Case Lifecycle & Milestone Timeline
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Filing Date:{' '}
            <strong className="text-[#111317]">
              {new Date(caseItem.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </strong>
          </span>
        </div>

        {/* Milestone Steps Stepper */}
        {(() => {
          const milestones = [
            {
              step: 1,
              title: 'Case Registration',
              desc: 'Pleading formally filed & registered in docket',
              isCompleted: true,
              date: new Date(caseItem.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            },
            {
              step: 2,
              title: 'Counsel Representation',
              desc: caseItem.advocate ? `Adv. ${caseItem.advocate.name} appointed` : 'Self-represented or pending counsel',
              isCompleted: !!caseItem.advocateId,
              date: caseItem.advocate ? 'Appointed' : 'Pending',
            },
            {
              step: 3,
              title: 'Evidence & Documents',
              desc: `${caseItem.documents?.length || 0} legal documents & proofs lodged`,
              isCompleted: (caseItem.documents?.length || 0) > 0,
              date: (caseItem.documents?.length || 0) > 0 ? `${caseItem.documents.length} Files` : 'Awaiting Proofs',
            },
            {
              step: 4,
              title: 'Hearings & Trial',
              desc: `${caseItem.hearings?.length || 0} court hearings scheduled/held`,
              isCompleted: (caseItem.hearings?.length || 0) > 0,
              date: (caseItem.hearings?.length || 0) > 0 ? `${caseItem.hearings.length} Scheduled` : 'Not Listed Yet',
            },
            {
              step: 5,
              title: 'Final Disposal / Decree',
              desc: caseItem.status === 'closed' ? 'Case disposed / settled' : 'Adjudication in progress',
              isCompleted: caseItem.status === 'closed',
              date: caseItem.status === 'closed' ? 'Closed' : 'Active Trial',
            },
          ];

          const completedCount = milestones.filter((m) => m.isCompleted).length;
          const progressPercent = Math.round((completedCount / milestones.length) * 100);

          return (
            <div className="space-y-6">
              {/* Progress percentage bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Overall Case Progress</span>
                  <span className="text-indigo-400">{progressPercent}% Completed ({completedCount} of 5 Milestones)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Horizontal / Grid milestones */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
                {milestones.map((m) => (
                  <div
                    key={m.step}
                    className={`relative p-3.5 rounded-2xl border transition-all ${
                      m.isCompleted
                        ? 'bg-slate-950/70 border-indigo-500/30 shadow-md shadow-indigo-500/5'
                        : 'bg-slate-950/30 border-slate-800/60 opacity-65'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                          m.isCompleted
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {m.isCompleted ? '✓' : m.step}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">{m.date}</span>
                    </div>

                    <h4 className="text-xs font-bold text-white leading-tight mb-1">{m.title}</h4>
                    <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Hearing and Document Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Hearings Tracker */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <Calendar className="text-indigo-400" size={18} /> Hearing Schedule
            </h3>
            {(auth.user?.role === 'admin' || auth.user?.role === 'advocate') && (
              <button
                onClick={() => setShowHearingForm(!showHearingForm)}
                className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <Plus size={14} /> Schedule Hearing
              </button>
            )}
          </div>

          {showHearingForm && (
            <form onSubmit={handleAddHearing} className="bg-slate-950/60 p-4 border border-slate-800 rounded-2xl space-y-3 animate-fadeIn">
              <h4 className="text-xs font-bold text-amber-400">Schedule New Hearing</h4>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={hearingDate}
                  onChange={(e) => setHearingDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Hearing Notes (e.g. courtroom number)</label>
                <input
                  type="text"
                  value={hearingNotes}
                  onChange={(e) => setHearingNotes(e.target.value)}
                  placeholder="e.g. Present cross-examination records at Hall 3"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>
              <div className="flex justify-end gap-1.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHearingForm(false)}
                  className="px-3 py-1.5 bg-slate-900 hover:text-white text-slate-400 rounded-lg text-[10px] border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addHearingMutation.isLoading}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-semibold"
                >
                  Save Date
                </button>
              </div>
            </form>
          )}

          {caseItem.hearings && caseItem.hearings.length > 0 ? (
            <div className="space-y-4">
              {caseItem.hearings.map((hearing) => (
                <div key={hearing.id} className="flex justify-between items-start p-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl relative group">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        {new Date(hearing.hearingDate).toLocaleString()}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{hearing.notes || 'No description provided.'}</p>
                      <span className="inline-block mt-2 px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-slate-950 text-indigo-400 border border-indigo-500/10">
                        {hearing.status}
                      </span>
                    </div>
                  </div>

                  {(auth.user?.role === 'admin' || auth.user?.role === 'advocate' || auth.user?.id === caseItem.citizenId) && (
                    <button
                      onClick={() => handleDeleteHearing(hearing.id)}
                      className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-500/40 text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                      title="Delete Hearing"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500 text-xs">No hearings scheduled yet.</p>
            </div>
          )}
        </div>

        {/* Secure Document Manager */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <FileText className="text-amber-400" size={18} /> Secure File Repository
            </h3>
            <button
              onClick={() => setShowDocForm(!showDocForm)}
              className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <Plus size={14} /> Upload File
            </button>
          </div>

          {showDocForm && (
            <form onSubmit={handleAddDocument} className="bg-slate-950/60 p-4 border border-slate-800 rounded-2xl space-y-3 animate-fadeIn">
              <h4 className="text-xs font-bold text-amber-400">Upload Secure Dossier Document</h4>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Sales Invoice copy"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Select File (PDF, PNG, JPEG — Max 5MB)
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-500/10 file:text-amber-400 file:text-[10px] file:font-semibold hover:file:bg-amber-500/20 cursor-pointer"
                />
                {selectedFile && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Selected: <span className="text-slate-300">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-1.5 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowDocForm(false); setSelectedFile(null); }}
                  className="px-3 py-1.5 bg-slate-900 hover:text-white text-slate-400 rounded-lg text-[10px] border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || addDocMutation.isLoading}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-bold disabled:opacity-60 flex items-center gap-1"
                >
                  {isUploading ? <><Loader2 size={12} className="animate-spin" /> Uploading...</> : 'Upload & Save'}
                </button>
              </div>
            </form>
          )}

          {caseItem.documents && caseItem.documents.length > 0 ? (
            <div className="space-y-3">
              {caseItem.documents.map((doc) => (
                <div key={doc.id} className="flex justify-between items-center p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-xl group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <FileText size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{doc.title}</h4>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB | {doc.fileType.split('/')[1]?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={doc.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={doc.title}
                      className="p-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="Download Document"
                    >
                      <Download size={14} />
                    </a>
                    {(auth.user?.role === 'admin' || auth.user?.id === doc.uploaderId || auth.user?.id === caseItem.citizenId || auth.user?.id === caseItem.advocateId) && (
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1.5 bg-slate-950 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-500/40 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500 text-xs">No documents uploaded to this case file.</p>
            </div>
          )}
        </div>
      </div>

      {/* Virtual Legal Aid & Video Consultation Section */}
      <div className="bg-gradient-to-br from-indigo-950/30 via-slate-900/40 to-slate-900/40 border border-indigo-500/20 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Video size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {auth.user?.role === 'admin' ? 'Counsel Consultation Records & Case Minutes' : 'Virtual Video Consultations & Briefings'}
                </h3>
                <p className="text-xs text-slate-400">
                  {auth.user?.role === 'admin'
                    ? 'Audit logs and recorded counsel minutes from online sessions held between client and advocate'
                    : 'Encrypted real-time online consultation room with split-screen case companion'}
                </p>
              </div>
            </div>
          </div>
          {/* Only citizen & assigned advocate can start video consultation */}
          {auth.user?.role !== 'admin' && (auth.user?.role === 'advocate' || (auth.user?.role === 'citizen' && caseItem.advocateId)) && (
            <button
              onClick={handleStartConsultation}
              disabled={isStartingConsultation || startConsultationMutation.isLoading}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              {isStartingConsultation ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Launching Room...
                </>
              ) : (
                <>
                  <Video size={14} /> Start Video Consultation
                </>
              )}
            </button>
          )}
        </div>

        {caseConsultations && caseConsultations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {caseConsultations.map((session) => (
              <div
                key={session.id}
                className="bg-slate-950/60 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-white line-clamp-1">{session.title}</h4>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                      <Clock size={10} /> {new Date(session.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      session.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse'
                        : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                    }`}
                  >
                    {session.status}
                  </span>
                </div>

                {session.sessionNotes && (
                  <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-300">
                    <span className="font-semibold text-indigo-400 block text-[9px] uppercase tracking-wider mb-1">Counsel Minutes / Notes:</span>
                    <p className="line-clamp-2">{session.sessionNotes}</p>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-slate-800/80 text-[10px]">
                  <span className="text-slate-400">
                    Counsel: <strong className="text-slate-200">{session.advocate?.name || 'Advocate'}</strong>
                  </span>
                  {session.status === 'active' ? (
                    <Link
                      to={`/consultation/${session.id}`}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all"
                    >
                      Join Room &rarr;
                    </Link>
                  ) : (
                    <Link
                      to={`/consultation/${session.id}`}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-all"
                    >
                      View Record
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-slate-800/80 rounded-2xl bg-slate-950/20">
            <p className="text-xs text-slate-500">No consultation sessions held for this case yet.</p>
            <p className="text-[11px] text-slate-600 mt-1">Start a video session to discuss strategy, review filings, or record meeting minutes directly into this case file.</p>
          </div>
        )}
      </div>
    </div>
  );
}

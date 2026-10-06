import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { trpc } from '../utils/trpc.js';
import { useAuth } from '../hooks/useAuth.js';
import {
  Send,
  Paperclip,
  FolderOpen,
  Users,
  Search,
  Download,
  Loader2,
  FileText,
  X,
  Video,
  Sparkles,
  MessageSquare,
  Trash2,
  Plus,
  PhoneCall,
} from 'lucide-react';

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetUserIdParam = searchParams.get('user');

  const [selectedUserId, setSelectedUserId] = useState<string | null>(targetUserIdParam);
  const [messageInput, setMessageInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [isStartingCall, setIsStartingCall] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: conversations, refetch: refetchConversations, isLoading: loadingConversations } =
    trpc.messages.listConversations.useQuery(undefined, {
      refetchInterval: 3000,
    });

  // If a target user is selected but not yet in existing conversations, fetch their profile
  const { data: recipientData } = trpc.messages.getRecipient.useQuery(
    { userId: selectedUserId || '' },
    { enabled: !!selectedUserId && !conversations?.some((c) => c.user?.id === selectedUserId) }
  );

  const { data: activeMessages, refetch: refetchMessages, isLoading: loadingMessages } =
    trpc.messages.getConversation.useQuery(
      { targetUserId: selectedUserId || '' },
      { enabled: !!selectedUserId, refetchInterval: 2500 }
    );

  const { data: availableContacts, isLoading: loadingContacts } = trpc.messages.listAvailableContacts.useQuery(
    undefined,
    { enabled: showNewChatModal }
  );

  // Mutations
  const sendMutation = trpc.messages.sendMessage.useMutation();
  const clearConversationMutation = trpc.messages.clearConversation.useMutation();
  const createConsultationMutation = trpc.consultations.createSession.useMutation();

  const handleClearChat = async () => {
    if (!selectedUserId) return;
    if (!window.confirm('Are you sure you want to clear this entire conversation history? This will delete all messages in this chat.')) return;
    try {
      await clearConversationMutation.mutateAsync({ targetUserId: selectedUserId });
      refetchMessages();
      refetchConversations();
    } catch (err: any) {
      alert(err.message || 'Error clearing conversation');
    }
  };

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!selectedUserId && conversations && conversations.length > 0) {
      const first = conversations[0].user?.id;
      if (first) {
        setSelectedUserId(first);
        setSearchParams({ user: first });
      }
    }
  }, [conversations, selectedUserId, setSearchParams]);

  // Sync searchParam changes
  useEffect(() => {
    if (targetUserIdParam && targetUserIdParam !== selectedUserId) {
      setSelectedUserId(targetUserIdParam);
    }
  }, [targetUserIdParam, selectedUserId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  const handleSelectUser = (id: string) => {
    setSelectedUserId(id);
    setSearchParams({ user: id });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageInput.trim() && !selectedFile) || !selectedUserId) return;

    let attachmentUrl: string | undefined;
    let attachmentName: string | undefined;
    let attachmentType: string | undefined;

    if (selectedFile) {
      setIsUploading(true);
      try {
        const uForm = new FormData();
        uForm.append('file', selectedFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uForm,
        });

        if (!uploadRes.ok) {
          throw new Error('Upload failed');
        }

        const uploadData = await uploadRes.json();
        attachmentUrl = uploadData.filePath;
        attachmentName = uploadData.fileName;
        attachmentType = uploadData.fileType;
      } catch (err: any) {
        alert(err.message || 'File upload failed');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    try {
      await sendMutation.mutateAsync({
        receiverId: selectedUserId,
        content: messageInput.trim() || (selectedFile ? `Shared a file: ${selectedFile.name}` : 'Message'),
        attachmentUrl,
        attachmentName,
        attachmentType,
      });

      setMessageInput('');
      setSelectedFile(null);
      refetchMessages();
      refetchConversations();
    } catch (err: any) {
      alert(err.message || 'Failed to send message.');
    }
  };

  // Find currently active chat user details
  const activeConversation = conversations?.find((c) => c.user?.id === selectedUserId);
  const activeUser = activeConversation?.user || recipientData;
  const activeCase = activeConversation?.case || recipientData?.case;

  // Start live video consultation directly from chat
  const handleStartVideoCall = async () => {
    if (!selectedUserId || !activeUser) return;
    setIsStartingCall(true);
    try {
      const isAdv = user?.role === 'advocate';
      const callerTitle = isAdv ? `Adv. ${user?.name}` : user?.name;
      const callTitle = `Legal Consultation: ${callerTitle} & ${activeUser.name}`;

      const session = await createConsultationMutation.mutateAsync({
        targetUserId: selectedUserId,
        caseId: activeCase?.id || undefined,
        title: callTitle,
      });

      // Post invite notification directly in the chat stream
      try {
        await sendMutation.mutateAsync({
          receiverId: selectedUserId,
          content: `🎥 Launched live video consultation: ${callTitle}. Join session: /consultation/${session.id}`,
        });
        refetchMessages();
        refetchConversations();
      } catch (e) {
        console.warn('Failed to send call link in chat:', e);
      }

      navigate(`/consultation/${session.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to start video call');
    } finally {
      setIsStartingCall(false);
    }
  };

  const filteredConversations = conversations?.filter((c) => {
    const name = c.user?.name || '';
    const email = c.user?.email || '';
    return (
      name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      email.toLowerCase().includes(searchFilter.toLowerCase())
    );
  });

  const filteredContacts = availableContacts?.filter((c) => {
    const name = (c.name || '').toLowerCase();
    const email = (c.email || '').toLowerCase();
    const q = contactSearch.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[75vh] max-h-[82vh]">
        {/* ========================================================================= */}
        {/* ───────────────────── LEFT: CONVERSATION THREADS ──────────────────────── */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 neo-card rounded-3xl p-4 flex flex-col shadow-xl overflow-hidden">
          <div className="pb-4 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-[#111317] flex items-center gap-2">
                <MessageSquare className="text-black" size={18} /> Client & Counsel Messages
              </h2>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="p-2 neo-btn-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 transition-transform"
                title="Start New Chat"
              >
                <Plus size={14} /> New Chat
              </button>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 neo-inset-sm rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto space-y-2 pt-3 pr-1">
            {loadingConversations ? (
              <div className="text-center py-12">
                <Loader2 className="animate-spin text-black mx-auto" size={24} />
              </div>
            ) : filteredConversations && filteredConversations.length > 0 ? (
              filteredConversations.map((c) => {
                const isSelected = c.user?.id === selectedUserId;
                const isAdv = c.user?.role === 'advocate';
                return (
                  <button
                    key={c.user?.id}
                    onClick={() => handleSelectUser(c.user?.id)}
                    className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'neo-card-sm border-black/20 ring-2 ring-black/10'
                        : 'neo-card-sm hover:opacity-100 opacity-90'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl neo-inset-sm text-slate-900 font-black flex items-center justify-center text-sm shadow">
                        {c.user?.name?.charAt(0) || 'U'}
                      </div>
                      {c.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-black text-white rounded-full text-[9px] font-black flex items-center justify-center ring-2 ring-white animate-pulse">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="font-bold text-[#111317] text-xs truncate">
                          {isAdv ? `Adv. ${c.user?.name}` : c.user?.name}
                        </h4>
                        <span className="text-[9px] uppercase font-bold text-slate-500">
                          {c.user?.role}
                        </span>
                      </div>

                      {c.case && (
                        <span className="inline-block text-[10px] text-slate-700 font-semibold truncate max-w-[200px]">
                          📁 {c.case.title}
                        </span>
                      )}

                      {c.lastMessage && (
                        <p className="text-[11px] text-slate-600 truncate mt-0.5 font-medium">
                          {c.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-12 text-slate-500 space-y-3">
                <Users size={32} className="mx-auto text-slate-400" />
                <p className="text-xs font-bold text-slate-700">No active conversations yet</p>
                <p className="text-[11px] text-slate-500 max-w-[220px] mx-auto">
                  Start a new chat with an advocate or client to begin messaging.
                </p>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="px-4 py-2 neo-btn-black text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus size={13} /> Start New Chat
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ───────────────────── RIGHT: LIVE CONVERSATION STREAM ─────────────────── */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 neo-card rounded-3xl p-5 flex flex-col shadow-xl overflow-hidden">
          {selectedUserId && activeUser ? (
            <>
              {/* Header */}
              <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl neo-inset-sm text-slate-900 font-black flex items-center justify-center text-base">
                    {activeUser.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[#111317] text-sm">
                        {activeUser.role === 'advocate' ? `Adv. ${activeUser.name}` : activeUser.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase neo-card-sm text-slate-700">
                        {activeUser.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{activeUser.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {activeCase && (
                    <Link
                      to={`/cases/${activeCase.id}`}
                      className="px-3 py-1.5 neo-btn text-slate-700 hover:text-black rounded-xl flex items-center gap-1.5 transition-all font-semibold"
                    >
                      <FolderOpen size={13} className="text-black" /> Case Dossier
                    </Link>
                  )}
                  {/* Real Live Video Consultation launcher */}
                  <button
                    onClick={handleStartVideoCall}
                    disabled={isStartingCall || createConsultationMutation.isPending}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl flex items-center gap-1.5 transition-all font-bold shadow-md cursor-pointer disabled:opacity-50"
                    title="Launch live video consultation chamber with this participant"
                  >
                    {isStartingCall ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Video size={13} />
                    )}
                    <span>Video Call</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearChat}
                    disabled={clearConversationMutation.isPending || !activeMessages?.length}
                    className="px-3 py-1.5 neo-btn text-slate-600 hover:text-rose-600 rounded-xl flex items-center gap-1.5 transition-all font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Clear Conversation History"
                  >
                    <Trash2 size={13} /> Clear
                  </button>
                </div>
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
                {loadingMessages ? (
                  <div className="text-center py-20">
                    <Loader2 className="animate-spin text-black mx-auto" size={28} />
                  </div>
                ) : activeMessages && activeMessages.length > 0 ? (
                  activeMessages.map((msg) => {
                    const isMe = msg.senderId === user?.id;
                    const isConsultationInvite = msg.content.includes('/consultation/');
                    let consultationRoomId = '';
                    if (isConsultationInvite) {
                      const match = msg.content.match(/\/consultation\/([a-zA-Z0-9-]+)/);
                      if (match && match[1]) consultationRoomId = match[1];
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        <div
                          className={`max-w-[80%] md:max-w-[70%] p-3.5 rounded-2xl text-xs space-y-2 leading-relaxed ${
                            isMe
                              ? 'neo-btn-black text-white rounded-tr-none shadow-md'
                              : 'neo-card-sm text-slate-900 rounded-tl-none'
                          }`}
                        >
                          {/* If message is a consultation invite, render special action card */}
                          {isConsultationInvite ? (
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                                  <Video size={15} />
                                </div>
                                <span className="font-bold">Virtual Video Consultation Launched</span>
                              </div>
                              <p className="text-[11px] opacity-90">{msg.content}</p>
                              {consultationRoomId && (
                                <Link
                                  to={`/consultation/${consultationRoomId}`}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] shadow-sm transition-all"
                                >
                                  <PhoneCall size={12} /> Enter Consultation Room &rarr;
                                </Link>
                              )}
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          )}

                          {/* Attachment Display */}
                          {msg.attachmentUrl && (
                            <div className="pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-3 bg-black/5 dark:bg-black/20 p-2 rounded-xl">
                              <div className="flex items-center gap-2 truncate">
                                <FileText size={15} className="text-[#111317] flex-shrink-0" />
                                <span className="truncate text-[11px] font-semibold">
                                  {msg.attachmentName || 'Attached Document'}
                                </span>
                              </div>
                              <a
                                href={msg.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={msg.attachmentName}
                                className="p-1.5 neo-btn rounded-lg text-slate-700 hover:text-black transition-all cursor-pointer flex-shrink-0"
                              >
                                <Download size={13} />
                              </a>
                            </div>
                          )}
                        </div>

                        <span className="text-[9px] text-slate-400 px-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-20 text-slate-500 space-y-1">
                    <Sparkles size={28} className="mx-auto text-black mb-2" />
                    <p className="font-bold text-slate-800 text-xs">Direct Client-Attorney Communication</p>
                    <p className="text-[11px]">Send a message to discuss strategy, request clarifications, or launch a live video call.</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Selected File Preview Badge */}
              {selectedFile && (
                <div className="flex items-center justify-between p-2.5 neo-inset-sm rounded-xl mb-2 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <Paperclip size={14} className="text-[#111317]" />
                    <span className="text-slate-800 truncate font-semibold">{selectedFile.name}</span>
                    <span className="text-[10px] text-slate-500">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-1 text-slate-500 hover:text-black"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Input Bar */}
              <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-200 flex items-center gap-2">
                <label className="p-2.5 neo-btn text-slate-700 hover:text-black rounded-xl transition-all cursor-pointer flex-shrink-0">
                  <Paperclip size={16} />
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  />
                </label>

                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`Write a message to ${activeUser.name}...`}
                  className="flex-1 px-4 py-3 neo-inset-sm rounded-xl text-slate-900 text-xs focus:outline-none placeholder-slate-400 font-medium"
                />

                <button
                  type="submit"
                  disabled={sendMutation.isPending || isUploading || (!messageInput.trim() && !selectedFile)}
                  className="px-5 py-3 neo-btn-black text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                >
                  {isUploading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={15} /> Send
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3">
              <MessageSquare size={48} className="text-slate-400" />
              <h3 className="font-bold text-slate-800 text-sm">Select a Conversation</h3>
              <p className="text-xs text-slate-500 max-w-sm text-center">
                Select an existing conversation from the list or start a new chat with an advocate or client.
              </p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-4 py-2 neo-btn-black text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Plus size={14} /> Start New Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="neo-card p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl neo-btn-black text-white flex items-center justify-center">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#111317]">Start New Conversation</h3>
                  <p className="text-xs text-slate-500">Pick a legal counsel or client to begin messaging</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-slate-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-3 py-2.5 neo-inset-sm rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-2 max-h-[360px] pr-1">
              {loadingContacts ? (
                <div className="text-center py-12">
                  <Loader2 className="animate-spin text-black mx-auto" size={24} />
                </div>
              ) : filteredContacts && filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => {
                      handleSelectUser(contact.id);
                      setShowNewChatModal(false);
                    }}
                    className="w-full text-left p-3.5 neo-card-sm hover:neo-inset-sm rounded-2xl transition-all flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl neo-inset-sm font-bold flex items-center justify-center text-slate-800 text-sm flex-shrink-0">
                        {contact.name?.charAt(0) || 'U'}
                      </div>
                      <div className="truncate">
                        <h4 className="font-bold text-xs text-[#111317] group-hover:underline truncate">
                          {contact.role === 'advocate' ? `Adv. ${contact.name}` : contact.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">{contact.email}</p>
                        {(contact as any).practiceAreas && (
                          <p className="text-[10px] text-slate-600 font-semibold truncate">
                            {(contact as any).practiceAreas}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="px-2.5 py-1 neo-btn rounded-xl text-[10px] font-bold text-slate-700 flex-shrink-0">
                      Chat &rarr;
                    </span>
                  </button>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Users size={28} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-semibold">No contacts found</p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowNewChatModal(false)}
                className="px-4 py-2 neo-btn text-xs font-bold text-slate-700 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

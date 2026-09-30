import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
} from 'lucide-react';

export default function Messages() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetUserIdParam = searchParams.get('user');

  const [selectedUserId, setSelectedUserId] = useState<string | null>(targetUserIdParam);
  const [messageInput, setMessageInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: conversations, refetch: refetchConversations, isLoading: loadingConversations } =
    trpc.messages.listConversations.useQuery(undefined, {
      refetchInterval: 4000,
    });

  const { data: activeMessages, refetch: refetchMessages, isLoading: loadingMessages } =
    trpc.messages.getConversation.useQuery(
      { targetUserId: selectedUserId || '' },
      { enabled: !!selectedUserId, refetchInterval: 3000 }
    );

  // Mutations
  const sendMutation = trpc.messages.sendMessage.useMutation();
  const clearConversationMutation = trpc.messages.clearConversation.useMutation();

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

        const uploadRes = await fetch('http://localhost:4000/api/upload', {
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
  const activeUser = activeConversation?.user;
  const activeCase = activeConversation?.case;

  const filteredConversations = conversations?.filter((c) => {
    const name = c.user?.name || '';
    const email = c.user?.email || '';
    return (
      name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      email.toLowerCase().includes(searchFilter.toLowerCase())
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[75vh] max-h-[82vh]">
        {/* ========================================================================= */}
        {/* ───────────────────── LEFT: CONVERSATION THREADS ──────────────────────── */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 bg-slate-900/50 border border-slate-800 rounded-3xl p-4 flex flex-col backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="pb-4 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="text-indigo-400" size={18} /> Client & Counsel Messages
              </h2>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto space-y-2 pt-3 pr-1">
            {loadingConversations ? (
              <div className="text-center py-12">
                <Loader2 className="animate-spin text-indigo-500 mx-auto" size={24} />
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
                        ? 'bg-indigo-600/20 border border-indigo-500/40 shadow-md'
                        : 'bg-slate-950/40 border border-slate-800/60 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow">
                        {c.user?.name?.charAt(0) || 'U'}
                      </div>
                      {c.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-slate-950 rounded-full text-[9px] font-black flex items-center justify-center ring-2 ring-slate-900 animate-pulse">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="font-bold text-white text-xs truncate">
                          {isAdv ? `Adv. ${c.user?.name}` : c.user?.name}
                        </h4>
                        <span className="text-[9px] uppercase font-semibold text-slate-500">
                          {c.user?.role}
                        </span>
                      </div>

                      {c.case && (
                        <span className="inline-block text-[10px] text-indigo-400 font-medium truncate max-w-[200px]">
                          📁 {c.case.title}
                        </span>
                      )}

                      {c.lastMessage && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {c.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-16 text-slate-500 space-y-2">
                <Users size={32} className="mx-auto text-slate-600" />
                <p className="text-xs font-medium">No connected conversations</p>
                <p className="text-[11px] text-slate-600 max-w-[200px] mx-auto">
                  Connect with an advocate or accept client requests to begin messaging.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ───────────────────── RIGHT: LIVE CONVERSATION STREAM ─────────────────── */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 bg-slate-900/50 border border-slate-800 rounded-3xl p-5 flex flex-col backdrop-blur-xl shadow-xl overflow-hidden">
          {selectedUserId && activeUser ? (
            <>
              {/* Header */}
              <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 font-bold flex items-center justify-center text-base border border-indigo-500/20">
                    {activeUser.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm">
                        {activeUser.role === 'advocate' ? `Adv. ${activeUser.name}` : activeUser.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-950 text-indigo-400 border border-indigo-500/20">
                        {activeUser.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{activeUser.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {activeCase && (
                    <Link
                      to={`/cases/${activeCase.id}`}
                      className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl flex items-center gap-1.5 transition-all"
                    >
                      <FolderOpen size={13} className="text-indigo-400" /> Case Dossier
                    </Link>
                  )}
                  <Link
                    to="/dashboard"
                    className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-xl flex items-center gap-1.5 transition-all font-semibold"
                  >
                    <Video size={13} /> Consultation
                  </Link>
                  <button
                    type="button"
                    onClick={handleClearChat}
                    disabled={clearConversationMutation.isPending || !activeMessages?.length}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 rounded-xl flex items-center gap-1.5 transition-all font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Clear Conversation History"
                  >
                    <Trash2 size={13} /> Clear Chat
                  </button>
                </div>
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
                {loadingMessages ? (
                  <div className="text-center py-20">
                    <Loader2 className="animate-spin text-indigo-500 mx-auto" size={28} />
                  </div>
                ) : activeMessages && activeMessages.length > 0 ? (
                  activeMessages.map((msg) => {
                    const isMe = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        <div
                          className={`max-w-[80%] md:max-w-[70%] p-3.5 rounded-2xl text-xs space-y-2 leading-relaxed ${
                            isMe
                              ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/10'
                              : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>

                          {/* Attachment Display */}
                          {msg.attachmentUrl && (
                            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3 bg-black/20 p-2 rounded-xl">
                              <div className="flex items-center gap-2 truncate">
                                <FileText size={15} className="text-amber-400 flex-shrink-0" />
                                <span className="truncate text-[11px] font-medium">
                                  {msg.attachmentName || 'Attached Document'}
                                </span>
                              </div>
                              <a
                                href={`http://localhost:4000${msg.attachmentUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={msg.attachmentName}
                                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all cursor-pointer flex-shrink-0"
                              >
                                <Download size={13} />
                              </a>
                            </div>
                          )}
                        </div>

                        <span className="text-[9px] text-slate-500 px-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-20 text-slate-500 space-y-1">
                    <Sparkles size={28} className="mx-auto text-indigo-400 mb-2" />
                    <p className="font-semibold text-slate-300 text-xs">Direct Client-Attorney Communication</p>
                    <p className="text-[11px]">Send a message to discuss strategy, request clarifications, or share legal filings.</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Selected File Preview Badge */}
              {selectedFile && (
                <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-xl mb-2 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <Paperclip size={14} className="text-amber-400" />
                    <span className="text-slate-200 truncate">{selectedFile.name}</span>
                    <span className="text-[10px] text-slate-500">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Input Bar */}
              <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-800 flex items-center gap-2">
                <label className="p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer flex-shrink-0">
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
                  className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                />

                <button
                  type="submit"
                  disabled={sendMutation.isPending || isUploading || (!messageInput.trim() && !selectedFile)}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer flex-shrink-0"
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
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-2">
              <MessageSquare size={48} className="text-slate-700" />
              <h3 className="font-bold text-slate-400 text-sm">Select a Conversation</h3>
              <p className="text-xs text-slate-500 max-w-sm text-center">
                Select a connected client or assigned advocate from the list to start exchanging messages.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { trpc } from '../utils/trpc.js';
import { useAuth } from '../hooks/useAuth.js';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  FolderOpen,
  FileText,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Users,
  Shield,
  ArrowLeft,
  Download,
  Loader2,
  X,
} from 'lucide-react';

export default function ConsultationRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [companionTab, setCompanionTab] = useState<'case' | 'documents' | 'notes'>('case');
  const [sessionNotes, setSessionNotes] = useState('');
  const [showEndModal, setShowEndModal] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const processedSignals = useRef<Set<string>>(new Set());

  // Fetch consultation room data
  const { data: session, isLoading } = trpc.consultations.getRoom.useQuery(
    { id: id || '' },
    { enabled: !!id }
  );

  const completeMutation = trpc.consultations.completeSession.useMutation();
  const sendSignalMutation = trpc.consultations.sendSignal.useMutation();

  // Poll for peer WebRTC signals
  const { data: incomingSignals } = trpc.consultations.getSignals.useQuery(
    { roomId: session?.meetingRoomId || '' },
    { enabled: !!session?.meetingRoomId, refetchInterval: 1200 }
  );

  // Initialize camera & microphone and RTCPeerConnection
  useEffect(() => {
    let localMediaStream: MediaStream | null = null;
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    pcRef.current = pc;

    // Handle remote track
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        setRemoteHasVideo(true);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && session?.meetingRoomId) {
        sendSignalMutation.mutate({
          roomId: session.meetingRoomId,
          type: 'ice-candidate',
          payload: event.candidate,
        });
      }
    };

    async function initMedia() {
      try {
        localMediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(localMediaStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localMediaStream;
        }

        // Add tracks to peer connection
        localMediaStream.getTracks().forEach((track) => {
          pc.addTrack(track, localMediaStream!);
        });

        // If user is advocate or room initiator, create offer
        if (user?.role === 'advocate' && session?.meetingRoomId) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendSignalMutation.mutateAsync({
            roomId: session.meetingRoomId,
            type: 'offer',
            payload: offer,
          });
        }
      } catch (err) {
        console.warn('Unable to acquire camera/mic stream:', err);
      }
    }

    if (session?.meetingRoomId) {
      initMedia();
    }

    return () => {
      if (localMediaStream) {
        localMediaStream.getTracks().forEach((track) => track.stop());
      }
      pc.close();
      pcRef.current = null;
    };
  }, [session?.meetingRoomId]);

  // Handle incoming WebRTC signals
  useEffect(() => {
    if (!incomingSignals || !pcRef.current || !session?.meetingRoomId) return;

    const signals = incomingSignals;
    async function handleSignals() {
      const pc = pcRef.current;
      if (!pc) return;

      for (const sig of signals) {
        if (processedSignals.current.has(sig.id)) continue;
        processedSignals.current.add(sig.id);

        try {
          if (sig.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignalMutation.mutateAsync({
              roomId: session!.meetingRoomId,
              type: 'answer',
              payload: answer,
            });
          } else if (sig.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
          } else if (sig.type === 'ice-candidate' && sig.payload) {
            await pc.addIceCandidate(new RTCIceCandidate(sig.payload));
          }
        } catch (e) {
          console.warn('Error handling WebRTC signal:', e);
        }
      }
    }

    handleSignals();
  }, [incomingSignals, session?.meetingRoomId]);

  // Update local and remote video elements when streams change
  useEffect(() => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream, isVideoOff]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Handle Mute Toggle
  const toggleMute = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Handle Video On/Off Toggle
  const toggleVideo = () => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Handle Screen Share Toggle
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        setScreenStream(displayStream);
        setIsScreenSharing(true);

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = displayStream;
        }

        displayStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
        };
      } catch (err) {
        console.warn('Screen share canceled or denied:', err);
      }
    }
  };

  // End consultation session
  const handleEndConsultation = async () => {
    if (!id) return;
    try {
      await completeMutation.mutateAsync({
        id,
        sessionNotes: sessionNotes.trim() || undefined,
      });

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
      }

      if (session?.caseId) {
        navigate(`/cases/${session.caseId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to complete session');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
        <p className="text-slate-400 text-sm">Entering secure video consultation room...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 px-4 space-y-4">
        <AlertCircle size={48} className="mx-auto text-rose-500" />
        <h2 className="text-xl font-bold text-white">Consultation Session Not Found</h2>
        <p className="text-xs text-slate-400">
          This session may have ended or you do not have permission to participate.
        </p>
        <Link
          to="/dashboard"
          className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isAdvocate = user?.role === 'advocate';
  const otherPartyName = isAdvocate
    ? session.citizen?.name || 'Citizen Client'
    : `Adv. ${session.advocate?.name || 'Counsel'}`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
            title="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-bold text-white">{session.title}</h1>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                ● Live Video Session
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Encrypted Consultation • Room ID: <code className="text-indigo-300 font-mono">{session.meetingRoomId}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300">
            <Shield size={13} className="text-indigo-400" />
            <span>Client-Attorney Privilege Encrypted</span>
          </div>
          <button
            onClick={() => setShowEndModal(true)}
            className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <PhoneOff size={14} /> End Session
          </button>
        </div>
      </div>

      {/* Main Grid: Video Stage & Split Companion Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* ────────────────────────── LIVE VIDEO STAGE ───────────────────────────── */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl min-h-[440px] md:min-h-[520px] flex flex-col justify-between p-4">
            {/* Active Screen Sharing Display */}
            {isScreenSharing ? (
              <div className="relative w-full h-full flex-1 rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-slate-800">
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain max-h-[460px]"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-indigo-600/90 text-white text-[10px] font-bold tracking-wider">
                  You are sharing your screen / legal document
                </span>
              </div>
            ) : (
              /* Split Multi-Party Video Feeds */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 items-center">
                {/* Peer Feed */}
                <div className="relative w-full h-[230px] md:h-[380px] rounded-2xl bg-slate-900 border border-slate-800/80 overflow-hidden flex items-center justify-center shadow-inner group">
                  {remoteHasVideo ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center space-y-3 p-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-extrabold text-2xl flex items-center justify-center mx-auto shadow-xl ring-4 ring-indigo-500/20">
                        {otherPartyName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">{otherPartyName}</h3>
                        <p className="text-[11px] text-emerald-400 font-medium flex items-center justify-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> WebRTC Signaling Active · Peer Room Ready
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800 text-white text-[10px] font-semibold flex items-center gap-1.5">
                    <Users size={12} className="text-indigo-400" /> {otherPartyName}
                  </div>
                </div>

                {/* Local User Camera Feed */}
                <div className="relative w-full h-[230px] md:h-[380px] rounded-2xl bg-slate-900 border border-slate-800/80 overflow-hidden flex items-center justify-center shadow-inner">
                  {isVideoOff ? (
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto font-bold text-lg">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                      <p className="text-xs text-slate-400">Camera is off</p>
                    </div>
                  ) : (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover -scale-x-100"
                    />
                  )}
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800 text-white text-[10px] font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> You ({user?.name})
                  </div>
                  {isMuted && (
                    <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-rose-600/90 text-white">
                      <MicOff size={13} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Video Action Controls Bar */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap justify-center items-center gap-3">
              {/* Mic Toggle */}
              <button
                onClick={toggleMute}
                className={`p-3 rounded-xl transition-all cursor-pointer ${
                  isMuted
                    ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* Video Toggle */}
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-xl transition-all cursor-pointer ${
                  isVideoOff
                    ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
              >
                {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
              </button>

              {/* Screen Sharing Toggle */}
              <button
                onClick={toggleScreenShare}
                className={`p-3 rounded-xl transition-all cursor-pointer ${
                  isScreenSharing
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen / Document'}
              >
                <Monitor size={18} />
              </button>

              {/* End Call */}
              <button
                onClick={() => setShowEndModal(true)}
                className="p-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all shadow-lg shadow-rose-600/30 cursor-pointer"
                title="Leave & Complete Session"
              >
                <PhoneOff size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ───────────────── SPLIT-SCREEN LEGAL COMPANION DRAWER ─────────────────── */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 backdrop-blur-xl shadow-xl space-y-4 min-h-[500px] flex flex-col">
            {/* Companion Drawer Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-2xl">
              {[
                { id: 'case', label: 'Case Brief', icon: <FolderOpen size={13} /> },
                {
                  id: 'documents',
                  label: 'Documents',
                  icon: <FileText size={13} />,
                  badge: session.case?.documents?.length || 0,
                },
                { id: 'notes', label: 'Action Notes', icon: <Edit3 size={13} /> },
              ].map((tab) => {
                const active = companionTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCompanionTab(tab.id as any)}
                    className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      active
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[9px]">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ─── TAB 1: CASE BRIEF & PROFILE ─── */}
            {companionTab === 'case' && (
              <div className="space-y-4 text-xs flex-1 animate-fadeIn">
                {session.case ? (
                  <>
                    <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {session.case.category}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold capitalize">
                          ● {session.case.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-sm">{session.case.title}</h4>
                      <p className="text-slate-400 text-xs leading-relaxed">{session.case.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl space-y-0.5">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Client</span>
                        <span className="text-slate-200 font-semibold">{session.citizen?.name}</span>
                        <span className="text-slate-500 text-[10px] block truncate">{session.citizen?.email}</span>
                      </div>

                      <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl space-y-0.5">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Counsel</span>
                        <span className="text-indigo-300 font-semibold">Adv. {session.advocate?.name}</span>
                        {session.advocateProfile && (
                          <span className="text-slate-500 text-[10px] block">
                            Bar: {session.advocateProfile.barCouncilNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-500 space-y-1">
                    <Users size={32} className="mx-auto text-slate-600 mb-2" />
                    <p className="font-medium text-slate-400">Direct Consultation Session</p>
                    <p className="text-[11px]">This consultation was initiated directly between counsel and client.</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB 2: CASE DOCUMENTS REFERENCE ─── */}
            {companionTab === 'documents' && (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] animate-fadeIn text-xs">
                {session.case?.documents && session.case.documents.length > 0 ? (
                  session.case.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex justify-between items-center"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={16} className="text-amber-400 flex-shrink-0" />
                        <div className="truncate">
                          <h5 className="font-bold text-white text-xs truncate">{doc.title}</h5>
                          <span className="text-[10px] text-slate-500">
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <a
                        href={`http://localhost:4000${doc.filePath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer"
                        title="Download Dossier Document"
                      >
                        <Download size={13} />
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <FileText size={28} className="mx-auto text-slate-600 mb-2" />
                    <p>No uploaded case documents</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB 3: ACTION MINUTES & COUNSEL NOTES ─── */}
            {companionTab === 'notes' && (
              <div className="space-y-3 flex-1 flex flex-col animate-fadeIn text-xs">
                <label className="block text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                  Counsel Session Notes / Action Items
                </label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Record key advice, next hearing action items, or document filing deadlines..."
                  className="flex-1 w-full min-h-[220px] p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
                <p className="text-[10px] text-slate-500">
                  Notes are automatically recorded to the case dossier upon concluding the session.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* End Call Modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <PhoneOff size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Conclude Consultation</h3>
                  <p className="text-xs text-slate-400">Save counsel notes and complete session</p>
                </div>
              </div>
              <button onClick={() => setShowEndModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Session Action Notes (Optional)
              </label>
              <textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={3}
                placeholder="Key agreements, next steps, required filings..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowEndModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleEndConsultation}
                disabled={completeMutation.isPending}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                {completeMutation.isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Concluding...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} /> Complete & Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

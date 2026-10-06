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
  Copy,
  Check,
  RefreshCw,
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
  const [isSimulatedMedia, setIsSimulatedMedia] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [companionTab, setCompanionTab] = useState<'case' | 'documents' | 'notes'>('case');
  const [sessionNotes, setSessionNotes] = useState('');
  const [showEndModal, setShowEndModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'waiting' | 'connected' | 'reconnecting'>('connecting');

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const activeRoomIdRef = useRef<string | null>(null);
  const processedSignals = useRef<Set<string>>(new Set());
  const candidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const canvasAnimationRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const peerIdRef = useRef<string>(`peer_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // Fetch consultation room data
  const { data: session, isLoading } = trpc.consultations.getRoom.useQuery(
    { id: id || '' },
    { enabled: !!id }
  );

  const completeMutation = trpc.consultations.completeSession.useMutation();
  const sendSignalMutation = trpc.consultations.sendSignal.useMutation();

  // Stable mutation and user refs to avoid effect re-triggers
  const sendSignalMutateAsyncRef = useRef(sendSignalMutation.mutateAsync);
  sendSignalMutateAsyncRef.current = sendSignalMutation.mutateAsync;
  const sendSignalMutateRef = useRef(sendSignalMutation.mutate);
  sendSignalMutateRef.current = sendSignalMutation.mutate;
  const userRef = useRef(user);
  userRef.current = user;

  // Poll for peer WebRTC signals
  const { data: incomingSignals } = trpc.consultations.getSignals.useQuery(
    { roomId: session?.meetingRoomId || '', peerId: peerIdRef.current },
    { enabled: !!session?.meetingRoomId, refetchInterval: 800 }
  );

  // Create simulated fallback stream if device has no physical camera or mic
  const createFallbackMediaStream = (displayName: string): MediaStream => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;

    let phase = 0;
    const draw = () => {
      phase += 0.05;
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      ctx.arc(320, 210, 65, 0, Math.PI * 2);
      ctx.fillStyle = '#4f46e5';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#818cf8';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const initial = (displayName.charAt(0) || 'U').toUpperCase();
      ctx.fillText(initial, 320, 210);

      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(displayName || 'Legal Participant', 320, 310);

      const numBars = 16;
      const barWidth = 6;
      const spacing = 10;
      const startX = 320 - (numBars * spacing) / 2;
      for (let i = 0; i < numBars; i++) {
        const height = Math.abs(Math.sin(phase + i * 0.4)) * 32 + 6;
        ctx.fillStyle = '#10b981';
        ctx.fillRect(startX + i * spacing, 360 - height / 2, barWidth, height);
      }

      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Virtual Legal Aid Video Feed', 320, 420);

      canvasAnimationRef.current = requestAnimationFrame(draw);
    };
    draw();

    const canvasStream = canvas.captureStream(25);

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.00001;
      osc.connect(gain);
      const dest = audioCtx.createMediaStreamDestination();
      gain.connect(dest);
      osc.start();
      const audioTrack = dest.stream.getAudioTracks()[0];
      if (audioTrack) {
        canvasStream.addTrack(audioTrack);
      }
    } catch (e) {
      console.warn('AudioContext fallback creation error:', e);
    }

    return canvasStream;
  };

  // Deterministic Caller: Advocate is caller; if citizen-citizen or admin, use deterministic user ID
  const isCaller = session?.advocateId
    ? user?.id === session.advocateId
    : (user?.id || '') <= (session?.citizenId || '');
  const isPolite = !isCaller;

  // Create Offer helper
  const sendOffer = async (pc: RTCPeerConnection, roomId: string) => {
    try {
      if (pc.signalingState !== 'stable') {
        console.log('[WebRTC] Skipping offer creation: current state is', pc.signalingState);
        return;
      }
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      await sendSignalMutateAsyncRef.current({
        roomId,
        peerId: peerIdRef.current,
        type: 'offer',
        payload: offer,
      });
    } catch (err) {
      console.warn('Error creating WebRTC offer:', err);
    }
  };

  // Initialize camera & microphone and RTCPeerConnection exactly once per room
  useEffect(() => {
    const roomId = session?.meetingRoomId;
    if (!roomId) return;
    if (activeRoomIdRef.current === roomId) return;
    activeRoomIdRef.current = roomId;

    let localMediaStream: MediaStream | null = null;
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    });
    pcRef.current = pc;

    // Handle remote track
    pc.ontrack = (event) => {
      console.log('[WebRTC] Remote track received:', event.track.kind);
      let incomingStream: MediaStream;
      if (event.streams && event.streams[0]) {
        incomingStream = event.streams[0];
      } else {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        remoteStreamRef.current.addTrack(event.track);
        incomingStream = remoteStreamRef.current;
      }
      remoteStreamRef.current = incomingStream;
      setRemoteStream(incomingStream);
      setConnectionStatus('connected');
      if (event.track.kind === 'video' || incomingStream.getVideoTracks().length > 0) {
        setRemoteHasVideo(true);
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = incomingStream;
        remoteVideoRef.current.play().catch((err) => console.warn('[WebRTC] Remote play failed:', err));
      }
    };

    // Connection state listeners
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setConnectionStatus('connected');
      } else if (pc.connectionState === 'connecting') {
        setConnectionStatus('connecting');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setConnectionStatus('reconnecting');
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionStatus('connected');
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        setConnectionStatus('reconnecting');
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && roomId) {
        const candJson = event.candidate.toJSON
          ? event.candidate.toJSON()
          : {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              usernameFragment: event.candidate.usernameFragment,
            };
        sendSignalMutateRef.current({
          roomId,
          peerId: peerIdRef.current,
          type: 'ice-candidate',
          payload: candJson,
        });
      }
    };

    async function initMedia() {
      try {
        if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
          localMediaStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true,
          });
        } else {
          throw new Error('getUserMedia not available on this origin');
        }
      } catch (errVideo) {
        try {
          if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
            localMediaStream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: true,
            });
          } else {
            throw new Error('Audio-only mediaDevices not available');
          }
        } catch (errAudio) {
          setIsSimulatedMedia(true);
          localMediaStream = createFallbackMediaStream(userRef.current?.name || 'User');
        }
      }

      setStream(localMediaStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localMediaStream;
      }

      // Add all tracks to peer connection
      localMediaStream.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, localMediaStream!);
        } catch (e) {
          console.warn('Error adding track:', e);
        }
      });

      // Announce entry into room
      try {
        await sendSignalMutateAsyncRef.current({
          roomId: roomId!,
          peerId: peerIdRef.current,
          type: 'peer-joined',
          payload: { role: userRef.current?.role, name: userRef.current?.name },
        });
      } catch (e) {
        console.warn('Error announcing peer entry:', e);
      }

      // Designated caller initiates offer; otherwise wait for peer offer
      if (isCaller && roomId) {
        await sendOffer(pc, roomId);
      } else {
        setConnectionStatus('waiting');
      }
    }

    initMedia();

    return () => {
      activeRoomIdRef.current = null;
      if (canvasAnimationRef.current) {
        cancelAnimationFrame(canvasAnimationRef.current);
        canvasAnimationRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      if (localMediaStream) {
        localMediaStream.getTracks().forEach((track) => track.stop());
      }
      pc.close();
      pcRef.current = null;
    };
  }, [session?.meetingRoomId]);

  // Handle incoming WebRTC signals
  useEffect(() => {
    const roomId = session?.meetingRoomId;
    if (!incomingSignals || !pcRef.current || !roomId) return;

    const signals = incomingSignals;
    async function handleSignals() {
      const pc = pcRef.current;
      if (!pc) return;

      for (const sig of signals) {
        if (processedSignals.current.has(sig.id)) continue;
        processedSignals.current.add(sig.id);

        try {
          if (sig.type === 'peer-joined') {
            // When peer joins: if we are caller and signaling is stable, re-send offer so late peer receives it
            if (isCaller && pc.signalingState === 'stable') {
              await sendOffer(pc, roomId!);
            }
          } else if (sig.type === 'offer') {
            console.log('[WebRTC] Received offer, current state:', pc.signalingState);
            const offerCollision = pc.signalingState !== 'stable';
            if (offerCollision) {
              if (!isPolite) {
                console.log('[WebRTC] Impolite peer ignoring colliding remote offer');
                continue;
              }
              console.log('[WebRTC] Polite peer rolling back local offer');
              await pc.setLocalDescription({ type: 'rollback' });
            }

            await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));

            // Drain queued ICE candidates
            while (candidateQueue.current.length > 0) {
              const c = candidateQueue.current.shift()!;
              await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignalMutateAsyncRef.current({
              roomId: roomId!,
              peerId: peerIdRef.current,
              type: 'answer',
              payload: answer,
            });
            setConnectionStatus('connected');
          } else if (sig.type === 'answer') {
            console.log('[WebRTC] Received answer, current state:', pc.signalingState);
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
              while (candidateQueue.current.length > 0) {
                const c = candidateQueue.current.shift()!;
                await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
              }
              setConnectionStatus('connected');
            }
          } else if (sig.type === 'ice-candidate' && sig.payload) {
            if (sig.payload.candidate) {
              if (pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(sig.payload)).catch(() => {});
              } else {
                candidateQueue.current.push(sig.payload);
              }
            }
          } else if (sig.type === 'peer-hung-up') {
            setRemoteHasVideo(false);
            setConnectionStatus('waiting');
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
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream, remoteHasVideo]);

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

  // Handle Screen Share Toggle (with real WebRTC track replacement)
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);

      // Restore camera video track on peer connection
      if (pcRef.current && stream) {
        const videoSender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
        const cameraTrack = stream.getVideoTracks()[0];
        if (videoSender && cameraTrack) {
          videoSender.replaceTrack(cameraTrack).catch(() => {});
        }
      }
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

        // Send screen video track to remote peer
        if (pcRef.current) {
          const videoSender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
          const screenTrack = displayStream.getVideoTracks()[0];
          if (videoSender && screenTrack) {
            videoSender.replaceTrack(screenTrack).catch(() => {});
          }
        }

        displayStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          if (pcRef.current && stream) {
            const videoSender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
            const cameraTrack = stream.getVideoTracks()[0];
            if (videoSender && cameraTrack) {
              videoSender.replaceTrack(cameraTrack).catch(() => {});
            }
          }
        };
      } catch (err) {
        console.warn('Screen share canceled or denied:', err);
      }
    }
  };

  // Manual Reconnect Helper
  const handleManualReconnect = async () => {
    const roomId = session?.meetingRoomId;
    if (!roomId) return;
    setConnectionStatus('reconnecting');
    try {
      processedSignals.current.clear();
      candidateQueue.current = [];
      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch (_) {}
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      });
      pcRef.current = pc;

      // Re-attach active tracks
      if (stream) {
        stream.getTracks().forEach((track) => {
          try {
            pc.addTrack(track, stream);
          } catch (_) {}
        });
      }

      pc.ontrack = (event) => {
        let incomingStream = (event.streams && event.streams[0]) || remoteStreamRef.current || new MediaStream();
        if (!event.streams || !event.streams[0]) {
          incomingStream.addTrack(event.track);
        }
        remoteStreamRef.current = incomingStream;
        setRemoteStream(incomingStream);
        setRemoteHasVideo(true);
        setConnectionStatus('connected');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = incomingStream;
          remoteVideoRef.current.play().catch(() => {});
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && roomId) {
          const candJson = event.candidate.toJSON
            ? event.candidate.toJSON()
            : {
                candidate: event.candidate.candidate,
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
              };
          sendSignalMutateRef.current({
            roomId,
            peerId: peerIdRef.current,
            type: 'ice-candidate',
            payload: candJson,
          });
        }
      };

      await sendSignalMutation.mutateAsync({
        roomId,
        peerId: peerIdRef.current,
        type: 'peer-joined',
        payload: { role: user?.role, name: user?.name },
      });
      await sendOffer(pc, roomId);
    } catch (e) {
      console.warn('Error during manual reconnect:', e);
    }
  };

  // Copy Room Link to Clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // End consultation session
  const handleEndConsultation = async () => {
    if (!id || !session?.meetingRoomId) return;
    try {
      // Send hang-up signal to peer
      await sendSignalMutation.mutateAsync({
        roomId: session.meetingRoomId,
        peerId: peerIdRef.current,
        type: 'peer-hung-up',
        payload: { userId: user?.id },
      });

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
        <Loader2 className="animate-spin text-black" size={40} />
        <p className="text-slate-600 text-sm font-semibold">Connecting to secure legal consultation chamber...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 px-4 space-y-4">
        <AlertCircle size={48} className="mx-auto text-rose-600" />
        <h2 className="text-xl font-bold text-[#111317]">Consultation Session Not Found</h2>
        <p className="text-xs text-slate-500">
          This session may have concluded or you do not have permission to participate.
        </p>
        <Link
          to="/dashboard"
          className="inline-block px-5 py-2.5 neo-btn-black text-white rounded-xl text-xs font-bold transition-all"
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
      <div className="flex flex-wrap justify-between items-center gap-4 neo-card p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 neo-btn text-slate-700 hover:text-black rounded-xl transition-all cursor-pointer"
            title="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base md:text-lg font-black text-[#111317]">{session.title}</h1>
              <span
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : connectionStatus === 'reconnecting'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-500'
                      : connectionStatus === 'reconnecting'
                      ? 'bg-amber-500'
                      : 'bg-indigo-500 animate-ping'
                  }`}
                />
                {connectionStatus === 'connected'
                  ? 'Active Call'
                  : connectionStatus === 'reconnecting'
                  ? 'Reconnecting'
                  : 'Waiting for Peer'}
              </span>

              {isSimulatedMedia && (
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                  Virtual Camera
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Encrypted Room: <code className="text-slate-800 font-mono font-bold">{session.meetingRoomId}</code></span>
              <span>&bull;</span>
              <button
                onClick={handleCopyLink}
                className="text-[11px] font-bold text-slate-700 hover:text-black flex items-center gap-1 underline cursor-pointer"
              >
                {copiedLink ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                {copiedLink ? 'Link Copied!' : 'Copy Room Link'}
              </button>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualReconnect}
            className="p-2.5 neo-btn text-slate-700 hover:text-black rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            title="Reconnect or re-sync video session"
          >
            <RefreshCw size={14} className={connectionStatus === 'reconnecting' ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Re-sync</span>
          </button>
          <div className="hidden md:flex items-center gap-2 px-3 py-2 neo-inset-sm rounded-xl text-xs text-slate-700">
            <Shield size={14} className="text-[#111317]" />
            <span className="font-semibold">Privileged & Encrypted</span>
          </div>
          <button
            onClick={() => setShowEndModal(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
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
          <div className="relative bg-[#0b0f19] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl min-h-[440px] md:min-h-[520px] flex flex-col justify-between p-4">
            {/* Active Screen Sharing Display */}
            {isScreenSharing ? (
              <div className="relative w-full h-full flex-1 rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-slate-800">
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain max-h-[460px]"
                />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-black/80 text-white text-[11px] font-bold tracking-wider border border-white/20">
                  Sharing screen / case dossier to call
                </span>
              </div>
            ) : (
              /* Split Multi-Party Video Feeds */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 items-center">
                {/* Peer Feed */}
                <div className="relative w-full h-[230px] md:h-[380px] rounded-2xl bg-[#0f172a] border border-slate-800/80 overflow-hidden flex items-center justify-center shadow-inner group">
                  {/* Keep video permanently in DOM so ref and media decoder pipeline never unmount */}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      remoteHasVideo ? 'opacity-100 z-10' : 'opacity-0 absolute pointer-events-none'
                    }`}
                  />
                  {!remoteHasVideo && (
                    <div className="text-center space-y-3 p-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-xl ring-4 ring-white/10">
                        {otherPartyName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">{otherPartyName}</h3>
                        <p className="text-[11px] text-amber-400 font-medium flex items-center justify-center gap-1.5 mt-1">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          Waiting for peer to join consultation room...
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-[220px] mx-auto">
                          Share the room link or notify the participant to enter.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-white text-[10px] font-semibold flex items-center gap-1.5 z-20">
                    <Users size={12} className="text-slate-300" /> {otherPartyName}
                  </div>
                </div>

                {/* Local User Camera Feed */}
                <div className="relative w-full h-[230px] md:h-[380px] rounded-2xl bg-[#0f172a] border border-slate-800/80 overflow-hidden flex items-center justify-center shadow-inner">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover -scale-x-100 transition-opacity duration-300 ${
                      isVideoOff ? 'opacity-0 absolute pointer-events-none' : 'opacity-100'
                    }`}
                  />
                  {isVideoOff && (
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto font-bold text-lg">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                      <p className="text-xs text-slate-400">Camera is off</p>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-white text-[10px] font-semibold flex items-center gap-1.5 z-20">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> You ({user?.name})
                  </div>
                  {isMuted && (
                    <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-rose-600 text-white shadow-md z-20">
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
                className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
                  isMuted
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* Video Toggle */}
              <button
                onClick={toggleVideo}
                className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
                  isVideoOff
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
                title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
              >
                {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
              </button>

              {/* Screen Sharing Toggle */}
              <button
                onClick={toggleScreenShare}
                className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
                  isScreenSharing
                    ? 'bg-black text-white ring-2 ring-white/50 shadow-lg'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
                title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen / Case Document'}
              >
                <Monitor size={18} />
              </button>

              {/* Re-sync call button */}
              <button
                onClick={handleManualReconnect}
                className="p-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition-all cursor-pointer"
                title="Re-synchronize WebRTC signals"
              >
                <RefreshCw size={18} />
              </button>

              {/* End Call */}
              <button
                onClick={() => setShowEndModal(true)}
                className="p-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl transition-all shadow-lg shadow-rose-600/30 cursor-pointer"
                title="Conclude Session"
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
          <div className="neo-card p-5 rounded-3xl shadow-xl space-y-4 min-h-[500px] flex flex-col">
            {/* Companion Drawer Tabs */}
            <div className="flex items-center gap-1 p-1 neo-inset-sm rounded-2xl">
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
                        ? 'neo-btn-black text-white shadow-sm'
                        : 'text-slate-600 hover:text-black'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-300 text-slate-800 text-[9px]">
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
                    <div className="p-3.5 neo-inset-sm rounded-2xl space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider neo-card-sm text-slate-800">
                          {session.case.category}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-black capitalize">
                          ● {session.case.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-[#111317] text-sm">{session.case.title}</h4>
                      <p className="text-slate-600 text-xs leading-relaxed">{session.case.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-3 neo-card-sm rounded-xl space-y-0.5">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Client</span>
                        <span className="text-slate-900 font-bold">{session.citizen?.name}</span>
                        <span className="text-slate-500 text-[10px] block truncate">{session.citizen?.email}</span>
                      </div>

                      <div className="p-3 neo-card-sm rounded-xl space-y-0.5">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Counsel</span>
                        <span className="text-slate-900 font-bold">Adv. {session.advocate?.name}</span>
                        {session.advocateProfile && (
                          <span className="text-slate-500 text-[10px] block truncate">
                            Bar: {session.advocateProfile.barCouncilNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-500 space-y-1">
                    <Users size={32} className="mx-auto text-slate-400 mb-2" />
                    <p className="font-bold text-slate-800">Direct Consultation Chamber</p>
                    <p className="text-[11px] text-slate-500">Live consultation initiated between client and counsel.</p>
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
                      className="p-3 neo-inset-sm rounded-2xl flex justify-between items-center"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={16} className="text-[#111317] flex-shrink-0" />
                        <div className="truncate">
                          <h5 className="font-bold text-[#111317] text-xs truncate">{doc.title}</h5>
                          <span className="text-[10px] text-slate-500">
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <a
                        href={doc.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 neo-btn rounded-lg text-slate-700 hover:text-black transition-all cursor-pointer"
                        title="Open Document"
                      >
                        <Download size={13} />
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <FileText size={28} className="mx-auto text-slate-400 mb-2" />
                    <p className="font-medium text-slate-600">No uploaded case documents</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB 3: ACTION MINUTES & COUNSEL NOTES ─── */}
            {companionTab === 'notes' && (
              <div className="space-y-3 flex-1 flex flex-col animate-fadeIn text-xs">
                <label className="block text-[11px] font-black text-[#111317] uppercase tracking-wider">
                  Counsel Session Minutes & Next Steps
                </label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Record summary of advice, agreed actions, next filing dates..."
                  className="flex-1 w-full min-h-[220px] p-3.5 neo-inset-sm rounded-2xl text-slate-800 text-xs focus:outline-none resize-none leading-relaxed"
                />
                <p className="text-[10px] text-slate-500">
                  Notes are permanently recorded to the case dossier upon concluding the consultation.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* End Call Modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="neo-card p-6 md:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <PhoneOff size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#111317]">Conclude Consultation</h3>
                  <p className="text-xs text-slate-500">Record minutes and finish session</p>
                </div>
              </div>
              <button onClick={() => setShowEndModal(false)} className="text-slate-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1.5">
                Counsel Minutes / Action Items (Optional)
              </label>
              <textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={3}
                placeholder="Key advice given, legal deadlines, hearing preparations..."
                className="w-full p-3 neo-inset-sm rounded-xl text-slate-900 text-xs focus:outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowEndModal(false)}
                className="px-4 py-2 neo-btn text-xs font-bold text-slate-700 hover:text-black cursor-pointer rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleEndConsultation}
                disabled={completeMutation.isPending}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
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

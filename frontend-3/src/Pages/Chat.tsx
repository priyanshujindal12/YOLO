import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { socket } from "../lib/socket";
import { PhoneOff, MessageCircle, X } from "lucide-react";
import { VideoCard } from "../components/VideoCard";
import { CallControls } from "../components/CallControls";
import { ChatPanel } from "../components/ChatPanel";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";

type Message = {
  id: string;
  text: string;
  sender: "me" | "partner";
};

// ─── ICE servers: STUN + TURN ────────────────────────────────────────
// TURN is required for peers behind symmetric NATs / carrier-grade NATs.
// Replace the placeholder credentials with your TURN provider details.
const rtcConfiguration: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // ── TURN server (fill in your credentials) ──────────────────────
    // Sign up at https://www.metered.ca/stun-turn for free TURN,
    // or use any TURN provider and paste credentials here.
    // {
    //   urls: "turn:YOUR_TURN_SERVER:443?transport=tcp",
    //   username: "YOUR_USERNAME",
    //   credential: "YOUR_CREDENTIAL",
    // },
    // {
    //   urls: "turns:YOUR_TURN_SERVER:443?transport=tcp",
    //   username: "YOUR_USERNAME",
    //   credential: "YOUR_CREDENTIAL",
    // },
  ],
  iceCandidatePoolSize: 10,
};

export function Chat() {
  const location = useLocation();
  const navigate = useNavigate();
  const initiator: boolean = location.state?.initiator ?? false;
  const userProfile: { name?: string; profilePicture?: string | null } = location.state?.user ?? {};
  const partnerName: string = location.state?.partnerName ?? "Stranger";

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [bothUsersReady, setBothUsersReady] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [partnerCameraOn, setPartnerCameraOn] = useState(true);
  const [partnerMicOn, setPartnerMicOn] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const chatReadySentRef = useRef(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const cameraReadyRef = useRef(false);
  const offerCreatedRef = useRef(false);
  const isInitiatorRef = useRef(initiator);

  useEffect(() => {
    isInitiatorRef.current = initiator;
  }, [initiator]);

  const createPeerConnection = useCallback((): RTCPeerConnection | null => {
    if (peerConnectionRef.current) return peerConnectionRef.current;
    const stream = localStreamRef.current;
    if (!stream) {
      console.warn("[webrtc] createPeerConnection called but no local stream");
      return null;
    }

    console.log("[webrtc] Creating RTCPeerConnection");
    const pc = new RTCPeerConnection(rtcConfiguration);

    // Add local tracks
    const tracks = stream.getTracks();
    console.log(`[webrtc] Adding ${tracks.length} local tracks:`, tracks.map(t => `${t.kind}:${t.enabled}`));
    tracks.forEach((track) => pc.addTrack(track, stream));

    // ── Remote track received ──────────────────────────────────────
    pc.ontrack = (e) => {
      console.log(`[webrtc] ontrack: kind=${e.track.kind}, streams=${e.streams.length}`);
      const remoteStream = e.streams[0];
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        setRemoteConnected(true);
      }
    };

    // ── ICE candidate generated ────────────────────────────────────
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const c = e.candidate;
        console.log(`[webrtc] ICE candidate: type=${c.type ?? "?"} protocol=${c.protocol ?? "?"} ${c.address ?? ""}:${c.port ?? ""}`);
        socket.emit("ice-candidate", c.toJSON());
      } else {
        console.log("[webrtc] ICE gathering complete (null candidate)");
      }
    };

    // ── Connection state ────────────────────────────────────────────
    pc.onconnectionstatechange = () => {
      console.log(`[webrtc] connectionState: ${pc.connectionState}`);
      if (pc.connectionState === "connected") setRemoteConnected(true);
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        setRemoteConnected(false);
      }
    };

    // ── ICE connection state ───────────────────────────────────────
    pc.oniceconnectionstatechange = () => {
      console.log(`[webrtc] iceConnectionState: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === "failed") {
        console.error("[webrtc] ICE connection FAILED — likely need TURN server or network is blocking");
      }
    };

    // ── ICE gathering state ────────────────────────────────────────
    pc.onicegatheringstatechange = () => {
      console.log(`[webrtc] iceGatheringState: ${pc.iceGatheringState}`);
    };

    // ── Signaling state ────────────────────────────────────────────
    pc.onsignalingstatechange = () => {
      console.log(`[webrtc] signalingState: ${pc.signalingState}`);
    };

    peerConnectionRef.current = pc;
    return pc;
  }, []);

  const flushPendingIce = async (pc: RTCPeerConnection) => {
    const list = [...pendingIceCandidatesRef.current];
    pendingIceCandidatesRef.current = [];
    if (list.length > 0) {
      console.log(`[webrtc] Flushing ${list.length} pending ICE candidates`);
    }
    for (const candidate of list) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("[webrtc] Failed to add queued ICE candidate:", err);
      }
    }
  };

  const createOffer = useCallback(async () => {
    console.log("[webrtc] Creating offer (initiator)");
    const pc = createPeerConnection();
    if (!pc) {
      console.error("[webrtc] Cannot create offer — no peer connection (no local stream?)");
      return;
    }
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("[webrtc] Offer created and set as localDescription, emitting to peer");
      socket.emit("webrtc-offer", pc.localDescription);
    } catch (e) {
      console.error("[webrtc] Failed to create offer:", e);
    }
  }, [createPeerConnection]);

  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    console.log("[webrtc] Received offer, creating answer (non-initiator)");
    const pc = createPeerConnection();
    if (!pc) {
      console.error("[webrtc] Cannot handle offer — no peer connection (no local stream?)");
      return;
    }
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log("[webrtc] Remote description set (offer)");
      await flushPendingIce(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("[webrtc] Answer created and set as localDescription, emitting to peer");
      socket.emit("webrtc-answer", pc.localDescription);
    } catch (e) {
      console.error("[webrtc] Failed to handle offer:", e);
    }
  }, [createPeerConnection]);

  // ── Start camera ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const startCamera = async () => {
      console.log("[media] Requesting getUserMedia...");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        console.log("[media] getUserMedia succeeded:", stream.getTracks().map(t => `${t.kind}:${t.label}`));
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        cameraReadyRef.current = true;
        setCameraReady(true);
        if (pendingOfferRef.current) {
          const pendingOffer = pendingOfferRef.current;
          pendingOfferRef.current = null;
          await handleOffer(pendingOffer);
        }
      } catch (e) {
        console.error("[media] getUserMedia failed:", e);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      cameraReadyRef.current = false;
      pendingIceCandidatesRef.current = [];
      pendingOfferRef.current = null;
      chatReadySentRef.current = false;
    };
  }, [handleOffer]);

  // ── Socket event listeners ─────────────────────────────────────────
  useEffect(() => {
    const onPartnerLeft = () => navigate("/home");
    const onMessage = (msg: string) => {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), text: msg, sender: "partner" }]);
      // Track unread when chat drawer is closed (mobile)
      setUnreadCount((prev) => prev + 1);
    };
    const onIce = async (candidate: RTCIceCandidateInit) => {
      const pc = peerConnectionRef.current;
      if (!pc || !pc.remoteDescription) {
        console.log("[webrtc] Queuing ICE candidate (no remote description yet)");
        pendingIceCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("[webrtc] Failed to add ICE candidate:", err);
      }
    };
    const onOffer = async (offer: RTCSessionDescriptionInit) => {
      console.log("[webrtc] Received offer from peer");
      if (!cameraReadyRef.current) {
        console.log("[webrtc] Camera not ready, queuing offer");
        pendingOfferRef.current = offer;
        return;
      }
      await handleOffer(offer);
    };
    const onAnswer = async (answer: RTCSessionDescriptionInit) => {
      console.log("[webrtc] Received answer from peer");
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("[webrtc] Remote description set (answer)");
        await flushPendingIce(pc);
      } catch (e) {
        console.error("[webrtc] Failed to set answer:", e);
      }
    };
    const onBothReady = () => {
      console.log("[signaling] Both users ready");
      setBothUsersReady(true);
    };
    const onPartnerCamera = (data: { enabled: boolean }) => setPartnerCameraOn(data.enabled);
    const onPartnerMic = (data: { enabled: boolean }) => setPartnerMicOn(data.enabled);

    socket.on("partner-left", onPartnerLeft);
    socket.on("receive-message", onMessage);
    socket.on("ice-candidate", onIce);
    socket.on("webrtc-offer", onOffer);
    socket.on("webrtc-answer", onAnswer);
    socket.on("both-users-ready", onBothReady);
    socket.on("partner-camera-state", onPartnerCamera);
    socket.on("partner-mic-state", onPartnerMic);

    // NOTE: "chat-ready" is NOT emitted here anymore.
    // It is emitted in a separate useEffect after cameraReady is true.

    return () => {
      socket.off("partner-left", onPartnerLeft);
      socket.off("receive-message", onMessage);
      socket.off("ice-candidate", onIce);
      socket.off("webrtc-offer", onOffer);
      socket.off("webrtc-answer", onAnswer);
      socket.off("both-users-ready", onBothReady);
      socket.off("partner-camera-state", onPartnerCamera);
      socket.off("partner-mic-state", onPartnerMic);
    };
  }, [navigate, handleOffer]);

  // ── Emit "chat-ready" only after camera is ready ─────────────────
  // This fixes the race where chat-ready was emitted before getUserMedia
  // succeeded, causing the initiator to call createOffer with no stream.
  useEffect(() => {
    if (cameraReady && !chatReadySentRef.current) {
      chatReadySentRef.current = true;
      console.log("[signaling] Camera ready — emitting chat-ready");
      socket.emit("chat-ready");
    }
  }, [cameraReady]);

  // ── Create offer when both peers are ready (initiator only) ──────
  useEffect(() => {
    if (!cameraReady || !bothUsersReady || !isInitiatorRef.current || offerCreatedRef.current) return;
    offerCreatedRef.current = true;
    console.log("[webrtc] Both ready + initiator → creating offer");
    createOffer();
  }, [cameraReady, bothUsersReady, createOffer]);

  const handleLeaveChat = () => {
    socket.emit("leave-chat");
    navigate("/home");
  };

  const handleToggleMic = () => {
    const enabled = !isMicOn;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = enabled; });
    setIsMicOn(enabled);
    socket.emit("mic-state", { enabled });
  };

  const handleToggleCamera = () => {
    const enabled = !isCameraOn;
    localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = enabled; });
    setIsCameraOn(enabled);
    socket.emit("camera-state", { enabled });
  };

  const handleSendMessage = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    socket.emit("send-message", trimmed);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), text: trimmed, sender: "me" }]);
    setMessage("");
  };

  const userName = userProfile.name?.split(" ")[0] ?? "You";
  const userInitial = userName.charAt(0).toUpperCase();

  // Clear unread count when chat drawer opens
  const handleOpenChat = () => {
    setIsChatOpen(true);
    setUnreadCount(0);
  };

  return (
    <div className="chat-page flex h-screen flex-col overflow-hidden bg-[#08080f] text-white">
      {/* ── Ambient background ──────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-64 -top-64 h-[700px] w-[700px] rounded-full bg-purple-700/8 blur-[140px]" />
        <div className="absolute -bottom-64 -right-64 h-[700px] w-[700px] rounded-full bg-violet-700/8 blur-[140px]" />
      </div>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="chat-header relative z-10 flex shrink-0 items-center justify-between border-b border-white/[0.05] bg-black/30 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <span className="text-lg font-extrabold tracking-tight">Yolo</span>
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-4 py-1.5 sm:flex">
          <span className={`h-2 w-2 rounded-full ${remoteConnected ? "bg-green-400" : "animate-pulse bg-purple-400"}`} />
          <span className="text-[11px] font-medium uppercase tracking-widest text-white/35">
            {remoteConnected ? `Connected with ${partnerName}` : !cameraReady ? "Starting camera" : "Connecting…"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {userName !== "You" && <span className="hidden text-sm text-white/35 sm:block">{userName}</span>}
          <Avatar className="h-8 w-8 border border-white/10">
            {userProfile.profilePicture && <AvatarImage src={userProfile.profilePicture} alt={userName} />}
            <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-800 text-xs font-bold text-gray-300">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <Button
            id="leave-chat-btn"
            onClick={handleLeaveChat}
            size="icon"
            className="h-8 w-8 rounded-full bg-red-500/15 text-red-400 ring-1 ring-red-500/30 transition-all duration-200 hover:bg-red-500 hover:text-white"
            title="Leave chat"
          >
            <PhoneOff className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="relative z-10 flex min-h-0 flex-1">
        {/* ── Video section ──────────────────────────────────────── */}
        <section className="chat-video-section relative flex min-h-0 flex-1 flex-col p-2 lg:w-1/2 lg:flex-none lg:px-4 lg:py-4">
          <div className="grid min-h-0 flex-1 grid-rows-2 gap-2 sm:gap-3">
            <VideoCard
              videoRef={remoteVideoRef}
              label="Stranger"
              name={partnerName}
              cameraOff={!partnerCameraOn && remoteConnected}
              connecting={!remoteConnected}
              micMuted={!partnerMicOn}
            />
            <div className="relative min-h-0">
              <VideoCard
                videoRef={localVideoRef}
                label="You"
                name={userName}
                muted
                profilePicture={userProfile.profilePicture}
                cameraOff={!isCameraOn}
              />
              <div className="chat-call-controls absolute bottom-3 left-1/2 z-20 -translate-x-1/2 sm:bottom-5">
                <CallControls
                  isMicOn={isMicOn}
                  isCameraOn={isCameraOn}
                  onToggleMic={handleToggleMic}
                  onToggleCamera={handleToggleCamera}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Desktop chat panel ─────────────────────────────────── */}
        <div className="hidden min-w-0 flex-1 lg:flex">
          <ChatPanel
            messages={messages}
            message={message}
            onMessageChange={setMessage}
            onSend={handleSendMessage}
            remoteConnected={remoteConnected}
            partnerMicOn={partnerMicOn}
            userName={userName}
            userProfilePicture={userProfile.profilePicture}
            partnerName={partnerName}
          />
        </div>

        {/* ── Mobile: floating chat button ───────────────────────── */}
        {!isChatOpen && (
          <Button
            onClick={handleOpenChat}
            size="icon"
            className={`chat-fab absolute z-30 h-12 w-12 rounded-full bg-purple-600 text-white shadow-lg shadow-purple-900/40 hover:bg-purple-500 lg:hidden ${
              unreadCount > 0 ? "chat-fab-unread" : ""
            }`}
            title="Open chat"
          >
            <MessageCircle className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        )}

        {/* ── Mobile: chat drawer backdrop ───────────────────────── */}
        <div
          className={`chat-drawer-backdrop fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
            isChatOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setIsChatOpen(false)}
        />

        {/* ── Mobile: chat drawer ────────────────────────────────── */}
        <div
          className={`chat-drawer fixed inset-y-0 right-0 z-40 w-[85%] max-w-sm border-l border-white/10 bg-[#0b0912]/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out lg:hidden ${
            isChatOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="relative flex h-full flex-col">
            <Button
              onClick={() => setIsChatOpen(false)}
              size="icon"
              className="absolute right-3 top-3 z-50 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20"
              title="Close chat"
            >
              <X className="h-4 w-4" />
            </Button>
            <ChatPanel
              messages={messages}
              message={message}
              onMessageChange={setMessage}
              onSend={handleSendMessage}
              remoteConnected={remoteConnected}
              partnerMicOn={partnerMicOn}
              userName={userName}
              userProfilePicture={userProfile.profilePicture}
              partnerName={partnerName}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
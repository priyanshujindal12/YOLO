import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../lib/socket";
import { useLocation } from "react-router-dom";
import { PhoneOff } from "lucide-react";
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

const rtcConfiguration: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function Chat() {
  const location = useLocation();
  const navigate = useNavigate();

  const initiator: boolean = location.state?.initiator ?? false;
  // My profile info (passed from Home)
  const userProfile: { name?: string; profilePicture?: string | null } =
    location.state?.user ?? {};
  // Partner's first name (passed from Home via backend)
  const partnerName: string = location.state?.partnerName ?? "Stranger";

  // ── UI state ──────────────────────────────────────────────────────────────
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [bothUsersReady, setBothUsersReady] = useState(false);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [partnerCameraOn, setPartnerCameraOn] = useState(true);
  const [partnerMicOn, setPartnerMicOn] = useState(true);

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // ── WebRTC refs ───────────────────────────────────────────────────────────
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  const cameraReadyRef = useRef(false);
  const offerCreatedRef = useRef(false);
  const isInitiatorRef = useRef(initiator);

  useEffect(() => { isInitiatorRef.current = initiator; }, [initiator]);

  // ── WebRTC helpers ────────────────────────────────────────────────────────

  const createPeerConnection = (): RTCPeerConnection | null => {
    if (peerConnectionRef.current) return peerConnectionRef.current;
    const stream = localStreamRef.current;
    if (!stream) return null;

    const pc = new RTCPeerConnection(rtcConfiguration);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.ontrack = (e) => {
      const rs = e.streams[0];
      if (remoteVideoRef.current && rs) {
        remoteVideoRef.current.srcObject = rs;
        setRemoteConnected(true);
      }
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("ice-candidate", e.candidate.toJSON());
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setRemoteConnected(true);
      if (["disconnected", "failed", "closed"].includes(pc.connectionState))
        setRemoteConnected(false);
    };
    peerConnectionRef.current = pc;
    return pc;
  };

  const flushPendingIce = async (pc: RTCPeerConnection) => {
    const list = [...pendingIceCandidatesRef.current];
    pendingIceCandidatesRef.current = [];
    for (const c of list) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
    }
  };

  const createOffer = async () => {
    const pc = createPeerConnection();
    if (!pc) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc-offer", pc.localDescription);
    } catch (e) { console.error("[webrtc] offer:", e); }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    const pc = createPeerConnection();
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await flushPendingIce(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc-answer", pc.localDescription);
    } catch (e) { console.error("[webrtc] handle offer:", e); }
  };

  // ── Camera startup ────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        cameraReadyRef.current = true;
        setCameraReady(true);
        if (pendingOfferRef.current) {
          const q = pendingOfferRef.current;
          pendingOfferRef.current = null;
          await handleOffer(q);
        }
      } catch (e) { console.error("[media] camera:", e); }
    };
    startCamera();
    return () => {
      cancelled = true;
      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      cameraReadyRef.current = false;
      pendingIceCandidatesRef.current = [];
      pendingOfferRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Socket listeners ──────────────────────────────────────────────────────

  useEffect(() => {
    const onPartnerLeft = () => navigate("/home");
    const onMessage = (msg: string) =>
      setMessages((p) => [...p, { id: crypto.randomUUID(), text: msg, sender: "partner" }]);
    const onIce = async (c: RTCIceCandidateInit) => {
      const pc = peerConnectionRef.current;
      if (!pc || !pc.remoteDescription) { pendingIceCandidatesRef.current.push(c); return; }
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
    };
    const onOffer = async (offer: RTCSessionDescriptionInit) => {
      if (!cameraReadyRef.current) { pendingOfferRef.current = offer; return; }
      await handleOffer(offer);
    };
    const onAnswer = async (answer: RTCSessionDescriptionInit) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingIce(pc);
      } catch (e) { console.error("[webrtc] answer:", e); }
    };
    const onBothReady = () => setBothUsersReady(true);
    const onPartnerCamera = (d: { enabled: boolean }) => setPartnerCameraOn(d.enabled);
    const onPartnerMic = (d: { enabled: boolean }) => setPartnerMicOn(d.enabled);

    socket.on("partner-left", onPartnerLeft);
    socket.on("receive-message", onMessage);
    socket.on("ice-candidate", onIce);
    socket.on("webrtc-offer", onOffer);
    socket.on("webrtc-answer", onAnswer);
    socket.on("both-users-ready", onBothReady);
    socket.on("partner-camera-state", onPartnerCamera);
    socket.on("partner-mic-state", onPartnerMic);
    socket.emit("chat-ready");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  useEffect(() => {
    if (!cameraReady || !bothUsersReady || !isInitiatorRef.current) return;
    if (offerCreatedRef.current) return;
    offerCreatedRef.current = true;
    createOffer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraReady, bothUsersReady]);

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleLeaveChat = () => { socket.emit("leave-chat"); navigate("/home"); };

  const handleToggleMic = () => {
    const enabled = !isMicOn;
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = enabled; });
    setIsMicOn(enabled);
    socket.emit("mic-state", { enabled });
  };

  const handleToggleCamera = () => {
    const enabled = !isCameraOn;
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = enabled; });
    setIsCameraOn(enabled);
    socket.emit("camera-state", { enabled });
  };

  const handleSendMessage = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    socket.emit("send-message", trimmed);
    setMessages((p) => [...p, { id: crypto.randomUUID(), text: trimmed, sender: "me" }]);
    setMessage("");
  };

  const userName = userProfile.name?.split(" ")[0] ?? "You";
  const userInitial = userName.charAt(0).toUpperCase();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#08080f] text-white">

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-64 -top-64 h-[700px] w-[700px] rounded-full bg-purple-700/8 blur-[140px]" />
        <div className="absolute -bottom-64 -right-64 h-[700px] w-[700px] rounded-full bg-violet-700/8 blur-[140px]" />
      </div>

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-white/[0.05] bg-black/30 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 text-sm shadow-lg shadow-purple-900/40">
            ⚡
          </div>
          <span className="text-lg font-extrabold tracking-tight">Yolo</span>
        </div>

        {/* Status pill */}
        <div className="hidden items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-4 py-1.5 sm:flex">
          <span className={`h-2 w-2 rounded-full ${remoteConnected ? "bg-green-400" : "animate-pulse bg-purple-400"}`} />
          <span className="text-[11px] font-medium tracking-widest text-white/35 uppercase">
            {remoteConnected ? `Connected with ${partnerName}` : !cameraReady ? "Starting camera" : "Connecting…"}
          </span>
        </div>

        {/* Profile + leave */}
        <div className="flex items-center gap-3">
          {userName !== "You" && (
            <span className="hidden text-sm text-white/35 sm:block">{userName}</span>
          )}
          <Avatar className="h-8 w-8 border border-white/10">
            {userProfile.profilePicture ? (
              <AvatarImage src={userProfile.profilePicture} alt={userName} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-800 text-xs font-bold text-gray-300">
              {userInitial}
            </AvatarFallback>
          </Avatar>

          <Button
            id="leave-chat-btn"
            onClick={handleLeaveChat}
            size="icon"
            className="h-8 w-8 rounded-full bg-red-500/15 text-red-400 ring-1 ring-red-500/30 hover:bg-red-500 hover:text-white transition-all duration-200"
            title="Leave chat"
          >
            <PhoneOff className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* ── Body: 50/50 split ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex min-h-0 flex-1">

        {/* ── Left: Video workspace — 50% ───────────────────────────────── */}
        <section className="flex w-1/2 flex-col px-4 py-4">

          {/* Vertically stacked, equal height — STRANGER on top, YOU on bottom */}
          <div className="grid min-h-0 flex-1 grid-rows-2 gap-3">

            {/* Stranger video — TOP */}
            <VideoCard
              videoRef={remoteVideoRef}
              label="Stranger"
              name={partnerName}
              cameraOff={!partnerCameraOn && remoteConnected}
              connecting={!remoteConnected}
              micMuted={!partnerMicOn}
            />

            {/* My video — BOTTOM */}
            <VideoCard
              videoRef={localVideoRef}
              label="You"
              name={userName}
              muted
              profilePicture={userProfile.profilePicture}
              cameraOff={!isCameraOn}
            />
          </div>

          {/* Mic + Camera controls below videos */}
          <CallControls
            isMicOn={isMicOn}
            isCameraOn={isCameraOn}
            onToggleMic={handleToggleMic}
            onToggleCamera={handleToggleCamera}
          />
        </section>

        {/* ── Right: Chat panel — fills remaining space ─────────────────── */}
        <div className="flex-1 min-w-0">
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
  );
}

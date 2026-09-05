import { useEffect, useState, useRef } from "react";
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

  const createPeerConnection = (): RTCPeerConnection | null => {
    if (peerConnectionRef.current) return peerConnectionRef.current;
    const stream = localStreamRef.current;
    if (!stream) return null;

    const pc = new RTCPeerConnection(rtcConfiguration);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (e) => {
      const remoteStream = e.streams[0];
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        setRemoteConnected(true);
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("ice-candidate", e.candidate.toJSON());
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setRemoteConnected(true);
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        setRemoteConnected(false);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const flushPendingIce = async (pc: RTCPeerConnection) => {
    const list = [...pendingIceCandidatesRef.current];
    pendingIceCandidatesRef.current = [];
    for (const candidate of list) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (_) {}
    }
  };

  const createOffer = async () => {
    const pc = createPeerConnection();
    if (!pc) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc-offer", pc.localDescription);
    } catch (e) {
      console.error("[webrtc] offer:", e);
    }
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
    } catch (e) {
      console.error("[webrtc] handle offer:", e);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
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
        console.error("[media] camera:", e);
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
    };
  }, []);

  useEffect(() => {
    const onPartnerLeft = () => navigate("/home");
    const onMessage = (msg: string) => {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), text: msg, sender: "partner" }]);
    };
    const onIce = async (candidate: RTCIceCandidateInit) => {
      const pc = peerConnectionRef.current;
      if (!pc || !pc.remoteDescription) {
        pendingIceCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (_) {}
    };
    const onOffer = async (offer: RTCSessionDescriptionInit) => {
      if (!cameraReadyRef.current) {
        pendingOfferRef.current = offer;
        return;
      }
      await handleOffer(offer);
    };
    const onAnswer = async (answer: RTCSessionDescriptionInit) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingIce(pc);
      } catch (e) {
        console.error("[webrtc] answer:", e);
      }
    };
    const onBothReady = () => setBothUsersReady(true);
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
  }, [navigate]);

  useEffect(() => {
    if (!cameraReady || !bothUsersReady || !isInitiatorRef.current || offerCreatedRef.current) return;
    offerCreatedRef.current = true;
    createOffer();
  }, [cameraReady, bothUsersReady]);

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

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#08080f] text-white">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-64 -top-64 h-[700px] w-[700px] rounded-full bg-purple-700/8 blur-[140px]" />
        <div className="absolute -bottom-64 -right-64 h-[700px] w-[700px] rounded-full bg-violet-700/8 blur-[140px]" />
      </div>

      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-white/[0.05] bg-black/30 px-5 py-3 backdrop-blur-xl">
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

      <div className="relative z-10 flex min-h-0 flex-1">
        <section className="relative flex min-h-0 flex-1 flex-col p-2 lg:w-1/2 lg:flex-none lg:px-4 lg:py-4">
          <div className="grid min-h-0 flex-1 grid-rows-2 gap-3">
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
              <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2">
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

        {!isChatOpen && (
          <Button
            onClick={() => setIsChatOpen(true)}
            size="icon"
            className="absolute bottom-5 right-5 z-30 h-12 w-12 rounded-full bg-purple-600 text-white shadow-lg shadow-purple-900/40 hover:bg-purple-500 lg:hidden"
            title="Open chat"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
        )}

        {isChatOpen && (
          <div className="absolute inset-y-0 right-0 z-40 w-[85%] max-w-sm border-l border-white/10 bg-[#0b0912]/95 shadow-2xl backdrop-blur-xl lg:hidden">
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
        )}
      </div>
    </div>
  );
}
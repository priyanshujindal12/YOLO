import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../lib/socket";
import { useLocation } from "react-router-dom";

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
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [bothUsersReady, setBothUsersReady] = useState(false);

  const location = useLocation();
  const initiator: boolean = location.state?.initiator ?? false;
  const navigate = useNavigate();

  // DOM refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // WebRTC refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // THE CORE FIX: queue the offer if it arrives before getUserMedia finishes
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  // Refs that mirror state (avoid stale closures in async handlers)
  const cameraReadyRef = useRef(false);
  const offerCreatedRef = useRef(false);
  const isInitiatorRef = useRef(initiator);

  useEffect(() => {
    isInitiatorRef.current = initiator;
  }, [initiator]);

  // ---- Helpers ---------------------------------------------------------------

  const createPeerConnection = (): RTCPeerConnection | null => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const stream = localStreamRef.current;
    console.log("Creating peer connection. Local stream:", stream);

    if (!stream) {
      console.log("Camera stream is NULL — cannot create peer connection yet");
      return null;
    }

    const pc = new RTCPeerConnection(rtcConfiguration);

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      console.log("Received remote track");
      const remoteStream = event.streams[0];
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        setRemoteConnected(true);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate");
        socket.emit("ice-candidate", event.candidate.toJSON());
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("WebRTC connection state:", pc.connectionState);
      if (pc.connectionState === "connected") setRemoteConnected(true);
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        setRemoteConnected(false);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
    };

    peerConnectionRef.current = pc;
    console.log("Peer connection created successfully");
    return pc;
  };

  const flushPendingIceCandidates = async (pc: RTCPeerConnection) => {
    const candidates = [...pendingIceCandidatesRef.current];
    pendingIceCandidatesRef.current = [];
    for (const c of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
        console.log("Pending ICE candidate added");
      } catch (err) {
        console.warn("Error adding buffered ICE candidate:", err);
      }
    }
  };

  const createOffer = async () => {
    try {
      console.log("Creating WebRTC offer...");
      const pc = createPeerConnection();
      if (!pc) {
        console.log("Cannot create offer: peer connection is null");
        return;
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("Local description set");
      console.log("Sending WebRTC offer");
      socket.emit("webrtc-offer", pc.localDescription);
    } catch (err) {
      console.error("Error creating offer:", err);
    }
  };

  // Process a received offer — only called once camera is ready
  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    try {
      console.log("Processing WebRTC offer");
      const pc = createPeerConnection();
      if (!pc) {
        console.error("Cannot handle offer: peer connection is null");
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log("Remote description set");
      await flushPendingIceCandidates(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("Sending WebRTC answer");
      socket.emit("webrtc-answer", pc.localDescription);
    } catch (err) {
      console.error("Error handling WebRTC offer:", err);
    }
  };

  // ---- Camera startup (runs once on mount) -----------------------------------

  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      try {
        console.log("Requesting camera access...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        cameraReadyRef.current = true;
        setCameraReady(true);
        console.log("Camera is ready");

        // THE CORE FIX:
        // If the WebRTC offer arrived while getUserMedia was still pending,
        // it was queued in pendingOfferRef. Process it now.
        if (pendingOfferRef.current) {
          console.log("Camera now ready — processing queued WebRTC offer");
          const queuedOffer = pendingOfferRef.current;
          pendingOfferRef.current = null;
          await handleOffer(queuedOffer);
        }
      } catch (err) {
        console.error("Camera access failed:", err);
        setCameraReady(false);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      console.log("Cleaning up Chat component");

      const pc = peerConnectionRef.current;
      if (pc) {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.onconnectionstatechange = null;
        pc.close();
        peerConnectionRef.current = null;
      }

      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      cameraReadyRef.current = false;
      pendingIceCandidatesRef.current = [];
      pendingOfferRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Socket event listeners ------------------------------------------------

  useEffect(() => {
    const handlePartnerLeft = () => {
      console.log("Your partner left the chat");
      navigate("/home");
    };

    const handleReceiveMessage = (receivedMessage: string) => {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), text: receivedMessage, sender: "partner" },
      ]);
    };

    const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
      try {
        const pc = peerConnectionRef.current;
        if (!pc || !pc.remoteDescription) {
          console.log("Peer connection not ready. Storing ICE candidate");
          pendingIceCandidatesRef.current.push(candidate);
          return;
        }
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("ICE candidate added successfully");
      } catch (err) {
        console.error("Error adding ICE candidate:", err);
      }
    };

    const handleWebRTCOffer = async (offer: RTCSessionDescriptionInit) => {
      console.log("Received WebRTC offer");

      // THE CORE FIX:
      // Camera is not ready yet — queue the offer.
      // The startCamera() effect will pick it up once getUserMedia resolves.
      if (!cameraReadyRef.current) {
        console.log("Camera not ready — queuing WebRTC offer for later");
        pendingOfferRef.current = offer;
        return;
      }

      await handleOffer(offer);
    };

    const handleWebRTCAnswer = async (answer: RTCSessionDescriptionInit) => {
      try {
        console.log("Received WebRTC answer");
        const pc = peerConnectionRef.current;
        if (!pc) {
          console.log("Cannot handle answer: peer connection is null");
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("WebRTC answer successfully applied");
        await flushPendingIceCandidates(pc);
      } catch (err) {
        console.error("Error handling WebRTC answer:", err);
      }
    };

    const handleBothUsersReady = () => {
      console.log("Both users are ready for WebRTC");
      setBothUsersReady(true);
    };

    socket.on("partner-left", handlePartnerLeft);
    socket.on("receive-message", handleReceiveMessage);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("webrtc-offer", handleWebRTCOffer);
    socket.on("webrtc-answer", handleWebRTCAnswer);
    socket.on("both-users-ready", handleBothUsersReady);

    // Tell the server this chat page is mounted and ready
    socket.emit("chat-ready");

    return () => {
      socket.off("partner-left", handlePartnerLeft);
      socket.off("receive-message", handleReceiveMessage);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("webrtc-offer", handleWebRTCOffer);
      socket.off("webrtc-answer", handleWebRTCAnswer);
      socket.off("both-users-ready", handleBothUsersReady);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // ---- Create offer once both camera AND partner are ready -------------------
  // (Initiator only)

  useEffect(() => {
    if (!cameraReady) {
      console.log("Waiting for camera...");
      return;
    }
    if (!bothUsersReady) {
      console.log("Waiting for other user to be ready...");
      return;
    }
    if (!isInitiatorRef.current) {
      console.log("I am not the initiator");
      return;
    }
    if (offerCreatedRef.current) {
      console.log("Offer already created");
      return;
    }

    offerCreatedRef.current = true;
    console.log("Both users and camera are ready. Creating offer...");
    createOffer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraReady, bothUsersReady]);

  // ---- Action handlers -------------------------------------------------------

  const handleLeaveChat = () => {
    socket.emit("leave-chat");
    navigate("/home");
  };

  const handleSendMessage = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    socket.emit("send-message", trimmedMessage);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: trimmedMessage, sender: "me" },
    ]);
    setMessage("");
  };

  // ---- Render ----------------------------------------------------------------

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07070b] p-3 text-white sm:p-6">

      {/* Background effects */}
      <div className="absolute left-[-150px] top-[-150px] h-[350px] w-[350px] rounded-full bg-purple-600/20 blur-[120px]" />
      <div className="absolute bottom-[-150px] right-[-150px] h-[400px] w-[400px] rounded-full bg-violet-600/20 blur-[140px]" />

      {/* Main Chat Container */}
      <div className="relative flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-2xl">

        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 bg-black/20 px-4 py-4 sm:px-8 sm:py-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-violet-500 to-fuchsia-500 text-xl shadow-lg shadow-purple-500/20 sm:h-14 sm:w-14">
                👤
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-4 border-[#111116] bg-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </div>
            </div>

            <div>
              <h1 className="text-sm font-semibold tracking-wide sm:text-base">
                Anonymous Stranger
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
                </span>
                <span className="text-xs text-green-400">
                  {remoteConnected
                    ? "Video connected"
                    : !cameraReady
                    ? "Starting camera..."
                    : "Connecting..."}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLeaveChat}
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-red-500/40 hover:bg-red-500 hover:text-white sm:px-5 sm:text-sm"
          >
            Leave
          </button>
        </header>

        {/* Connection Banner */}
        <div className="border-b border-white/5 bg-white/[0.02] px-4 py-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5">
            <span className={`h-2 w-2 rounded-full ${remoteConnected ? "bg-green-400" : "animate-pulse bg-purple-400"}`} />
            <p className="text-[10px] font-medium tracking-[0.15em] text-purple-300 sm:text-xs">
              {remoteConnected ? "VIDEO CONNECTED" : "CONNECTING TO STRANGER"}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-10 sm:py-8">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-purple-500/30 blur-2xl" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-purple-400/20 bg-gradient-to-br from-purple-500/20 to-violet-500/10 text-5xl shadow-xl">
                  👋
                </div>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">Say hello</h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-gray-400">
                You have been matched with someone new. Start a conversation and discover where it goes.
              </p>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-3 ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                >
                  {msg.sender === "partner" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 text-sm shadow-lg">
                      👤
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg sm:max-w-[70%] sm:px-5 ${
                      msg.sender === "me"
                        ? "rounded-br-md bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-600 text-white shadow-purple-900/30"
                        : "rounded-bl-md border border-white/10 bg-white/[0.07] text-gray-100 shadow-black/20"
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.sender === "me" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 text-xs font-semibold text-gray-300 shadow-lg">
                      ME
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-white/10 bg-black/20 p-4 sm:p-6">
          <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
            <div className="flex flex-1 items-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 transition focus-within:border-purple-500/50 focus-within:bg-white/[0.07] focus-within:ring-4 focus-within:ring-purple-500/10">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
                placeholder="Write a message..."
                className="w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-gray-500"
              />
              <span className="hidden text-xs text-gray-600 sm:block">Enter ↵</span>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="group flex h-[52px] items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-violet-600 px-5 font-medium text-white shadow-lg shadow-purple-900/40 transition-all duration-200 hover:scale-[1.03] hover:shadow-purple-500/30 disabled:cursor-not-allowed disabled:opacity-40 sm:px-6"
            >
              <span className="hidden sm:inline">Send</span>
              <span className="text-lg transition-transform duration-200 group-hover:translate-x-1">→</span>
            </button>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-gray-600">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500/70" />
            Messages are delivered instantly
          </div>
        </div>
      </div>

      {/* Video Section */}
      <div className="relative mx-auto mt-4 aspect-video w-full max-w-5xl overflow-hidden rounded-2xl bg-black">
        <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />

        {!remoteConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0c0c12]">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 text-3xl">👤</div>
            <p className="mt-3 text-sm text-gray-500">
              {!cameraReady ? "Starting camera..." : "Connecting to stranger..."}
            </p>
          </div>
        )}

        <div className="absolute bottom-4 right-4 w-40 overflow-hidden rounded-xl border border-white/20 bg-black">
          <video ref={localVideoRef} autoPlay playsInline muted className="aspect-video w-full object-cover" />
          <div className="absolute bottom-1 left-1 rounded-md bg-black/60 px-2 py-1 text-[10px] text-gray-300">You</div>
        </div>
      </div>
    </div>
  );
}

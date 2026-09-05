import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { socket } from "../lib/socket";
import { useLocation } from "react-router-dom";
type Message = {
  id: string;
  text: string;
  sender: "me" | "partner";
};
const rtcConfiguration: RTCConfiguration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};
export function Chat() {
  const [message, setMessage] = useState("");
  const [bothUsersReady, setBothUsersReady] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const location = useLocation();
  const offerCreatedRef = useRef(false);
  const initiator = location.state?.initiator ?? false;
  const navigate = useNavigate();
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [partnerFound, setPartnerFound] = useState(false);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const isInitiatorRef = useRef(false);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const createPeerConnection = () => {
    if (peerConnectionRef.current) {
      console.log("Using existing peer connection");
      return peerConnectionRef.current;
    }

    console.log(
      "Creating peer connection. Local stream:",
      localStreamRef.current
    );

    if (!localStreamRef.current) {
      console.log("Camera stream is NULL");
      return null;
    }

    const peerConnection = new RTCPeerConnection(
      rtcConfiguration
    );
    peerConnection.onconnectionstatechange = () => {
  console.log(
    "WebRTC connection state:",
    peerConnection.connectionState
  );
};

peerConnection.oniceconnectionstatechange = () => {
  console.log(
    "ICE connection state:",
    peerConnection.iceConnectionState
  );
};
    localStreamRef.current.getTracks().forEach((track) => {
      peerConnection.addTrack(
        track,
        localStreamRef.current!
      );
    });

    peerConnection.ontrack = (event) => {
      console.log("Received remote track");

      const remoteStream = event.streams[0];

      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate");

        socket.emit(
          "ice-candidate",
          event.candidate.toJSON()
        );
      }
    };

    peerConnectionRef.current = peerConnection;

    console.log("Peer connection created successfully");

    return peerConnection;
  };
  const createOffer = async () => {
    try {
      console.log("Creating WebRTC offer...");

      const peerConnection = createPeerConnection();

      if (!peerConnection) {
        console.log("Cannot create offer: peer connection is null");
        return;
      }

      const offer = await peerConnection.createOffer();

      await peerConnection.setLocalDescription(offer);

      console.log("Local description set");
      console.log("Sending WebRTC offer");

      socket.emit(
        "webrtc-offer",
        peerConnection.localDescription
      );
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };

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
      {
        id: crypto.randomUUID(),
        text: trimmedMessage,
        sender: "me",
      },
    ]);

    setMessage("");
  };
  useEffect(() => {
    isInitiatorRef.current = initiator;
    setPartnerFound(true);

    console.log(
      "Chat received initiator:",
      initiator
    );
  }, [initiator]);
  useEffect(() => {
    const startCamera = async () => {
      try {
        console.log("Requesting camera access...");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        setCameraReady(true);

        console.log("Camera is ready");
      } catch (error) {
        console.error("Camera access failed:", error);
        setCameraReady(false);
      }
    };

    startCamera();

    return () => {
       console.log("Cleaning up WebRTC");

  peerConnectionRef.current?.close();
  peerConnectionRef.current = null;

  localStreamRef.current
    ?.getTracks()
    .forEach((track) => {
      track.stop();
    });

  localStreamRef.current = null;

  pendingIceCandidatesRef.current = [];
    };
  }, []);
  useEffect(() => {
    const handlePartnerLeft = () => {
      console.log("Your partner left the chat");
      navigate("/home");
    };

    const handleReceiveMessage = (
      receivedMessage: string
    ) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          text: receivedMessage,
          sender: "partner",
        },
      ]);
    };

    const handleIceCandidate = async (
      candidate: RTCIceCandidateInit
    ) => {
      try {
        const peerConnection = peerConnectionRef.current;

        if (!peerConnection) {
          console.log(
            "Peer connection not ready. Storing ICE candidate"
          );

          pendingIceCandidatesRef.current.push(candidate);
          return;
        }

        if (!peerConnection.remoteDescription) {
          console.log(
            "Remote description not ready. Storing ICE candidate"
          );

          pendingIceCandidatesRef.current.push(candidate);
          return;
        }

        await peerConnection.addIceCandidate(
          new RTCIceCandidate(candidate)
        );

        console.log("ICE candidate added successfully");
      } catch (error) {
        console.error(
          "Error adding ICE candidate:",
          error
        );
      }
    };
    const handleWebRTCOffer = async (
  offer: RTCSessionDescriptionInit
) => {
  try {
    console.log("Received WebRTC offer");

    const peerConnection = createPeerConnection();

    if (!peerConnection) {
      console.log(
        "Cannot handle offer: peer connection is null"
      );
      return;
    }

    console.log("Setting remote description");

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(offer)
    );

    console.log("Remote description set");

    // Add ICE candidates that arrived before
    // the offer was processed
    const pendingCandidates =
      pendingIceCandidatesRef.current;

    pendingIceCandidatesRef.current = [];

    for (const candidate of pendingCandidates) {
      await peerConnection.addIceCandidate(
        new RTCIceCandidate(candidate)
      );

      console.log(
        "Pending ICE candidate added"
      );
    }

    console.log("Creating WebRTC answer");

    const answer =
      await peerConnection.createAnswer();

    console.log("Setting local description");

    await peerConnection.setLocalDescription(
      answer
    );

    console.log("Sending WebRTC answer");

    socket.emit(
      "webrtc-answer",
      peerConnection.localDescription
    );
  } catch (error) {
    console.error(
      "Error handling WebRTC offer:",
      error
    );
  }
};
    const handleWebRTCAnswer = async (
  answer: RTCSessionDescriptionInit
) => {
  try {
    console.log("Received WebRTC answer");

    const peerConnection = peerConnectionRef.current;

    if (!peerConnection) {
      console.log(
        "Cannot handle answer: peer connection is null"
      );
      return;
    }

    console.log("Setting remote description from answer");

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(answer)
    );

    console.log(
      "WebRTC answer successfully applied"
    );

    // Add any ICE candidates that arrived
    // before the remote description was ready
    const pendingCandidates =
      pendingIceCandidatesRef.current;

    pendingIceCandidatesRef.current = [];

    for (const candidate of pendingCandidates) {
      await peerConnection.addIceCandidate(
        new RTCIceCandidate(candidate)
      );

      console.log(
        "Pending ICE candidate added"
      );
    }

  } catch (error) {
    console.error(
      "Error handling WebRTC answer:",
      error
    );
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
    socket.emit("chat-ready");
    return () => {
      socket.off("partner-left", handlePartnerLeft);
      socket.off("receive-message", handleReceiveMessage);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("webrtc-offer", handleWebRTCOffer);
      socket.off("webrtc-answer", handleWebRTCAnswer);
      socket.off("both-users-ready", handleBothUsersReady);
    };
  }, [navigate]);
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

  console.log(
    "Both users and camera are ready. Creating offer..."
  );

  createOffer();
}, [cameraReady, bothUsersReady]);
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

            {/* Partner Avatar */}
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-violet-500 to-fuchsia-500 text-xl shadow-lg shadow-purple-500/20 sm:h-14 sm:w-14">
                👤
              </div>

              {/* Online indicator */}
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-4 border-[#111116] bg-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </div>
            </div>

            <div>
              <h1 className="text-sm font-semibold tracking-wide sm:text-base">
                Anonymous Stranger
              </h1>
              <div>
                
              </div>

              <div className="mt-1 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
                </span>

                <span className="text-xs text-green-400">
                  Online now
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
            <span className="h-2 w-2 rounded-full bg-purple-400" />

            <p className="text-[10px] font-medium tracking-[0.15em] text-purple-300 sm:text-xs">
              YOU ARE CONNECTED WITH SOMEONE NEW
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

              <h2 className="text-2xl font-semibold tracking-tight">
                Say hello
              </h2>

              <p className="mt-3 max-w-sm text-sm leading-relaxed text-gray-400">
                You have been matched with someone new. Start a conversation
                and discover where it goes.
              </p>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-3 ${msg.sender === "me"
                    ? "justify-end"
                    : "justify-start"
                    }`}
                >
                  {/* Partner Avatar */}
                  {msg.sender === "partner" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 text-sm shadow-lg">
                      👤
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg sm:max-w-[70%] sm:px-5 ${msg.sender === "me"
                      ? "rounded-br-md bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-600 text-white shadow-purple-900/30"
                      : "rounded-bl-md border border-white/10 bg-white/[0.07] text-gray-100 shadow-black/20"
                      }`}
                  >
                    {msg.text}
                  </div>

                  {/* My Avatar */}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSendMessage();
                  }
                }}
                placeholder="Write a message..."
                className="w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-gray-500"
              />

              <span className="hidden text-xs text-gray-600 sm:block">
                Enter ↵
              </span>
            </div>

            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="group flex h-[52px] items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-violet-600 px-5 font-medium text-white shadow-lg shadow-purple-900/40 transition-all duration-200 hover:scale-[1.03] hover:shadow-purple-500/30 disabled:cursor-not-allowed disabled:opacity-40 sm:px-6"
            >
              <span className="hidden sm:inline">
                Send
              </span>

              <span className="text-lg transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-gray-600">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500/70" />
            Messages are delivered instantly
          </div>
        </div>
      </div>
      <div className="relative mx-auto aspect-video w-full max-w-5xl overflow-hidden rounded-2xl bg-black">
        {/* Remote video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />

        {/* Local video */}
        <div className="absolute bottom-4 right-4 w-40 overflow-hidden rounded-xl border border-white/20 bg-black">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="aspect-video w-full object-cover"
          />
        </div>
      </div>
    </div>
  );
} 
import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import apiRouter from "./Routes";
import session from "express-session";
import { randomUUID } from "crypto";
const roomReadyUsers = new Map<string, Set<string>>();

const cleanupRoom = (roomId: string) => {
  console.log(`Cleaning up room: ${roomId}`);

  // Get all sockets currently inside the room
  const room = io.sockets.adapter.rooms.get(roomId);

  if (room) {
    for (const socketId of room) {
      const roomSocket = io.sockets.sockets.get(socketId);

      if (roomSocket) {
        roomSocket.leave(roomId);
      }

      socketRooms.delete(socketId);
    }
  }

  // Clear ready state
  roomReadyUsers.delete(roomId);
};
const waitingUsers: {
  socketId: string;
  userId: string;
  name: string;
}[] = [];
const socketRooms = new Map<string, string>();
const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
});
app.use(sessionMiddleware);
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});
io.engine.use((req: Request, res: Response, next: NextFunction) => {

  sessionMiddleware(req, res, next);
});
app.use("/api", apiRouter);


io.on("connection", (socket) => {
  const userId = (socket.request as any).session?.userId;
  console.log("User connected:", socket.id);
  console.log("User ID:", userId);

  if (!userId) {
    console.log("Unauthenticated socket rejected");
    socket.disconnect();
    return;
  }
 socket.on("chat-ready", () => {
  const roomId = socketRooms.get(socket.id);

  if (!roomId) {
    console.log("Chat ready received but user is not in a room");
    return;
  }

  if (!roomReadyUsers.has(roomId)) {
    roomReadyUsers.set(roomId, new Set());
  }

  const readyUsers = roomReadyUsers.get(roomId)!;

  readyUsers.add(socket.id);

  console.log(
    `User ${socket.id} is ready in room ${roomId}`
  );

  // Both users are now ready
  if (readyUsers.size === 2) {
    console.log(
      `Both users are ready in room ${roomId}`
    );

    io.to(roomId).emit("both-users-ready");
  }
});
 socket.on("find-partner", (payload?: { name?: string }) => {
  const userName = payload?.name ?? "Anonymous";
  console.log(`User ${userId} (${userName}) is looking for a partner`);

  const alreadyWaiting = waitingUsers.some(
    (waitingUser) => waitingUser.socketId === socket.id
  );

  if (alreadyWaiting) {
    console.log("User is already waiting");
    return;
  }

  let partner: {
    socketId: string;
    userId: string;
    name: string;
  } | undefined;

  let partnerSocket;

  // Keep removing stale users until we find
  // a valid connected partner
  while (waitingUsers.length > 0) {
    const waitingUser = waitingUsers.shift();

    if (!waitingUser) break;

    const potentialPartnerSocket =
      io.sockets.sockets.get(waitingUser.socketId);

    if (potentialPartnerSocket?.connected) {
      partner = waitingUser;
      partnerSocket = potentialPartnerSocket;
      break;
    }

    console.log(
      `Removing stale user ${waitingUser.socketId} from queue`
    );
  }

  // Nobody valid is waiting
  if (!partner || !partnerSocket) {
    waitingUsers.push({
      socketId: socket.id,
      userId,
      name: userName,
    });

    console.log("User added to waiting queue");

    socket.emit("waiting-for-partner");

    return;
  }

  const roomId = randomUUID();
  roomReadyUsers.set(roomId, new Set());
  socket.join(roomId);
  partnerSocket.join(roomId);

  socketRooms.set(socket.id, roomId);
  socketRooms.set(partnerSocket.id, roomId);

  console.log(
    `Matched ${userId} (${userName}) with ${partner.userId} (${partner.name}) in room ${roomId}`
  );

  // Each user receives their partner's name
  socket.emit("partner-found", {
    roomId,
    initiator: true,
    partnerName: partner.name,
  });

  partnerSocket.emit("partner-found", {
    roomId,
    initiator: false,
    partnerName: userName,
  });
});
  socket.on(
  "webrtc-offer",
  (offer: RTCSessionDescriptionInit) => {
    const roomId = socketRooms.get(socket.id);

    if (!roomId) {
      console.log("Offer sender is not in a room");
      return;
    }

    console.log("Forwarding WebRTC offer");

    socket.to(roomId).emit(
      "webrtc-offer",
      offer
    );
  }
);

socket.on(
  "webrtc-answer",
  (answer: RTCSessionDescriptionInit) => {
    const roomId = socketRooms.get(socket.id);

    if (!roomId) {
      console.log("Answer sender is not in a room");
      return;
    }

    console.log("Forwarding WebRTC answer");

    socket.to(roomId).emit(
      "webrtc-answer",
      answer
    );
  }
);

socket.on(
  "ice-candidate",
  (candidate: RTCIceCandidateInit) => {
    const roomId = socketRooms.get(socket.id);

    if (!roomId) {
      console.log("ICE sender is not in a room");
      return;
    }

    socket.to(roomId).emit(
      "ice-candidate",
      candidate
    );
  }
);
  socket.on("send-message", (message) => {
    const roomId = socketRooms.get(socket.id);

    if (!roomId) {
      console.log("User is not in a chat room");
      return;
    }

    socket.to(roomId).emit("receive-message", message);
  });

  socket.on("camera-state", (data: { enabled: boolean }) => {
    const roomId = socketRooms.get(socket.id);
    if (!roomId) return;
    socket.to(roomId).emit("partner-camera-state", data);
  });

  socket.on("mic-state", (data: { enabled: boolean }) => {
    const roomId = socketRooms.get(socket.id);
    if (!roomId) return;
    socket.to(roomId).emit("partner-mic-state", data);
  });
 socket.on("leave-chat", () => {
  const roomId = socketRooms.get(socket.id);

  if (!roomId) return;

  console.log(`User ${socket.id} left room ${roomId}`);

  socket.to(roomId).emit("partner-left");

  cleanupRoom(roomId);

});
 socket.on("disconnect", () => {
  console.log("User disconnected:", socket.id);

  // Remove from waiting queue
  const waitingUserIndex = waitingUsers.findIndex(
    (waitingUser) => waitingUser.socketId === socket.id
  );

  if (waitingUserIndex !== -1) {
    waitingUsers.splice(waitingUserIndex, 1);

    console.log("User removed from waiting queue");
  }

  // Get room
  const roomId = socketRooms.get(socket.id);

  if (roomId) {
    console.log(
      `User ${socket.id} disconnected from room ${roomId}`
    );

    // Notify partner
    socket.to(roomId).emit("partner-left");

    // Destroy old room completely
    cleanupRoom(roomId);
  }
});
});

const PORT = 8080;

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
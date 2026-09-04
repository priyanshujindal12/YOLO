import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import apiRouter from "./Routes";
import session from "express-session";
import { randomUUID } from "crypto";
const waitingUsers: {
  socketId: string;
  userId: string;
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

  socket.on("find-partner", () => {
    console.log(`User ${userId} is looking for a partner`);

    const alreadyWaiting = waitingUsers.some(
      (waitingUser) => waitingUser.socketId === socket.id
    );

    if (alreadyWaiting) {
      console.log("User is already waiting");
      return;
    }

    const partner = waitingUsers.shift();

    // Nobody is waiting
    if (!partner) {
      waitingUsers.push({
        socketId: socket.id,
        userId,
      });

      console.log("User added to waiting queue");

      socket.emit("waiting-for-partner");

      return;
    }

    const roomId = randomUUID();

    const partnerSocket = io.sockets.sockets.get(
      partner.socketId
    );

    if (!partnerSocket) {
      console.log("Partner disconnected before matching");
      return;
    }

    socket.join(roomId);
    partnerSocket.join(roomId);
    socketRooms.set(socket.id, roomId);
    socketRooms.set(partnerSocket.id, roomId);
    console.log(
      `Matched ${userId} with ${partner.userId} in room ${roomId}`
    );

    // Notify the current user
    socket.emit("partner-found", {
      roomId,
    });

    // Notify the waiting user
    partnerSocket.emit("partner-found", {
      roomId,
    });
  });
  socket.on("send-message", (message) => {
    const roomId = socketRooms.get(socket.id);

    if (!roomId) {
      console.log("User is not in a chat room");
      return;
    }

    socket.to(roomId).emit("receive-message", message);
  });
  socket.on("leave-chat", () => {
    const roomId = socketRooms.get(socket.id);

    if (!roomId) {
      return;
    }

    console.log(`User ${socket.id} left room ${roomId}`);
    socket.to(roomId).emit("partner-left");
    socket.leave(roomId);
    socketRooms.delete(socket.id);
  });
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    const waitingUserIndex = waitingUsers.findIndex(
      (waitingUser) => waitingUser.socketId === socket.id
    );

    if (waitingUserIndex !== -1) {
      waitingUsers.splice(waitingUserIndex, 1);
      console.log("User removed from waiting queue");
    }

    const roomId = socketRooms.get(socket.id);

    if (roomId) {
      console.log(
        `User ${socket.id} left room ${roomId}`
      );
      socket.to(roomId).emit("partner-left");
      socketRooms.delete(socket.id);
    }
  });
});

const PORT = 8080;

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
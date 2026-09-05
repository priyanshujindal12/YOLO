import { Router } from "express";
import { google } from "googleapis";
import { prisma } from "../../db";
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const apiRouter = Router();
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
apiRouter.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});
apiRouter.get("/auth/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "online",
    scope: [
      "openid",
      "email",
      "profile",
    ],
  });

  res.redirect(url);
});
apiRouter.get("/auth/google/callback", async (req, res) => {
  console.log("Google callback received with query:", req.query);
  try {
    const { code } = req.query;

    if (!code || typeof code !== "string") {
      return res.status(400).json({
        message: "Authorization code missing",
      });
    }

    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });

    const { data } = await oauth2.userinfo.get();
    const user = await prisma.user.upsert({
      where: {
        googleId: data.id as string,
      },

      update: {
        name: data.name ?? "",
        email: data.email!,
        profilePicture: data.picture,
      },

      create: {
        googleId: data.id!,
        name: data.name ?? "",
        email: data.email!,
        profilePicture: data.picture,
      },
    });
    req.session.userId = user.id;

    console.log("req.session.userId set to:", req.session.userId);
    console.log("User authenticated:", user.id);

    req.session.save((err) => {
      if (err) {
        console.error("Failed to save session:", err);

        return res.status(500).json({
          message: "Failed to save session",
        });
      }

      console.log("Session saved:", req.sessionID);

      return res.redirect("https://www.yololive.fun/home");
    });
  } catch (error) {
    console.error("Google authentication failed:", error);
    return res.status(500).json({
      message: "Google authentication failed",
    });
  }
});
apiRouter.get("/auth/me", async (req, res) => {
  console.log("Fetching user info for session:", req.session.userId);
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }
    console.log("Fetching user info for userId:", req.session.userId);
    const user = await prisma.user.findUnique({
      where: {
        id: req.session.userId,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    return res.json({
      user,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to get user",
    });
  }
});
apiRouter.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        message: "Failed to logout",
      });
    }

    res.clearCookie("connect.sid");

    res.json({
      message: "Logged out successfully",
    });
  });
});
export default apiRouter;
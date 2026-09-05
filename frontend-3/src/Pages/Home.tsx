import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../lib/socket";

type User = {
  id: string;
  name: string;
  email: string;
  profilePicture: string | null;
};

type Status = "idle" | "searching" | "found";

export function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const navigate = useNavigate();

  const handleFindPartner = () => {
    if (!socket.connected) return;
    socket.emit("find-partner");
    setStatus("searching");
  };

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:8080/api/auth/logout", { credentials: "include", method: "POST" });
    } catch (_) {}
    navigate("/");
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("http://localhost:8080/api/auth/me", {
          credentials: "include",
        });
        if (!response.ok) { navigate("/"); return; }
        const data = await response.json();
        setUser(data.user);
      } catch (error) {
        console.error(error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    if (!socket.connected) socket.connect();

   const handlePartnerFound = (data: {roomId: string;initiator: boolean;}) => {
  console.log("Partner found in Home:",data.roomId,"Initiator:",data.initiator
  );

  setStatus("found");

  setTimeout(() => {
    navigate(`/chat/${data.roomId}`, {
      state: {
        initiator: data.initiator,
      },
    });
  }, 1000);
};
    const handleWaitingForPartner = () => setStatus("searching");

    socket.on("partner-found", handlePartnerFound);
    socket.on("waiting-for-partner", handleWaitingForPartner);

    return () => {
      socket.off("partner-found", handlePartnerFound);
      socket.off("waiting-for-partner", handleWaitingForPartner);
    };
  }, [user, navigate]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#0d0c15",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="yolo-spinner" />
        <style>{`.yolo-spinner{width:32px;height:32px;border:2px solid rgba(168,85,247,0.2);border-top-color:#a855f7;border-radius:50%;animation:spin 0.8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0d0c15",
        display: "flex",
        flexDirection: "column",
        fontFamily: "inherit",
      }}
    >
      {/* Ambient blobs */}
      <div
        style={{
          position: "fixed",
          top: "-300px",
          left: "-300px",
          width: "800px",
          height: "800px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "-300px",
          right: "-300px",
          width: "700px",
          height: "700px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(225,0,255,0.06) 0%, transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Navbar */}
      <nav
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 40px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
          background: "rgba(13,12,21,0.8)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #a855f7, #e100ff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
            }}
          >
            ⚡
          </div>
          <span style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.03em", color: "#fff" }}>
            Yolo
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {user.profilePicture && (
            <img
              src={user.profilePicture}
              alt={user.name}
              style={{ width: "36px", height: "36px", borderRadius: "50%", border: "2px solid rgba(168,85,247,0.4)" }}
            />
          )}
          <span style={{ fontSize: "14px", fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>
            {user.name}
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              color: "rgba(255,255,255,0.5)",
              padding: "6px 14px",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(255,100,100,0.9)";
              e.currentTarget.style.borderColor = "rgba(255,100,100,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.5)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            }}
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Main */}
      <main
        style={{
          position: "relative",
          zIndex: 5,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        {/* Greeting */}
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.35)", marginBottom: "16px", letterSpacing: "0.05em" }}>
          Hey {user.name.split(" ")[0]} 👋
        </p>

        <h1
          style={{
            fontSize: "clamp(2.5rem, 6vw, 5rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            color: "#ffffff",
            lineHeight: 1.1,
            marginBottom: "20px",
          }}
        >
          Ready to{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #a855f7, #e100ff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            connect?
          </span>
        </h1>

        <p
          style={{
            fontSize: "16px",
            color: "rgba(255,255,255,0.4)",
            maxWidth: "440px",
            lineHeight: 1.7,
            marginBottom: "56px",
          }}
        >
          One tap is all it takes. Get matched with a random stranger and start a real conversation.
        </p>

        {/* Find Button */}
        <button
          onClick={handleFindPartner}
          disabled={status === "searching"}
          style={{
            position: "relative",
            background:
              status === "searching"
                ? "rgba(168,85,247,0.2)"
                : "linear-gradient(135deg, #a855f7, #e100ff)",
            border: status === "searching" ? "1px solid rgba(168,85,247,0.4)" : "none",
            borderRadius: "20px",
            color: "#ffffff",
            padding: "20px 56px",
            fontSize: "18px",
            fontWeight: 700,
            cursor: status === "searching" ? "not-allowed" : "pointer",
            letterSpacing: "-0.01em",
            boxShadow:
              status === "searching"
                ? "none"
                : "0 0 60px rgba(168,85,247,0.35), 0 12px 40px rgba(225,0,255,0.2)",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            if (status !== "searching") {
              e.currentTarget.style.transform = "translateY(-3px) scale(1.02)";
              e.currentTarget.style.boxShadow =
                "0 0 80px rgba(168,85,247,0.5), 0 16px 50px rgba(225,0,255,0.3)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0) scale(1)";
            e.currentTarget.style.boxShadow =
              "0 0 60px rgba(168,85,247,0.35), 0 12px 40px rgba(225,0,255,0.2)";
          }}
        >
          {status === "searching" ? (
            <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="yolo-spinner-sm" />
              Finding someone...
            </span>
          ) : status === "found" ? (
            "Match found! ✨"
          ) : (
            "Find Someone"
          )}
        </button>

        {/* Features */}
        <div
          style={{
            marginTop: "80px",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
            maxWidth: "680px",
            width: "100%",
          }}
        >
          {[
            { icon: "🎭", title: "Anonymous", desc: "No name, no face, just you." },
            { icon: "⚡", title: "Instant", desc: "Get matched in seconds." },
            { icon: "🌍", title: "Global", desc: "Meet people worldwide." },
          ].map((f) => (
            <div
              key={f.title}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "16px",
                padding: "24px 20px",
                textAlign: "center",
                backdropFilter: "blur(10px)",
              }}
            >
              <div style={{ fontSize: "28px", marginBottom: "10px" }}>{f.icon}</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff", marginBottom: "6px" }}>{f.title}</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </main>

      <style>{`
        .yolo-spinner { width:28px;height:28px;border:2px solid rgba(168,85,247,0.2);border-top-color:#a855f7;border-radius:50%;animation:spin 0.8s linear infinite }
        .yolo-spinner-sm { width:18px;height:18px;border:2px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;display:inline-block }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
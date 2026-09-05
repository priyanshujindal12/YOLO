import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../lib/socket";
import ShinyText from "../components/ShinyText";
import SplitText from "../components/SplitText";
import SpecularButton from "../components/SpecularButton";

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
    // Send the user's first name so the partner can see who they matched with
    socket.emit("find-partner", { name: user?.name?.split(" ")[0] ?? "Anonymous" });
    setStatus("searching");
  };

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:8080/api/auth/logout", { credentials: "include", method: "POST" });
    } catch (_) { }
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

    const handlePartnerFound = (data: { roomId: string; initiator: boolean; partnerName?: string }) => {
      console.log("Partner found in Home:", data.roomId, "Initiator:", data.initiator, "Partner:", data.partnerName);
      setStatus("found");
      navigate(`/chat/${data.roomId}`, {
        state: {
          initiator: data.initiator,
          partnerName: data.partnerName ?? "Stranger",
          user: user
            ? {
              name: user.name,
              profilePicture: user.profilePicture,
            }
            : undefined,
        },
      });
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

          <span style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.03em", color: "#fff" }}>
            <ShinyText

              text="YOLO"
              speed={2}
              delay={0}
              color="#b5b5b5"
              shineColor="#ffffff"
              spread={120}
              direction="left"
              yoyo={false}
              pauseOnHover={false}
              disabled={false}
            />
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
         
          <SpecularButton
            size="md"
            radius={18}
          
            tint="#ffffff"
            tintOpacity={0}
            blur={0}
            textColor="#f5f5f5"
            lineColor="#ffffff"
            baseColor="#525252"
            intensity={1}
            shineSize={10}
            shineFade={40}
            thickness={1}
            speed={0.35}
            followMouse
            proximity={250}
            autoAnimate={false}
            onClick={handleLogout}
          >
             Logout
          </SpecularButton>
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

        <h1 className=" text-4xl font-bold text-center mb-6" style={{ color: "#fff", lineHeight: 1.2 }}>
          <SplitText
            text="Ready to meet someone new?"
            className="text-16xl font-semibold text-center"
            delay={50}
            duration={1.25}
            ease="power3.out"
            splitType="chars"
            from={{ opacity: 0, y: 40 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            rootMargin="-100px"
            textAlign="center"

          />
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
        {/* Find Button */}
        <div
          style={{
            position: "relative",
            opacity: status === "searching" ? 0.7 : 1,
            transition: "opacity 0.3s ease",
          }}
        >
          {status === "idle" && (
            <SpecularButton onClick={handleFindPartner}>
              Get Started
            </SpecularButton>
          )}

          {status === "searching" && (
            <div style={{ pointerEvents: "none" }}>
              <SpecularButton onClick={() => { }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                  }}
                >
                  <span className="yolo-spinner-sm" />
                  Finding someone...
                </span>
              </SpecularButton>
            </div>
          )}

          {status === "found" && (
            <div style={{ pointerEvents: "none" }}>
              <SpecularButton onClick={() => { }}>
                Match found! ✨
              </SpecularButton>
            </div>
          )}
        </div>
        <div className="mb-60"></div>
      </main>

      <style>{`
        .yolo-spinner { width:28px;height:28px;border:2px solid rgba(168,85,247,0.2);border-top-color:#a855f7;border-radius:50%;animation:spin 0.8s linear infinite }
        .yolo-spinner-sm { width:18px;height:18px;border:2px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;display:inline-block }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
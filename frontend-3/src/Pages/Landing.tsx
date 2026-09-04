import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SoftAurora from "../components/SoftAurora";
import SplitText from "../components/SplitText";
import ShinyText from "../components/ShinyText";


export function Landing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("http://localhost:8080/api/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          navigate("/home", { replace: true });
          return;
        }
        setLoading(false);
      } catch (error) {
        console.error("Auth check failed:", error);
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "#0d0c15" }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div className="yolo-spinner" />
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", letterSpacing: "0.1em" }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#0d0c15",
      }}
    >
      {/* Aurora Background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
        }}
      >
        <SoftAurora
          speed={0.5}
          scale={1.4}
          brightness={0.9}
          color1="#a855f7"
          color2="#e100ff"
          noiseFrequency={2.2}
          noiseAmplitude={1.1}
          bandHeight={0.45}
          bandSpread={1.1}
          octaveDecay={0.12}
          layerOffset={0.3}
          colorSpeed={0.8}
          enableMouseInteraction
          mouseInfluence={0.2}
        />
      </div>

      {/* Dark vignette overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background:
            "radial-gradient(ellipse at center, transparent 20%, rgba(13,12,21,0.7) 80%)",
          pointerEvents: "none",
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
          padding: "24px 48px",
        }}
      >
        <div style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.02em" }}>
          <ShinyText
            text="Yolo"
            color="rgba(255,255,255,0.7)"
            shineColor="#ffffff"
            speed={2.5}
            spread={90}
            yoyo
            className="nav-logo-shiny"
          />
        </div>

        <button
          onClick={() => navigate("/login")}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "12px",
            color: "rgba(255,255,255,0.85)",
            padding: "8px 20px",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
            backdropFilter: "blur(10px)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(168,85,247,0.2)";
            e.currentTarget.style.borderColor = "rgba(168,85,247,0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
          }}
        >
          Sign in
        </button>
      </nav>

      {/* Hero Content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "calc(100vh - 88px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 24px",
        }}
      >

        {/* Headline 1 */}
        <div
          style={{
            fontSize: "clamp(3rem, 6vw, 5rem)",
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            color: "#ffffff",
            marginBottom: "12px",
            maxWidth: "900px",
          }}
        >
          <SplitText
            text="Talk to strangers."
            tag="h1"
            className="landing-headline"
            splitType="chars"
            duration={0.9}
            delay={30}
            ease="power4.out"
            from={{ opacity: 0, y: 60, rotateX: -30 }}
            to={{ opacity: 1, y: 0, rotateX: 0 }}
            rootMargin="0px"
            threshold={0}
            textAlign="center"
          />
        </div>

        {/* Headline 2 */}
        <div
          style={{
            fontSize: "clamp(3rem, 6vw, 5rem)",
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            color: "#ffffff",
            marginBottom: "28px",
            maxWidth: "900px",
          }}
        >
          <SplitText
            text="Find your vibe."
            tag="h2"
            className="landing-headline"
            splitType="chars"
            duration={0.9}
            delay={30}
            ease="power4.out"
            from={{ opacity: 0, y: 60, rotateX: -30 }}
            to={{ opacity: 1, y: 0, rotateX: 0 }}
            rootMargin="0px"
            threshold={0}
            textAlign="center"
          />
        </div>

       <div style={{
        width: "250px",
        height: "250px",
        marginTop: "8px",
       }}>
       
       </div>

      </div>

      <style>{`
        .yolo-spinner {
          width: 32px;
          height: 32px;
          border: 2px solid rgba(168,85,247,0.2);
          border-top-color: #a855f7;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .landing-headline {
          display: inline-block !important;
          font-size: inherit;
          font-weight: inherit;
          letter-spacing: inherit;
          line-height: inherit;
          color: #ffffff;
        }
        .badge-shiny {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.05em;
        }
        .nav-logo-shiny {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
      `}</style>
    </div>
  );
}
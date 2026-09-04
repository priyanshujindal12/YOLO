export function Login() {
  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:8080/api/auth/google";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0d0c15",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow blobs */}
      <div
        style={{
          position: "absolute",
          top: "-200px",
          left: "-200px",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-200px",
          right: "-200px",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(225,0,255,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "420px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "28px",
          padding: "48px 40px",
          backdropFilter: "blur(24px)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #a855f7, #e100ff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              boxShadow: "0 8px 24px rgba(168,85,247,0.4)",
            }}
          >
            ⚡
          </div>
          <span
            style={{
              fontSize: "26px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#ffffff",
            }}
          >
            Yolo
          </span>
        </div>

        <h1
          style={{
            fontSize: "26px",
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            marginBottom: "8px",
            letterSpacing: "-0.02em",
          }}
        >
          Welcome back
        </h1>

        <p
          style={{
            fontSize: "14px",
            color: "rgba(255,255,255,0.45)",
            textAlign: "center",
            marginBottom: "40px",
            lineHeight: 1.6,
          }}
        >
          Sign in to meet someone new and start chatting instantly.
        </p>

        {/* Google Button */}
        <button
          onClick={handleGoogleLogin}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "14px",
            color: "#ffffff",
            padding: "14px 24px",
            fontSize: "15px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.25s ease",
            letterSpacing: "-0.01em",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.13)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          {/* Google SVG */}
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M5.27 9.76A7.08 7.08 0 0 1 19.07 12.3h-7.11V9.88h9.58a9.64 9.64 0 0 1 .14 1.62c0 5.32-3.6 9.12-9.68 9.12A9.88 9.88 0 0 1 2.12 12a9.88 9.88 0 0 1 3.15-2.24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 9.76A9.88 9.88 0 0 0 2.12 12a9.88 9.88 0 0 0 9.88 9.62 9.53 9.53 0 0 0 6.54-2.38L15.1 16.6a6.16 6.16 0 0 1-3.1.8 7.08 7.08 0 0 1-6.73-4.9l-0-.74Z"
            />
            <path
              fill="#4285F4"
              d="M21.56 10.12h-9.58V9.88h9.58Z"
            />
            <path
              fill="#34A853"
              d="M11.9 4.5a9.88 9.88 0 0 0-6.63 2.58l3.5 2.68a6.16 6.16 0 0 1 9.3 2.54h.02l3.43-2.64A9.88 9.88 0 0 0 11.9 4.5Z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            margin: "28px 0",
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.05em" }}>
            SECURE SIGN IN
          </span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
        </div>

        <p
          style={{
            fontSize: "12px",
            color: "rgba(255,255,255,0.25)",
            textAlign: "center",
            lineHeight: 1.7,
          }}
        >
          By continuing, you agree to Yolo's{" "}
          <span style={{ color: "rgba(168,85,247,0.7)", cursor: "pointer" }}>Terms</span> and{" "}
          <span style={{ color: "rgba(168,85,247,0.7)", cursor: "pointer" }}>Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
import SplitText from "../components/SplitText";

export function Login() {
  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:8080/api/auth/google";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0c15",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "-250px",
          left: "-250px",
          width: "650px",
          height: "650px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(168,85,247,0.16) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: "-250px",
          right: "-250px",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(225,0,255,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Login Card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "420px",
          background: "rgba(255,255,255,0.045)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "24px",
          padding: "48px 40px",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* Heading */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "36px",
          }}
        >
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "#ffffff",
              margin: 0,
              marginBottom: "10px",
              letterSpacing: "-0.03em",
            }}
          >

            <SplitText
              text="Welcome to Yolo"
              className="text-2xl font-semibold text-center"
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
              fontSize: "15px",
              color: "rgba(255,255,255,0.5)",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Sign in to meet someone new and start chatting.
          </p>
        </div>

        {/* Standard Google Button */}
        <button
          onClick={handleGoogleLogin}
          style={{
            width: "100%",
            height: "52px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            background: "#ffffff",
            border: "1px solid #dadce0",
            borderRadius: "8px",
            color: "#3c4043",
            fontSize: "16px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
          }}
        
        >
          {/* Google G Logo */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
          >
            <path
              fill="#4285F4"
              d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.23a4.47 4.47 0 0 1-1.94 2.93v2.78h3.14c1.84-1.7 2.92-4.2 2.92-7.74Z"
            />

            <path
              fill="#34A853"
              d="M12 21.75c2.62 0 4.82-.87 6.43-2.36l-3.14-2.78c-.87.58-1.98.92-3.29.92-2.53 0-4.67-1.71-5.44-4.01H3.32v2.87A9.75 9.75 0 0 0 12 21.75Z"
            />

            <path
              fill="#FBBC05"
              d="M6.56 13.52a5.87 5.87 0 0 1 0-3.77V6.88H3.32a9.75 9.75 0 0 0 0 9.24l3.24-2.6Z"
            />

            <path
              fill="#EA4335"
              d="M12 5.47c1.42 0 2.69.49 3.69 1.45l2.77-2.77C16.82 2.62 14.62 1.75 12 1.75A9.75 9.75 0 0 0 3.32 7.12l3.24 2.63C7.33 7.18 9.47 5.47 12 5.47Z"
            />
          </svg>

          <span>Sign in with Google</span>
        </button>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            margin: "32px 0 26px",
          }}
        >
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "rgba(255,255,255,0.08)",
            }}
          />

          <span
            style={{
              fontSize: "11px",
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.12em",
              fontWeight: 500,
            }}
          >
            SECURE SIGN IN
          </span>

          <div
            style={{
              flex: 1,
              height: "1px",
              background: "rgba(255,255,255,0.08)",
            }}
          />
        </div>

        {/* Terms */}
        <p
          style={{
            fontSize: "12px",
            color: "rgba(255,255,255,0.3)",
            textAlign: "center",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          By continuing, you agree to Yolo's{" "}
          <span
            style={{
              color: "rgba(168,85,247,0.85)",
              cursor: "pointer",
            }}
          >
            Terms
          </span>{" "}
          and{" "}
          <span
            style={{
              color: "rgba(168,85,247,0.85)",
              cursor: "pointer",
            }}
          >
            Privacy Policy
          </span>
          .
        </p>
      </div>
    </div>
  );
}
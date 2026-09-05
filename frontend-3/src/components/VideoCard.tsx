// VideoCard — single video feed with Avatar identity overlay in the bottom-left
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

type VideoCardProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  label: string;
  /** Displayed name e.g. "Priyanshu" or "Anonymous Stranger" */
  name?: string;
  muted?: boolean;
  profilePicture?: string | null;
  /** Show camera-off placeholder */
  cameraOff?: boolean;
  /** Show connecting placeholder (no stream yet) */
  connecting?: boolean;
  /** Show mic-muted badge */
  micMuted?: boolean;
};

export function VideoCard({
  videoRef,
  label,
  name,
  muted = false,
  profilePicture,
  cameraOff = false,
  connecting = false,
  micMuted = false,
}: VideoCardProps) {
  const showPlaceholder = cameraOff || connecting;
  const displayName = name ?? label;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-[#0d0d16] border border-white/[0.07] shadow-2xl">
      {/* ── Video feed ─────────────────────────────────────────── */}
      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        autoPlay
        playsInline
        muted={muted}
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          showPlaceholder ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      />

      {/* ── Placeholder overlay (camera off / connecting) ───────── */}
      {showPlaceholder && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0d0d16]">
          <Avatar className="h-20 w-20 border-2 border-white/10">
            {profilePicture && !connecting ? (
              <AvatarImage src={profilePicture} alt={displayName} className="opacity-50" />
            ) : null}
            <AvatarFallback className="text-2xl bg-white/[0.06]">
              {connecting ? "👤" : initial}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <p className="text-sm font-medium text-white/50">{displayName}</p>
            <p className="mt-0.5 text-xs text-white/25">
              {connecting ? "Connecting…" : "Camera is turned off"}
            </p>
          </div>
        </div>
      )}

      {/* ── Bottom-left identity overlay ────────────────────────── */}
      <div className="absolute bottom-4 left-4">
        <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-md">
          <Avatar className="h-6 w-6 border border-white/20">
            {profilePicture ? (
              <AvatarImage src={profilePicture} alt={displayName} />
            ) : null}
            <AvatarFallback className="text-[10px] bg-gradient-to-br from-purple-600 to-violet-600">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-white/90">{displayName}</span>
          {micMuted && (
            <span className="ml-0.5 rounded-full bg-red-500/70 p-0.5">
              {/* tiny mic-off icon */}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <line x1="2" y1="2" x2="22" y2="22"/>
                <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/>
                <path d="M5 10v2a7 7 0 0 0 12 5"/>
                <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/>
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="8" y1="22" x2="16" y2="22"/>
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

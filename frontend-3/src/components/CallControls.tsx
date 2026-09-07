// CallControls — mic and camera toggle using lucide-react + shadcn Button
// Leave button intentionally omitted per requirements
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Button } from "./ui/button";
import { clsx } from "clsx";

type CallControlsProps = {
  isMicOn: boolean;
  isCameraOn: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
};

export function CallControls({
  isMicOn,
  isCameraOn,
  onToggleMic,
  onToggleCamera,
}: CallControlsProps) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-full border border-white/[0.08] bg-black/40 px-5 py-2.5 backdrop-blur-xl shadow-xl shadow-black/30 sm:gap-4 sm:px-6 sm:py-3">
      {/* ── Microphone toggle ─────────────────────────────── */}
      <div className="flex flex-col items-center gap-1">
        <Button
          id="mic-toggle-btn"
          onClick={onToggleMic}
          size="icon"
          title={isMicOn ? "Mute microphone" : "Unmute microphone"}
          className={clsx(
            "h-11 w-11 rounded-full transition-all duration-200 active:scale-95 sm:h-12 sm:w-12",
            isMicOn
              ? "bg-white/10 text-white hover:bg-white/20"
              : "bg-red-500/20 text-red-400 ring-1 ring-red-500/50 hover:bg-red-500/30"
          )}
        >
          {isMicOn ? (
            <Mic className="h-5 w-5" />
          ) : (
            <MicOff className="h-5 w-5" />
          )}
        </Button>
        <span className="text-[9px] text-white/35 sm:text-[10px]">
          {isMicOn ? "Mic" : "Muted"}
        </span>
      </div>

      {/* ── Camera toggle ─────────────────────────────────── */}
      <div className="flex flex-col items-center gap-1">
        <Button
          id="camera-toggle-btn"
          onClick={onToggleCamera}
          size="icon"
          title={isCameraOn ? "Turn off camera" : "Turn on camera"}
          className={clsx(
            "h-11 w-11 rounded-full transition-all duration-200 active:scale-95 sm:h-12 sm:w-12",
            isCameraOn
              ? "bg-white/10 text-white hover:bg-white/20"
              : "bg-red-500/20 text-red-400 ring-1 ring-red-500/50 hover:bg-red-500/30"
          )}
        >
          {isCameraOn ? (
            <Video className="h-5 w-5" />
          ) : (
            <VideoOff className="h-5 w-5" />
          )}
        </Button>
        <span className="text-[9px] text-white/35 sm:text-[10px]">
          {isCameraOn ? "Camera" : "Cam off"}
        </span>
      </div>
    </div>
  );
}

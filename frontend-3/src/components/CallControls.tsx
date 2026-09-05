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
    <div className="flex items-center justify-center gap-4 py-4">
      {/* ── Microphone toggle ─────────────────────────────── */}
      <div className="flex flex-col items-center gap-1.5">
        <Button
          id="mic-toggle-btn"
          onClick={onToggleMic}
          size="icon"
          title={isMicOn ? "Mute microphone" : "Unmute microphone"}
          className={clsx(
            "h-12 w-12 rounded-full transition-all duration-200 active:scale-95",
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
        <span className="text-[10px] text-white/35">
          {isMicOn ? "Mic" : "Muted"}
        </span>
      </div>

      {/* ── Camera toggle ─────────────────────────────────── */}
      <div className="flex flex-col items-center gap-1.5">
        <Button
          id="camera-toggle-btn"
          onClick={onToggleCamera}
          size="icon"
          title={isCameraOn ? "Turn off camera" : "Turn on camera"}
          className={clsx(
            "h-12 w-12 rounded-full transition-all duration-200 active:scale-95",
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
        <span className="text-[10px] text-white/35">
          {isCameraOn ? "Camera" : "Cam off"}
        </span>
      </div>
    </div>
  );
}

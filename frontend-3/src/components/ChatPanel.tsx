// ChatPanel — right-side chat column with shadcn Avatar in message bubbles
import { useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

type Message = {
  id: string;
  text: string;
  sender: "me" | "partner";
};

type ChatPanelProps = {
  messages: Message[];
  message: string;
  onMessageChange: (val: string) => void;
  onSend: () => void;
  remoteConnected: boolean;
  partnerMicOn: boolean;
  userName?: string;
  userProfilePicture?: string | null;
  /** The matched partner's real first name (from backend) */
  partnerName?: string;
};

export function ChatPanel({
  messages,
  message,
  onMessageChange,
  onSend,
  remoteConnected,
  partnerMicOn,
  userName,
  userProfilePicture,
  partnerName = "Stranger",
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const userInitial = userName?.charAt(0).toUpperCase() ?? "?";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <aside className="flex h-full w-full flex-col border-l border-white/[0.06] bg-black/20">

      {/* ── Chat header ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
        <Avatar className="h-9 w-9 border border-white/10">
          <AvatarFallback className="bg-gradient-to-br from-purple-600 to-violet-600 text-sm">
            👤
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {partnerName}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                remoteConnected
                  ? "bg-green-400"
                  : "animate-pulse bg-yellow-400"
              }`}
            />
            <span className="text-[10px] text-white/40">
              {remoteConnected ? "Online" : "Connecting…"}
            </span>
            {!partnerMicOn && (
              <span className="ml-1 rounded-full bg-red-500/20 px-1.5 py-px text-[9px] text-red-400">
                Muted
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Message list ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-3 px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center select-none">
            <Avatar className="mb-4 h-14 w-14 border border-purple-400/20">
              <AvatarFallback className="bg-gradient-to-br from-purple-500/15 to-violet-500/10 text-2xl">
                💬
              </AvatarFallback>
            </Avatar>
            <p className="text-sm font-medium text-white/40">Say hello!</p>
            <p className="mt-1 text-xs text-white/20">Start the conversation</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${
                msg.sender === "me" ? "justify-end" : "justify-start"
              }`}
            >
              {/* Stranger avatar (left of their messages) */}
              {msg.sender === "partner" && (
                <Avatar className="h-7 w-7 shrink-0 border border-white/10">
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-violet-600 text-[11px]">
                    👤
                  </AvatarFallback>
                </Avatar>
              )}

              {/* Bubble */}
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.sender === "me"
                    ? "rounded-br-sm bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 text-white shadow-lg shadow-purple-900/30"
                    : "rounded-bl-sm border border-white/8 bg-white/[0.06] text-gray-100"
                }`}
              >
                {msg.text}
              </div>

              {/* My avatar (right of my messages) */}
              {msg.sender === "me" && (
                <Avatar className="h-7 w-7 shrink-0 border border-white/10">
                  {userProfilePicture ? (
                    <AvatarImage src={userProfilePicture} alt={userName ?? "Me"} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-800 text-[10px] font-bold text-gray-300">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input area ───────────────────────────────────────── */}
      <div className="border-t border-white/[0.06] bg-black/20 p-3">
        <div className="flex items-center gap-2">
          <input
            id="chat-message-input"
            type="text"
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Write a message…"
            className="flex-1 rounded-xl border border-white/8 bg-white/[0.05] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/25 transition focus:border-purple-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-purple-500/15"
          />
          <button
            id="send-message-btn"
            onClick={onSend}
            disabled={!message.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-900/30 transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

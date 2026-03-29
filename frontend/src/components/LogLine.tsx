import type { LogEvent } from "../api/client";

interface LogLineProps {
  event: LogEvent;
}

const STEP_COLORS: Record<string, string> = {
  extractor: "text-[#818cf8]",
  searcher: "text-[#22d3ee]",
  crossref: "text-[#a78bfa]",
  scorer: "text-[#fbbf24]",
  emitter: "text-[#00ff88]",
  error: "text-[#f87171]",
};

const MSG_COLORS: Record<string, string> = {
  done: "text-[#d0d0e8]",
  running: "text-[#8888aa]",
  error: "text-[#fca5a5]",
};

export default function LogLine({ event }: LogLineProps) {
  const time = new Date(event.ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const stepColor = STEP_COLORS[event.step] || "text-[#8888aa]";
  const msgColor = MSG_COLORS[event.status] || "text-[#8888aa]";

  return (
    <div className="flex items-start gap-2 py-0.5 animate-log-in">
      <span className="text-[#333348] font-mono text-sm flex-shrink-0 w-[70px]">
        [{time}]
      </span>
      <span className={`font-mono text-sm flex-shrink-0 w-[84px] ${stepColor}`}>
        [{event.step}]
      </span>
      <span className="flex-shrink-0 w-4">
        {event.status === "running" && (
          <span
            className={`inline-block w-3 h-3 border border-current rounded-full border-t-transparent animate-spin ${stepColor}`}
          />
        )}
      </span>
      <span className={`flex-1 font-mono text-sm ${msgColor}`}>
        {event.message}
      </span>
    </div>
  );
}

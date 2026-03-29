import type { LogEvent } from "../api/client";

interface LogLineProps {
  event: LogEvent;
}

const STATUS_COLORS: Record<string, string> = {
  done: "text-green-400",
  running: "text-amber-400",
  error: "text-red-400",
};

export default function LogLine({ event }: LogLineProps) {
  const time = new Date(event.ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const color = STATUS_COLORS[event.status] || "text-gray-400";

  return (
    <div className={`py-0.5 font-mono text-sm animate-fade-in ${color}`}>
      <span className="text-gray-600">[{time}]</span>{" "}
      <span className="text-gray-500">[{event.step}]</span>{" "}
      {event.status === "running" && (
        <span className="inline-block w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin mr-1 align-text-bottom" />
      )}
      {event.message}
    </div>
  );
}

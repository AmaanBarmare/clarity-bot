import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { LogEvent } from "../api/client";
import LogLine from "../components/LogLine";

export default function AgentLogs() {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [active, setActive] = useState(false);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [startTime] = useState(Date.now());
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("lastClaimId");
    if (!id) return;
    setClaimId(id);
    setActive(true);

    const es = api.streamLogs(
      id,
      (event) => { setLogs((prev) => [...prev, event]); },
      () => { setActive(false); }
    );
    esRef.current = es;
    return () => { esRef.current?.close(); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  const elapsed = logs.length > 0
    ? Math.round((Date.now() - startTime) / 1000)
    : 0;

  return (
    <div className="max-w-3xl mx-auto pt-16 px-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold font-mono text-[#00ff88]">Agent Logs</h1>
          <p className="text-sm text-[#555570] mt-1">
            Live pipeline output from the NemoClaw sandbox
          </p>
        </div>
        {active && (
          <div className="flex items-center gap-2 text-xs font-mono text-[#fbbf24]">
            <span className="relative w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-[#fbbf24]" />
              <span className="absolute inset-0 rounded-full bg-[#fbbf24] animate-ping opacity-75" />
            </span>
            PROCESSING
          </div>
        )}
      </div>

      {/* Terminal panel */}
      <div className="bg-[#080810] rounded-xl border border-[#1e1e2e] overflow-hidden">
        {/* Terminal header bar */}
        <div className="h-9 bg-[#0d0d18] border-b border-[#1e1e2e] flex items-center px-4 justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e1e2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e1e2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e1e2e]" />
          </div>
          <span className="text-[10px] font-mono text-[#2d2d40]">
            claritybot &mdash; bash &mdash; 80&times;24
          </span>
          <button
            className="text-[10px] font-mono text-[#555570] hover:text-[#8888aa] cursor-pointer transition-colors"
            onClick={() => setLogs([])}
          >
            Clear
          </button>
        </div>

        {/* Log content */}
        <div className="p-5 min-h-[320px] max-h-[480px] overflow-y-auto flex flex-col gap-0">
          {logs.length === 0 ? (
            <p className="text-[#333348] font-mono text-sm">
              claritybot@agent:~$ waiting for input...
            </p>
          ) : (
            <>
              {logs.map((log, i) => (
                <LogLine key={i} event={log} />
              ))}
              <div ref={bottomRef} />
            </>
          )}
          {/* Blinking cursor */}
          <div className="text-[#00ff88] font-mono text-sm mt-1">
            claritybot@agent:~$ <span className="animate-blink">{"\u2589"}</span>
          </div>
        </div>
      </div>

      {/* Metadata row */}
      {claimId && logs.length > 0 && (
        <div className="mt-3 flex items-center gap-3 text-[10px] font-mono text-[#333348]">
          <span>CLAIM ID {claimId.slice(0, 8)}</span>
          <span>&middot;</span>
          <span>{logs.length} events</span>
          <span>&middot;</span>
          <span>{elapsed}s</span>
        </div>
      )}
    </div>
  );
}

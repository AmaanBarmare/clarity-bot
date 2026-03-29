import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { LogEvent } from "../api/client";
import LogLine from "../components/LogLine";

export default function AgentLogs() {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [active, setActive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const claimId = localStorage.getItem("lastClaimId");
    if (!claimId) return;

    setActive(true);

    const es = api.streamLogs(
      claimId,
      (event) => {
        setLogs((prev) => [...prev, event]);
      },
      () => {
        setActive(false);
      }
    );
    esRef.current = es;

    return () => {
      esRef.current?.close();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <div className="max-w-3xl mx-auto pt-12 px-4">
      <h1 className="font-mono text-2xl font-bold text-green-400 mb-1">Agent Logs</h1>
      <p className="text-gray-500 text-sm mb-6">
        Live pipeline output from the NemoClaw sandbox
      </p>

      <div className="bg-gray-950 rounded-xl border border-gray-800 p-4 min-h-64 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
          <span className="font-mono text-sm text-green-400">
            claritybot@agent:~$
            {active && <span className="animate-blink ml-1">&#9611;</span>}
          </span>
          <button
            className="text-gray-500 hover:text-white text-xs transition-colors"
            onClick={() => setLogs([])}
          >
            Clear
          </button>
        </div>

        {logs.length === 0 ? (
          <p className="text-gray-600 font-mono text-sm">
            Waiting for claim submission...
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {logs.map((log, i) => (
              <LogLine key={i} event={log} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}

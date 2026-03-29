import { useState, useRef, useCallback, useEffect } from "react";
import { api } from "../api/client";
import type { Claim, LogEvent } from "../api/client";
import ResultCard from "../components/ResultCard";

const PIPELINE_STEPS = [
  { key: "extractor", label: "Extract assertions" },
  { key: "searcher", label: "Search sources" },
  { key: "crossref", label: "Cross-reference evidence" },
  { key: "scorer", label: "Score credibility" },
  { key: "emitter", label: "Finalize result" },
];

type StepStatus = "waiting" | "running" | "done" | "error";

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "running")
    return (
      <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    );
  if (status === "done")
    return <span className="text-green-400 text-sm font-bold">&#10003;</span>;
  if (status === "error")
    return <span className="text-red-400 text-sm font-bold">&#10005;</span>;
  return null;
}

export default function CheckClaim() {
  const [claim, setClaim] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({});
  const [result, setResult] = useState<Claim | null>(null);
  const [showPipeline, setShowPipeline] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  const pollResult = useCallback((claimId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const data = await api.getResult(claimId);
        if (data.score !== null) {
          clearInterval(interval);
          setResult(data);
          setIsChecking(false);
        }
      } catch {
        /* keep polling */
      }
      if (attempts >= 180) {
        clearInterval(interval);
        setError("Timed out waiting for result.");
        setIsChecking(false);
      }
    }, 1000);
  }, []);

  const handleSubmit = async () => {
    if (!claim.trim() || isChecking) return;

    setError(null);
    setResult(null);
    setStepStatuses({});
    setShowPipeline(true);
    setIsChecking(true);

    try {
      const { claim_id } = await api.submitClaim(claim.trim());
      localStorage.setItem("lastClaimId", claim_id);

      const es = api.streamLogs(
        claim_id,
        (event: LogEvent) => {
          setStepStatuses((prev) => ({ ...prev, [event.step]: event.status as StepStatus }));
        },
        () => {
          pollResult(claim_id);
        }
      );
      esRef.current = es;

      void api.executePipeline(claim_id).catch((err) => {
        setError(err instanceof Error ? err.message : "Pipeline failed.");
        setIsChecking(false);
        esRef.current?.close();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit claim.");
      setIsChecking(false);
    }
  };

  const getStepStatus = (key: string): StepStatus => {
    return stepStatuses[key] || "waiting";
  };

  return (
    <div className="max-w-2xl mx-auto pt-12 px-4">
      <h1 className="text-2xl font-bold text-white mb-2">Check a Claim</h1>
      <p className="text-gray-400 text-sm mb-6">
        Paste any claim, headline, or viral statement.
      </p>

      <textarea
        rows={4}
        className="w-full resize-none bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-100 placeholder-gray-600 focus:border-green-500 focus:outline-none focus:ring-0 disabled:opacity-50"
        placeholder="e.g. The Eiffel Tower is located in London."
        value={claim}
        onChange={(e) => setClaim(e.target.value)}
        disabled={isChecking}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />

      <button
        className="mt-4 w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleSubmit}
        disabled={isChecking || !claim.trim()}
      >
        {isChecking ? "Checking..." : "Check Claim"}
      </button>

      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

      {showPipeline && (
        <div className="mt-8 space-y-2">
          {PIPELINE_STEPS.map((step, i) => {
            const status = getStepStatus(step.key);
            const circleColor =
              status === "done"
                ? "bg-green-500"
                : status === "running"
                  ? "bg-amber-500"
                  : status === "error"
                    ? "bg-red-500"
                    : "bg-gray-700";
            const labelColor =
              status === "done" || status === "running"
                ? "text-white"
                : status === "error"
                  ? "text-red-300"
                  : "text-gray-500";
            const borderClass =
              status === "running" ? "border-l-2 border-amber-500 pl-3" : "pl-5";

            return (
              <div
                key={step.key}
                className={`flex items-center gap-3 py-2 transition-all ${borderClass}`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${circleColor} transition-colors`}
                >
                  {i + 1}
                </span>
                <span className={`flex-1 text-sm ${labelColor} transition-colors`}>
                  {step.label}
                </span>
                <StepIcon status={status} />
              </div>
            );
          })}
        </div>
      )}

      {result && (
        <div className="mt-8 animate-slide-up">
          <ResultCard claim={result} />
        </div>
      )}
    </div>
  );
}

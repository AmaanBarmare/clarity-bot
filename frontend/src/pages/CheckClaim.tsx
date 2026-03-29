import { useState, useRef, useCallback, useEffect } from "react";
import { Check, X } from "lucide-react";
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

export default function CheckClaim() {
  const [claim, setClaim] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({});
  const [stepMessages, setStepMessages] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Claim | null>(null);
  const [showPipeline, setShowPipeline] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => { esRef.current?.close(); };
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
      } catch { /* keep polling */ }
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
    setStepMessages({});
    setShowPipeline(true);
    setIsChecking(true);

    try {
      const { claim_id } = await api.submitClaim(claim.trim());
      localStorage.setItem("lastClaimId", claim_id);

      const es = api.streamLogs(
        claim_id,
        (event: LogEvent) => {
          setStepStatuses((prev) => ({ ...prev, [event.step]: event.status as StepStatus }));
          if (event.message) {
            setStepMessages((prev) => ({ ...prev, [event.step]: event.message }));
          }
        },
        () => { pollResult(claim_id); }
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

  const getStepStatus = (key: string): StepStatus => stepStatuses[key] || "waiting";

  // Calculate how far the green rail should extend
  const doneCount = PIPELINE_STEPS.filter((s) => getStepStatus(s.key) === "done").length;
  const railHeight = doneCount > 0 ? `${(doneCount / PIPELINE_STEPS.length) * 100}%` : "0%";

  return (
    <div className="max-w-2xl mx-auto pt-16 px-6 pb-24">
      {/* Hero */}
      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#00ff88] mb-4">
        CLARITYBOT
      </div>
      <h1 className="text-3xl font-bold text-white leading-tight">Check any claim.</h1>
      <p className="text-sm text-[#8888aa] mt-2 leading-relaxed max-w-md">
        Paste a headline, rumor, or viral statement.
        Our AI searches primary sources and scores its credibility in seconds.
      </p>

      <div className="border-t border-[#1e1e2e] my-8" />

      {/* Textarea */}
      <textarea
        rows={4}
        className="w-full resize-none rounded-xl bg-[#12121a] border border-[#1e1e2e] text-[#f0f0ff] text-sm leading-relaxed p-5 placeholder-[#333348] focus:border-[#2a2a3d] focus:outline-none"
        style={{ boxShadow: "none" }}
        placeholder={"Try:\n\u00b7 The moon landing was staged in a Hollywood studio.\n\u00b7 Vaccines have been proven to cause autism.\n\u00b7 Napoleon Bonaparte was extremely short."}
        value={claim}
        onChange={(e) => setClaim(e.target.value)}
        disabled={isChecking}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
        }}
        onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 1px #2a2a3d inset"; }}
        onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; }}
      />

      {/* Submit button */}
      {isChecking ? (
        <button
          className="mt-4 w-full py-3.5 rounded-xl text-sm font-mono font-semibold bg-[#001a0a] border border-[#14532d] text-[#00ff88] flex items-center justify-center gap-2"
          disabled
        >
          <span className="w-3.5 h-3.5 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          Analyzing...
        </button>
      ) : (
        <button
          className="mt-4 w-full py-3.5 rounded-xl text-sm font-mono font-semibold bg-[#00ff88] text-[#0a0a0f] hover:bg-[#00cc6a] transition-colors disabled:bg-[#1e1e2e] disabled:text-[#555570]"
          onClick={handleSubmit}
          disabled={!claim.trim()}
        >
          &rarr; Check Claim
        </button>
      )}

      {error && <p className="text-[#fca5a5] text-sm mt-2">{error}</p>}

      {/* Pipeline steps — connected timeline */}
      {showPipeline && (
        <div className="relative pl-10 mt-10 space-y-0">
          {/* Background rail */}
          <div
            className="absolute left-[19px] top-5 bottom-5 w-px bg-[#1e1e2e]"
          />
          {/* Green progress rail */}
          <div
            className="absolute left-[19px] top-5 w-px bg-[#00ff88] opacity-30"
            style={{ height: railHeight, transition: "height 400ms ease" }}
          />

          {PIPELINE_STEPS.map((step, i) => {
            const status = getStepStatus(step.key);
            const msg = stepMessages[step.key] || "";

            const circleBorder =
              status === "done" ? "border-[#22c55e]"
              : status === "running" ? "border-[#f59e0b]"
              : status === "error" ? "border-[#ef4444]"
              : "border-[#2d2d40]";
            const circleBg =
              status === "done" ? "bg-[#001a0a]"
              : status === "running" ? "bg-[#1a0f00]"
              : status === "error" ? "bg-[#1a0505]"
              : "bg-[#12121a]";
            const circleText =
              status === "done" ? "text-[#86efac]"
              : status === "running" ? "text-[#fbbf24]"
              : status === "error" ? "text-[#fca5a5]"
              : "text-[#555570]";
            const circleGlow =
              status === "done" ? "0 0 8px rgba(34,197,94,0.4)"
              : status === "running" ? "0 0 10px rgba(245,158,11,0.5)"
              : "none";

            const labelColor =
              status === "running" ? "text-white font-semibold"
              : status === "error" ? "text-[#fca5a5]"
              : status === "done" ? "text-[#555570]"
              : "text-[#555570]";

            return (
              <div key={step.key} className={`relative flex items-start gap-4 ${i < PIPELINE_STEPS.length - 1 ? "pb-7" : "pb-0"}`}>
                {/* Circle */}
                <div
                  className={`absolute left-[-19px] top-0.5 w-8 h-8 rounded-full flex items-center justify-center border-2 font-mono text-xs font-bold transition-all duration-300 ${circleBorder} ${circleBg} ${circleText}`}
                  style={{ boxShadow: circleGlow }}
                >
                  {status === "done" ? <Check size={14} />
                    : status === "error" ? <X size={14} />
                    : i + 1}
                </div>

                {/* Content */}
                <div className={`flex-1 transition-all ${status === "running" ? "border-l border-[#f59e0b] pl-3" : ""}`}>
                  <div className={`text-sm font-medium transition-colors ${labelColor}`}>
                    {step.label}
                  </div>
                  <div
                    className="text-xs font-mono text-[#555570] mt-0.5 min-h-[16px]"
                    style={{ opacity: msg ? 1 : 0, transition: "opacity 200ms ease" }}
                  >
                    {msg}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-10 animate-card-reveal">
          <ResultCard claim={result} />
        </div>
      )}
    </div>
  );
}

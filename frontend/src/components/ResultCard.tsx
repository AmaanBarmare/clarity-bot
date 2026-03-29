import { useState } from "react";
import { ExternalLink } from "lucide-react";
import type { Claim } from "../api/client";
import ScoreBadge from "./ScoreBadge";
import VerdictTag from "./VerdictTag";

interface ResultCardProps {
  claim: Claim;
  collapsed?: boolean;
}

const VERDICT_CARD_STYLES: Record<string, { bg: string; borderL: string; glow: string }> = {
  FALSE: {
    bg: "#1a0505",
    borderL: "#ef4444",
    glow: "0 0 0 1px #7f1d1d, 0 0 12px rgba(239, 68, 68, 0.15)",
  },
  MISLEADING: {
    bg: "#1a0f00",
    borderL: "#f59e0b",
    glow: "0 0 0 1px #78350f, 0 0 12px rgba(245, 158, 11, 0.15)",
  },
  UNVERIFIED: {
    bg: "#111118",
    borderL: "#6366f1",
    glow: "0 0 0 1px #3730a3",
  },
  TRUE: {
    bg: "#001a0a",
    borderL: "#22c55e",
    glow: "0 0 0 1px #14532d, 0 0 12px rgba(34, 197, 94, 0.15)",
  },
  ERROR: {
    bg: "#1a0505",
    borderL: "#ef4444",
    glow: "0 0 0 1px #7f1d1d, 0 0 12px rgba(239, 68, 68, 0.15)",
  },
};

const DEFAULT_STYLE = { bg: "#12121a", borderL: "#1e1e2e", glow: "none" };

export default function ResultCard({ claim, collapsed = false }: ResultCardProps) {
  const [expanded, setExpanded] = useState(!collapsed);
  const [copied, setCopied] = useState(false);

  const date = new Date(claim.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const truncatedText =
    claim.text.length > 120 ? claim.text.slice(0, 120) + "..." : claim.text;

  const vstyle = claim.verdict
    ? VERDICT_CARD_STYLES[claim.verdict] || DEFAULT_STYLE
    : DEFAULT_STYLE;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(
      `${claim.text} — Score: ${claim.score}/10, Verdict: ${claim.verdict}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`rounded-xl border border-[#1e1e2e] p-6 transition-all duration-300 ${
        collapsed ? "cursor-pointer" : ""
      }`}
      style={{
        backgroundColor: vstyle.bg,
        borderLeftWidth: "4px",
        borderLeftColor: vstyle.borderL,
        boxShadow: vstyle.glow,
        animation: collapsed ? undefined : "cardReveal 400ms forwards",
      }}
      onClick={collapsed ? () => setExpanded(!expanded) : undefined}
    >
      <div className="flex items-center gap-5">
        <ScoreBadge score={claim.score} size={collapsed ? 56 : 80} />
        <div className="flex-1 min-w-0">
          <VerdictTag verdict={claim.verdict} />
          <div className="text-xs font-mono text-[#555570] mt-1.5">{date}</div>
          {collapsed && !expanded && (
            <p className="text-[#8888aa] text-sm italic mt-1 truncate">
              {truncatedText}
            </p>
          )}
        </div>
      </div>

      {expanded && (
        <>
          <div className="mt-4 border-t border-[#1e1e2e] border-opacity-50" />

          <p className="mt-4 text-sm italic text-[#8888aa] leading-relaxed">
            {claim.text}
          </p>

          {claim.explanation && (
            <p className="text-sm text-[#d0d0e8] leading-relaxed mt-3">
              {claim.explanation}
            </p>
          )}

          {claim.sources && claim.sources.length > 0 && (
            <div className="mt-4">
              <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-[#555570] mb-2 block">
                SOURCES
              </span>
              <div className="space-y-0.5">
                {claim.sources.map((src, i) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 py-0.5 text-sm text-[#00ff88] hover:text-white transition-colors"
                    title={src.title}
                  >
                    <ExternalLink size={11} className="text-[#555570] flex-shrink-0" />
                    {src.title.length > 55 ? src.title.slice(0, 55) + "..." : src.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          <button
            className={`mt-3 text-xs font-mono transition-colors ${
              copied ? "text-[#00ff88]" : "text-[#555570] hover:text-[#8888aa]"
            }`}
            onClick={handleShare}
          >
            {copied ? "\u2713 copied" : "\u2197 share result"}
          </button>
        </>
      )}
    </div>
  );
}

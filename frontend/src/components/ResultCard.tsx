import { useState } from "react";
import type { Claim } from "../api/client";
import ScoreBadge from "./ScoreBadge";
import VerdictTag from "./VerdictTag";

interface ResultCardProps {
  claim: Claim;
  collapsed?: boolean;
}

export default function ResultCard({ claim, collapsed = false }: ResultCardProps) {
  const [expanded, setExpanded] = useState(!collapsed);

  const date = new Date(claim.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const truncatedText =
    claim.text.length > 120 ? claim.text.slice(0, 120) + "..." : claim.text;

  return (
    <div
      className={`bg-gray-900 rounded-xl border border-gray-800 p-6 ${
        collapsed ? "cursor-pointer hover:border-gray-700 transition-colors" : ""
      }`}
      onClick={collapsed ? () => setExpanded(!expanded) : undefined}
    >
      <div className="flex items-start gap-4">
        <ScoreBadge score={claim.score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <VerdictTag verdict={claim.verdict} />
            <span className="text-xs text-gray-500">{date}</span>
          </div>
          <p className="text-gray-300 text-sm italic mt-2 wrap-break-word">
            {expanded ? claim.text : truncatedText}
            {!expanded && claim.text.length > 120 && (
              <button
                className="text-green-400 ml-1 not-italic hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(true);
                }}
              >
                Show more
              </button>
            )}
          </p>
        </div>
      </div>

      {expanded && (
        <>
          {claim.explanation && (
            <p className="text-gray-200 text-sm leading-relaxed mt-3">
              {claim.explanation}
            </p>
          )}

          {claim.sources && claim.sources.length > 0 && (
            <div className="mt-4">
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Sources
              </span>
              <div className="mt-2 space-y-1">
                {claim.sources.map((src, i) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-green-400 text-sm hover:underline truncate"
                    title={src.title}
                  >
                    {src.title.length > 60
                      ? src.title.slice(0, 60) + "..."
                      : src.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          <button
            className="text-gray-500 text-xs hover:text-gray-300 mt-3 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(
                `${claim.text} — Score: ${claim.score}/10, Verdict: ${claim.verdict}`
              );
            }}
          >
            Share
          </button>
        </>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";

interface ScoreBadgeProps {
  score: number | null;
  size?: number;
}

function getRingColor(score: number | null) {
  if (score === null || score === undefined)
    return { stroke: "#2d2d40", glow: "none", text: "#555570" };
  if (score <= 3)
    return { stroke: "#ef4444", glow: "rgba(239, 68, 68, 0.5)", text: "#fca5a5" };
  if (score <= 6)
    return { stroke: "#f59e0b", glow: "rgba(245, 158, 11, 0.5)", text: "#fcd34d" };
  return { stroke: "#22c55e", glow: "rgba(34, 197, 94, 0.5)", text: "#86efac" };
}

export default function ScoreBadge({ score, size = 80 }: ScoreBadgeProps) {
  const [showNumber, setShowNumber] = useState(false);
  const [showGlow, setShowGlow] = useState(false);
  const colors = getRingColor(score);
  const r = 34 * (size / 80);
  const circumference = 2 * Math.PI * r;
  const offset = score !== null ? (1 - score / 10) * circumference : 0;
  const strokeW = 5 * (size / 80);

  useEffect(() => {
    if (score !== null) {
      const t1 = setTimeout(() => setShowNumber(true), 400);
      const t2 = setTimeout(() => setShowGlow(true), 600);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      setShowNumber(false);
      setShowGlow(false);
    }
  }, [score]);

  const isNull = score === null || score === undefined;

  return (
    <div
      className="relative flex-shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        boxShadow: showGlow && !isNull
          ? `0 0 20px ${colors.glow}, 0 0 40px ${colors.glow.replace(/[\d.]+\)$/, "0.2)")}`
          : "none",
        transition: "box-shadow 400ms ease",
      }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#1e1e2e"
          strokeWidth={strokeW}
          fill="none"
        />
        {isNull ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#2d2d40"
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray="53 160"
            style={{
              animation: "ringSpinner 1.2s linear infinite",
              transformOrigin: "center",
            }}
          />
        ) : (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 800ms cubic-bezier(0.4, 0, 0.2, 1)",
              transform: "rotate(-90deg)",
              transformOrigin: "center",
            }}
          />
        )}
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          opacity: isNull ? 1 : showNumber ? 1 : 0,
          transition: "opacity 300ms ease",
        }}
      >
        {isNull ? (
          <span className="text-[#555570] font-mono font-bold" style={{ fontSize: size * 0.3 }}>
            --
          </span>
        ) : (
          <span
            className="font-bold font-mono"
            style={{ color: colors.text, fontSize: size * 0.3 }}
          >
            {score}
          </span>
        )}
      </div>
    </div>
  );
}

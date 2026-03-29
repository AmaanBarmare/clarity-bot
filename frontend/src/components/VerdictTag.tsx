import { useState, useEffect } from "react";

interface VerdictTagProps {
  verdict: string | null;
}

const VERDICT_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  FALSE: { bg: "bg-[#450a0a]", text: "text-[#fca5a5]", border: "border-[#7f1d1d]" },
  MISLEADING: { bg: "bg-[#431407]", text: "text-[#fcd34d]", border: "border-[#78350f]" },
  UNVERIFIED: { bg: "bg-[#1e1e2e]", text: "text-[#a5b4fc]", border: "border-[#3730a3]" },
  TRUE: { bg: "bg-[#052e16]", text: "text-[#86efac]", border: "border-[#166534]" },
  ERROR: { bg: "bg-[#450a0a]", text: "text-[#fca5a5]", border: "border-[#7f1d1d]" },
};

function AnimatedDots() {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return <span>checking{".".repeat(dotCount)}</span>;
}

export default function VerdictTag({ verdict }: VerdictTagProps) {
  if (!verdict) {
    return (
      <span className="inline-flex px-3 py-1 rounded-md text-sm font-semibold font-mono uppercase tracking-wide border bg-[#1e1e2e] text-[#555570] border-[#2d2d40]">
        <AnimatedDots />
      </span>
    );
  }

  const style = VERDICT_STYLES[verdict] || VERDICT_STYLES.UNVERIFIED;

  return (
    <span
      className={`inline-flex px-3 py-1 rounded-md text-sm font-semibold font-mono uppercase tracking-wide border ${style.bg} ${style.text} ${style.border}`}
    >
      {verdict}
    </span>
  );
}

import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Claim, Trends } from "../api/client";
import VerdictTag from "../components/VerdictTag";

interface DonutSegment {
  label: string;
  pct: number;
  color: string;
}

function DonutChart({ segments, total }: { segments: DonutSegment[]; total: number }) {
  const cx = 110;
  const cy = 110;
  const r = 80;
  const circumference = 2 * Math.PI * r;
  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 220 220" className="w-48 h-48">
        {segments.map((seg, i) => {
          const dash = (seg.pct / 100) * circumference;
          const gap = circumference - dash;
          const offset = -cumulativeOffset;
          cumulativeOffset += dash;
          return (
            <circle
              key={seg.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="18"
              strokeLinecap="butt"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{
                animation: `fadeIn 400ms ease ${i * 100}ms both`,
              }}
            />
          );
        })}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-white font-bold font-mono"
          style={{ fontSize: "28px" }}
        >
          {total}
        </text>
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 justify-center">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5 text-xs font-mono text-[#8888aa]">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: seg.color }}
            />
            {seg.label} {seg.pct.toFixed(0)}%
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ claims }: { claims: Claim[] }) {
  const days: string[] = [];
  const counts: number[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    days.push(label);
    counts.push(claims.filter((c) => c.created_at.slice(0, 10) === key).length);
  }

  const maxCount = Math.max(...counts, 1);
  const barWidth = 36;
  const chartHeight = 120;
  const gap = (340 - barWidth * 7) / 8;

  return (
    <svg viewBox="0 0 340 160" className="w-full">
      {counts.map((count, i) => {
        const barHeight = (count / maxCount) * chartHeight;
        const x = gap + i * (barWidth + gap);
        const y = chartHeight - barHeight;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill="#00ff88"
              className="hover:fill-[#4ade80] transition-colors"
              style={{
                transformOrigin: `${x + barWidth / 2}px ${chartHeight}px`,
                animation: `barGrow 400ms ease ${i * 50}ms both`,
              }}
            />
            <text
              x={x + barWidth / 2}
              y={145}
              textAnchor="middle"
              fill="#555570"
              style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace" }}
            >
              {days[i]}
            </text>
            {count > 0 && (
              <text
                x={x + barWidth / 2}
                y={y - 4}
                textAnchor="middle"
                fill="#8888aa"
                style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace" }}
              >
                {count}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function getScoreColor(score: number): string {
  if (score < 4) return "#fca5a5";
  if (score < 7) return "#fcd34d";
  return "#86efac";
}

function getScoreGlow(score: number): string {
  if (score < 4) return "0 0 12px rgba(239, 68, 68, 0.15)";
  if (score < 7) return "0 0 12px rgba(245, 158, 11, 0.15)";
  return "0 0 12px rgba(34, 197, 94, 0.15)";
}

function getMostCommonVerdict(claims: Claim[]): string | null {
  const verdicts = claims
    .map((c) => c.verdict)
    .filter((v): v is string => v !== null && v !== "ERROR");
  if (verdicts.length === 0) return null;
  const counts: Record<string, number> = {};
  for (const v of verdicts) counts[v] = (counts[v] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

export default function TrendReport() {
  const [trends, setTrends] = useState<Trends | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getTrends(), api.getAllResults()])
      .then(([t, c]) => { setTrends(t); setClaims(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto pt-16 px-6">
        <h1 className="text-3xl font-bold text-white mb-8">Trend Report</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 rounded-xl border border-[#1e1e2e] shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div className="max-w-3xl mx-auto pt-16 px-6">
        <h1 className="text-3xl font-bold text-white mb-8">Trend Report</h1>
        <div className="py-16 text-center">
          <div className="text-5xl text-[#1e1e2e] mb-4">{"\u25ce"}</div>
          <p className="font-mono text-sm text-[#555570]">Check some claims to see trends.</p>
        </div>
      </div>
    );
  }

  const total = trends?.total ?? claims.length;
  const avgScore = trends?.avg_score ?? 0;
  const mostCommon = getMostCommonVerdict(claims);

  const falsePct = trends?.false_pct ?? 0;
  const misleadPct = trends?.mislead_pct ?? 0;
  const unverifiedPct = trends?.unverified_pct ?? 0;
  const truePct = trends?.true_pct ?? 0;

  const segments: DonutSegment[] = [
    { label: "FALSE", pct: falsePct, color: "#ef4444" },
    { label: "MISLEADING", pct: misleadPct, color: "#f59e0b" },
    { label: "UNVERIFIED", pct: unverifiedPct, color: "#6366f1" },
    { label: "TRUE", pct: truePct, color: "#22c55e" },
  ].filter((s) => s.pct > 0);

  return (
    <div className="max-w-3xl mx-auto pt-16 px-6">
      <h1 className="text-3xl font-bold text-white mb-8">Trend Report</h1>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#12121a] rounded-xl border border-[#1e1e2e] p-5">
          <div className="text-4xl font-bold font-mono text-white">{total}</div>
          <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-[#555570] mt-2">
            CLAIMS CHECKED
          </div>
        </div>
        <div
          className="bg-[#12121a] rounded-xl border border-[#1e1e2e] p-5"
          style={{ boxShadow: getScoreGlow(avgScore) }}
        >
          <div className="text-4xl font-bold font-mono" style={{ color: getScoreColor(avgScore) }}>
            {avgScore.toFixed(1)}
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-[#555570] mt-2">
            AVG SCORE
          </div>
        </div>
        <div className="bg-[#12121a] rounded-xl border border-[#1e1e2e] p-5">
          <VerdictTag verdict={mostCommon} />
          <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-[#555570] mt-3">
            MOST COMMON
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#12121a] rounded-xl border border-[#1e1e2e] p-6">
          <h2 className="text-sm font-semibold text-[#f0f0ff] mb-5">Verdict Distribution</h2>
          {segments.length > 0 ? (
            <DonutChart segments={segments} total={total} />
          ) : (
            <p className="text-[#555570] text-sm text-center py-8">No verdict data yet</p>
          )}
        </div>

        <div className="bg-[#12121a] rounded-xl border border-[#1e1e2e] p-6">
          <h2 className="text-sm font-semibold text-[#f0f0ff] mb-5">Claims per Day</h2>
          <div className="flex items-end justify-center min-h-[160px]">
            <BarChart claims={claims} />
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const cx = 100;
  const cy = 100;
  const r = 80;
  const circumference = 2 * Math.PI * r;
  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 200" className="w-48 h-48">
        {segments.map((seg) => {
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
              strokeWidth="24"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        })}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-white text-3xl font-bold"
          style={{ fontSize: "36px" }}
        >
          {total}
        </text>
      </svg>
      <div className="flex gap-4 mt-4 flex-wrap justify-center">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span
              className="w-3 h-3 rounded-sm inline-block"
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
  const gap = (400 - barWidth * 7) / 8;

  return (
    <svg viewBox="0 0 400 160" className="w-full max-w-md">
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
              rx={2}
              fill="#10b981"
            />
            <text
              x={x + barWidth / 2}
              y={145}
              textAnchor="middle"
              className="fill-gray-500"
              style={{ fontSize: "10px" }}
            >
              {days[i]}
            </text>
            {count > 0 && (
              <text
                x={x + barWidth / 2}
                y={y - 4}
                textAnchor="middle"
                className="fill-gray-400"
                style={{ fontSize: "10px" }}
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
  if (score <= 3) return "text-red-500";
  if (score <= 6) return "text-amber-500";
  return "text-green-500";
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
      .then(([t, c]) => {
        setTrends(t);
        setClaims(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto pt-12 px-4">
        <h1 className="text-2xl font-bold text-white mb-6">Trend Report</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 bg-gray-900 rounded-xl border border-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div className="max-w-3xl mx-auto pt-12 px-4">
        <h1 className="text-2xl font-bold text-white mb-6">Trend Report</h1>
        <p className="text-gray-500 text-center mt-16">Check some claims to see trends.</p>
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
    { label: "UNVERIFIED", pct: unverifiedPct, color: "#6b7280" },
    { label: "TRUE", pct: truePct, color: "#10b981" },
  ].filter((s) => s.pct > 0);

  return (
    <div className="max-w-3xl mx-auto pt-12 px-4">
      <h1 className="text-2xl font-bold text-white mb-6">Trend Report</h1>

      <div className="flex gap-4 mb-8">
        <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="text-2xl font-bold text-white">{total}</div>
          <div className="text-xs text-gray-500 mt-1">claims checked</div>
        </div>
        <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>
            {avgScore.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 mt-1">avg score</div>
        </div>
        <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="mt-0.5">
            <VerdictTag verdict={mostCommon} />
          </div>
          <div className="text-xs text-gray-500 mt-2">most common</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Verdict Distribution</h2>
          {segments.length > 0 ? (
            <DonutChart segments={segments} total={total} />
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">No verdict data yet</p>
          )}
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Claims per Day</h2>
          <div className="flex items-end justify-center min-h-[160px]">
            <BarChart claims={claims} />
          </div>
        </div>
      </div>
    </div>
  );
}

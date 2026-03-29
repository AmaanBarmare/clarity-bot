import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "../api/client";
import type { Claim } from "../api/client";
import ResultCard from "../components/ResultCard";

const FILTERS = ["All", "FALSE", "MISLEADING", "UNVERIFIED", "TRUE"] as const;

const FILTER_ACTIVE_STYLES: Record<string, string> = {
  All: "bg-[#00ff88] text-[#0a0a0f]",
  FALSE: "bg-[#450a0a] text-[#fca5a5] border border-[#7f1d1d]",
  MISLEADING: "bg-[#431407] text-[#fcd34d] border border-[#78350f]",
  UNVERIFIED: "bg-[#1e1e2e] text-[#a5b4fc] border border-[#3730a3]",
  TRUE: "bg-[#052e16] text-[#86efac] border border-[#166534]",
};

export default function History() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.getAllResults().then(setClaims).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting((prev) => new Set(prev).add(id));
    try {
      await api.deleteClaim(id);
      setClaims((prev) => prev.filter((c) => c.id !== id));
    } catch { /* ignore */ } finally {
      setDeleting((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const filtered = claims.filter((c) => {
    if (filter !== "All" && c.verdict !== filter) return false;
    if (search && !c.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto pt-16 px-6">
      <div className="flex items-baseline gap-3 mb-8">
        <h1 className="text-3xl font-bold text-white">History</h1>
        <span className="px-2 py-0.5 rounded-md bg-[#1e1e2e] text-[#8888aa] text-xs font-mono">
          {claims.length} claims
        </span>
      </div>

      <div className="flex gap-3 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3.5 top-3 text-[#555570]" />
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-[#12121a] border border-[#1e1e2e] text-[#f0f0ff] placeholder-[#333348] focus:border-[#2a2a3d] focus:outline-none"
            placeholder="Search claims..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 flex-shrink-0">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all duration-150 ${
                filter === f
                  ? FILTER_ACTIVE_STYLES[f]
                  : "bg-[#12121a] border border-[#1e1e2e] text-[#8888aa]"
              }`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-[72px] rounded-xl border border-[#1e1e2e] shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center">
          <div className="text-5xl text-[#1e1e2e] mb-4">{"\u25ce"}</div>
          <p className="text-[#555570] font-mono text-sm">
            {claims.length === 0 ? "No claims checked yet." : "No claims match your filters."}
          </p>
          {claims.length === 0 && (
            <Link to="/" className="text-[#00ff88] text-sm mt-3 block">
              &rarr; Check your first claim
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((claim) => (
            <div key={claim.id} className="relative group">
              <ResultCard claim={claim} collapsed />
              <button
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-[#1e1e2e] hover:bg-[#450a0a] text-[#555570] hover:text-[#fca5a5]"
                title="Delete claim"
                disabled={deleting.has(claim.id)}
                onClick={(e) => { e.stopPropagation(); handleDelete(claim.id); }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

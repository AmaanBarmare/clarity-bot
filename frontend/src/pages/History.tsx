import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Claim } from "../api/client";
import ResultCard from "../components/ResultCard";

const FILTERS = ["All", "FALSE", "MISLEADING", "UNVERIFIED", "TRUE"] as const;

export default function History() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .getAllResults()
      .then(setClaims)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting((prev) => new Set(prev).add(id));
    try {
      await api.deleteClaim(id);
      setClaims((prev) => prev.filter((c) => c.id !== id));
    } catch {
      /* ignore */
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const filtered = claims.filter((c) => {
    if (filter !== "All" && c.verdict !== filter) return false;
    if (search && !c.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto pt-12 px-4">
      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="text-2xl font-bold text-white">History</h1>
        <span className="text-sm text-gray-500">{claims.length} claims</span>
      </div>

      <div className="space-y-4">
        <input
          type="text"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-100 placeholder-gray-600 focus:border-green-500 focus:outline-none focus:ring-0 text-sm"
          placeholder="Search claims..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-green-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
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
            <div
              key={n}
              className="h-20 bg-gray-900 rounded-xl border border-gray-800 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-gray-500">
            {claims.length === 0
              ? "No claims checked yet."
              : "No claims match your filters."}
          </p>
          {claims.length === 0 && (
            <Link
              to="/"
              className="inline-block mt-3 text-green-400 hover:underline text-sm"
            >
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
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-gray-800 hover:bg-red-900 text-gray-500 hover:text-red-400 disabled:opacity-50"
                title="Delete claim"
                disabled={deleting.has(claim.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(claim.id);
                }}
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

interface VerdictTagProps {
  verdict: string | null;
}

const VERDICT_STYLES: Record<string, string> = {
  FALSE: "bg-red-900 text-red-300",
  MISLEADING: "bg-amber-900 text-amber-300",
  UNVERIFIED: "bg-gray-700 text-gray-300",
  TRUE: "bg-green-900 text-green-300",
  ERROR: "bg-red-900 text-red-300",
};

export default function VerdictTag({ verdict }: VerdictTagProps) {
  if (!verdict) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-700 text-gray-300">
        <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        Checking...
      </span>
    );
  }

  return (
    <span
      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${VERDICT_STYLES[verdict] || VERDICT_STYLES.UNVERIFIED}`}
    >
      {verdict}
    </span>
  );
}

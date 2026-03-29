interface ScoreBadgeProps {
  score: number | null;
}

function getColor(score: number | null): string {
  if (score === null || score === undefined) return "bg-gray-600";
  if (score <= 3) return "bg-red-500";
  if (score <= 6) return "bg-amber-500";
  return "bg-green-500";
}

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  return (
    <div
      className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white animate-scale-in ${getColor(score)}`}
    >
      {score !== null && score !== undefined ? (
        score
      ) : (
        <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
}

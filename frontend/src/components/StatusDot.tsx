interface StatusDotProps {
  online: boolean;
}

export default function StatusDot({ online }: StatusDotProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-2.5 h-2.5 rounded-full ${
          online
            ? "bg-green-400 animate-pulse-dot"
            : "bg-red-400"
        }`}
      />
      <span className={`text-xs ${online ? "text-green-400" : "text-red-400"}`}>
        {online ? "Backend online" : "Backend offline"}
      </span>
    </div>
  );
}

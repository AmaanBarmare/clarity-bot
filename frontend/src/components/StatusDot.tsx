interface StatusDotProps {
  online: boolean;
}

export default function StatusDot({ online }: StatusDotProps) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono text-[#555570]">
      {online ? (
        <>
          <span className="relative w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-[#00ff88]" />
            <span className="absolute inset-0 rounded-full bg-[#00ff88] animate-ping opacity-75" />
          </span>
          <span className="uppercase tracking-wider">ONLINE</span>
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-[#f87171]" />
          <span className="uppercase tracking-wider text-[#f87171]">OFFLINE</span>
        </>
      )}
    </div>
  );
}

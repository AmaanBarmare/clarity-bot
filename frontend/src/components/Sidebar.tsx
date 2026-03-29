import { NavLink } from "react-router-dom";
import { Search, Clock, BarChart2, Terminal } from "lucide-react";
import StatusDot from "./StatusDot";

interface SidebarProps {
  online: boolean;
}

const NAV_ITEMS = [
  { to: "/", label: "Check Claim", icon: Search },
  { to: "/history", label: "History", icon: Clock },
  { to: "/trends", label: "Trend Report", icon: BarChart2 },
  { to: "/logs", label: "Agent Logs", icon: Terminal },
];

export default function Sidebar({ online }: SidebarProps) {
  return (
    <div className="fixed left-0 top-0 w-56 h-screen bg-[#0a0a0f] border-r border-[#1e1e2e] flex flex-col">
      <div className="pt-6 px-5 pb-5 border-b border-[#1e1e2e]">
        <h1 className="font-mono text-xl font-semibold text-[#00ff88]">
          ClarityBot
        </h1>
        <p className="text-xs text-[#555570] mt-0.5">AI Fact-Checker</p>
      </div>

      <div className="px-5 mt-6 mb-2">
        <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-semibold text-[#333348]">
          NAVIGATION
        </span>
      </div>

      <nav className="flex flex-col gap-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 font-medium border-l-2 ${
                  isActive
                    ? "text-white bg-[#1a1a26] border-[#00ff88]"
                    : "text-[#8888aa] hover:text-white hover:bg-[#12121a] border-transparent"
                }`
              }
            >
              <Icon size={14} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto pb-6 px-5">
        <StatusDot online={online} />
      </div>
    </div>
  );
}

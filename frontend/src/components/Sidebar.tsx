import { NavLink } from "react-router-dom";
import StatusDot from "./StatusDot";

interface SidebarProps {
  online: boolean;
}

const NAV_ITEMS = [
  { to: "/", label: "Check Claim", icon: "🔍" },
  { to: "/history", label: "History", icon: "📋" },
  { to: "/trends", label: "Trend Report", icon: "📊" },
  { to: "/logs", label: "Agent Logs", icon: "⌨" },
];

export default function Sidebar({ online }: SidebarProps) {
  return (
    <div className="fixed left-0 top-0 w-56 h-screen bg-gray-950 border-r border-gray-800 flex flex-col">
      <div className="px-4 py-6">
        <h1 className="font-mono text-lg font-bold text-green-400 tracking-tight">
          ClarityBot
        </h1>
        <p className="text-xs text-gray-600 mt-1">AI Fact-Checker</p>
      </div>

      <nav className="flex-1 mt-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `px-4 py-3 flex items-center gap-3 text-sm transition-colors ${
                isActive
                  ? "border-l-2 border-green-400 bg-gray-900 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-900 border-l-2 border-transparent"
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-800">
        <StatusDot online={online} />
      </div>
    </div>
  );
}

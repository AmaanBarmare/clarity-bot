import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { api } from "./api/client";
import Sidebar from "./components/Sidebar";
import CheckClaim from "./pages/CheckClaim";
import History from "./pages/History";
import TrendReport from "./pages/TrendReport";
import AgentLogs from "./pages/AgentLogs";

export default function App() {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const check = () => api.checkHealth().then(setOnline);
    check();
    const interval = setInterval(check, 10_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#111111] text-gray-100">
      <Sidebar online={online} />
      <main className="flex-1 ml-56 overflow-y-auto">
        <Routes>
          <Route path="/" element={<CheckClaim />} />
          <Route path="/history" element={<History />} />
          <Route path="/trends" element={<TrendReport />} />
          <Route path="/logs" element={<AgentLogs />} />
        </Routes>
      </main>
    </div>
  );
}

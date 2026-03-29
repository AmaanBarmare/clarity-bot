const BASE =
  import.meta.env.VITE_API_BASE ??
  (import.meta.env.DEV ? "/api" : "/api");

export interface Claim {
  id: string;
  text: string;
  score: number | null;
  verdict: string | null;
  explanation: string | null;
  sources: { title: string; url: string; snippet: string }[] | null;
  created_at: string;
}

export interface LogEvent {
  step: string;
  status: string;
  message: string;
  ts: string;
}

export interface Trends {
  week: string;
  total: number;
  false_pct: number;
  mislead_pct: number;
  unverified_pct: number;
  true_pct: number;
  avg_score: number;
}

export const api = {
  async submitClaim(claim: string): Promise<{ claim_id: string; status: string }> {
    const res = await fetch(`${BASE}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(err.detail || "Request failed");
    }
    return res.json();
  },

  async executePipeline(claimId: string): Promise<void> {
    const res = await fetch(`${BASE}/execute/${claimId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(err.detail || "Request failed");
    }
  },

  async getResult(claimId: string): Promise<Claim> {
    const res = await fetch(`${BASE}/results/${claimId}`);
    if (!res.ok) throw new Error("Claim not found");
    return res.json();
  },

  async getAllResults(): Promise<Claim[]> {
    const res = await fetch(`${BASE}/results`);
    if (!res.ok) throw new Error("Failed to fetch results");
    return res.json();
  },

  async deleteClaim(claimId: string): Promise<void> {
    const res = await fetch(`${BASE}/results/${claimId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete claim");
  },

  async getTrends(): Promise<Trends | null> {
    try {
      const res = await fetch(`${BASE}/trends`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || !data.week) return null;
      return data;
    } catch {
      return null;
    }
  },

  async getLogs(claimId: string): Promise<LogEvent[]> {
    try {
      const res = await fetch(`${BASE}/logs/${claimId}`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  streamLogs(
    claimId: string,
    onEvent: (event: LogEvent) => void,
    onDone: () => void
  ): EventSource {
    const es = new EventSource(`${BASE}/logs/stream?claim_id=${claimId}`);

    es.addEventListener("log", (e) => {
      const data: LogEvent = JSON.parse(e.data);
      onEvent(data);
      if (data.step === "emitter" && data.status === "done") {
        es.close();
        onDone();
      }
      if (data.status === "error") {
        es.close();
        onDone();
      }
    });

    es.addEventListener("heartbeat", () => {});

    es.onerror = () => {
      es.close();
      onDone();
    };

    return es;
  },

  async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${BASE}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  },
};

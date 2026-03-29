import os
import json
import asyncio
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(Path(__file__).resolve().parent / ".env")

_url = os.getenv("SUPABASE_URL", "")
_key = os.getenv("SUPABASE_KEY", "")
client: Client = create_client(_url, _key)


def _deserialize_sources(row: dict) -> dict:
    if row and isinstance(row.get("sources"), str):
        try:
            row["sources"] = json.loads(row["sources"])
        except (json.JSONDecodeError, TypeError):
            row["sources"] = []
    return row


async def insert_claim(claim_id: str, text: str) -> None:
    await asyncio.to_thread(
        lambda: client.table("claims").insert({
            "id": claim_id,
            "text": text,
            "score": None,
            "verdict": None,
            "explanation": None,
            "sources": None,
        }).execute()
    )


async def update_claim(
    claim_id: str, score: int, verdict: str, explanation: str, sources: list
) -> None:
    await asyncio.to_thread(
        lambda: client.table("claims").update({
            "score": score,
            "verdict": verdict,
            "explanation": explanation,
            "sources": json.dumps(sources),
        }).eq("id", claim_id).execute()
    )


async def get_all_claims() -> list[dict]:
    result = await asyncio.to_thread(
        lambda: client.table("claims")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    return [_deserialize_sources(r) for r in result.data]


async def get_claim(claim_id: str) -> dict | None:
    result = await asyncio.to_thread(
        lambda: client.table("claims")
        .select("*")
        .eq("id", claim_id)
        .limit(1)
        .execute()
    )
    if result and result.data:
        return _deserialize_sources(result.data[0])
    return None


async def insert_log(
    claim_id: str, step: str, status: str, message: str
) -> None:
    await asyncio.to_thread(
        lambda: client.table("logs").insert({
            "claim_id": claim_id,
            "step": step,
            "status": status,
            "message": message,
            "ts": datetime.now(timezone.utc).isoformat(),
        }).execute()
    )


async def get_logs(claim_id: str) -> list[dict]:
    result = await asyncio.to_thread(
        lambda: client.table("logs")
        .select("*")
        .eq("claim_id", claim_id)
        .order("ts", desc=False)
        .execute()
    )
    return result.data


async def upsert_trends(verdict: str, score: int) -> None:
    week_key = datetime.now(timezone.utc).strftime("%Y-W%V")

    existing = await asyncio.to_thread(
        lambda: client.table("trends")
        .select("*")
        .eq("week", week_key)
        .limit(1)
        .execute()
    )

    if existing and existing.data:
        row = existing.data[0]
        total = row["total"] + 1
        false_count = round(row["false_pct"] * row["total"] / 100) + (1 if verdict == "FALSE" else 0)
        mislead_count = round(row["mislead_pct"] * row["total"] / 100) + (1 if verdict == "MISLEADING" else 0)
        unverified_count = round(row["unverified_pct"] * row["total"] / 100) + (1 if verdict == "UNVERIFIED" else 0)
        true_count = round(row["true_pct"] * row["total"] / 100) + (1 if verdict == "TRUE" else 0)
        prev_avg = row["avg_score"] or 0
        avg_score = round((prev_avg * row["total"] + score) / total, 2)
    else:
        total = 1
        false_count = 1 if verdict == "FALSE" else 0
        mislead_count = 1 if verdict == "MISLEADING" else 0
        unverified_count = 1 if verdict == "UNVERIFIED" else 0
        true_count = 1 if verdict == "TRUE" else 0
        avg_score = float(score)

    data = {
        "week": week_key,
        "total": total,
        "false_pct": round(false_count / total * 100, 1),
        "mislead_pct": round(mislead_count / total * 100, 1),
        "unverified_pct": round(unverified_count / total * 100, 1),
        "true_pct": round(true_count / total * 100, 1),
        "avg_score": avg_score,
    }

    await asyncio.to_thread(
        lambda: client.table("trends")
        .upsert(data, on_conflict="week")
        .execute()
    )


async def get_trends() -> dict:
    result = await asyncio.to_thread(
        lambda: client.table("trends")
        .select("*")
        .order("week", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else {}

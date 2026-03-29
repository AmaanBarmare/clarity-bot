import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import database


async def emit(
    claim_id: str,
    claim_text: str,
    score_data: dict,
    sources: list[dict],
    log_cb,
) -> None:
    await log_cb("emitter", "running", "Saving results to database...")

    await database.update_claim(
        claim_id=claim_id,
        score=score_data["score"],
        verdict=score_data["verdict"],
        explanation=score_data["explanation"],
        sources=sources,
    )

    await database.upsert_trends(
        verdict=score_data["verdict"],
        score=score_data["score"],
    )

    await log_cb(
        "emitter",
        "done",
        f"Results saved — score {score_data['score']}/10, verdict: {score_data['verdict']}",
    )

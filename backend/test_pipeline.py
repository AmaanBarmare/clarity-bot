"""
Runs 3 test claims directly through the pipeline (no HTTP server).
Usage: cd backend && python test_pipeline.py
"""
import asyncio
import uuid
import database
from agent import run_pipeline
from queue_manager import queue_manager


TEST_CLAIMS = [
    "The Moon landing in 1969 was faked by NASA in a Hollywood studio.",
    "Water boils at 100 degrees Celsius at sea level.",
    "Eating chocolate every day cures cancer completely.",
]


async def run_test(claim: str):
    claim_id = str(uuid.uuid4())
    print(f"\n{'='*60}")
    print(f"CLAIM: {claim}")
    print(f"ID:    {claim_id}")
    print(f"{'='*60}")

    await database.insert_claim(claim_id, claim)
    queue_manager.create(claim_id)

    await run_pipeline(claim, claim_id)

    result = await database.get_claim(claim_id)
    if result:
        print(f"SCORE:   {result.get('score')}")
        print(f"VERDICT: {result.get('verdict')}")
        print(f"EXPLAIN: {result.get('explanation')}")
        assert result.get("score") is not None, "Score should not be None"
        assert result.get("verdict") is not None, "Verdict should not be None"
        print("PASSED")
    else:
        print("FAILED: No result found")

    logs = await database.get_logs(claim_id)
    print(f"LOGS:    {len(logs)} entries")
    for log in logs:
        print(f"  [{log['step']}] {log['status']}: {log['message']}")

    return result


async def main():
    print("ClarityBot Pipeline Test")
    print("========================\n")

    for claim in TEST_CLAIMS:
        await run_test(claim)

    print(f"\n{'='*60}")
    print("All tests complete.")


if __name__ == "__main__":
    asyncio.run(main())

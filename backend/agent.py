import database
from skills.fact_check.extractor import extract
from skills.fact_check.searcher import search
from skills.fact_check.crossref import crossref
from skills.fact_check.scorer import score
from skills.fact_check.emitter import emit
from skills.fact_check.source_credibility import filter_credible_sources


async def run_pipeline(claim: str, claim_id: str) -> None:
    async def log_cb(step: str, status: str, message: str):
        await database.insert_log(claim_id, step, status, message)

    try:
        result1 = await extract(claim, log_cb)

        if result1["claim_type"] != "factual":
            await log_cb(
                "scorer",
                "done",
                f"Claim is {result1['claim_type']} — not fact-checkable. "
                f"Score: 5, Verdict: UNVERIFIED",
            )
            await database.update_claim(
                claim_id=claim_id,
                score=5,
                verdict="UNVERIFIED",
                explanation=f"This claim was classified as {result1['claim_type']} "
                f"and cannot be fact-checked.",
                sources=[],
            )
            await database.upsert_trends("UNVERIFIED", 5)
            return

        result2 = await search(result1["assertions"], log_cb)

        credible_sources = filter_credible_sources(result2["sources"])
        all_sources = result2["sources"]

        if len(credible_sources) < len(all_sources):
            dropped = len(all_sources) - len(credible_sources)
            await log_cb(
                "searcher",
                "done",
                f"Filtered out {dropped} low-credibility source(s) "
                f"(social media, user-generated content). "
                f"Using {len(credible_sources)} credible source(s).",
            )

        result3 = await crossref(claim, credible_sources, log_cb)

        result4 = await score(
            result3["support_level"],
            result3["analysis"],
            credible_sources,
            log_cb,
        )

        await emit(claim_id, claim, result4, credible_sources, log_cb)

    except Exception as e:
        await log_cb("error", "error", str(e))
        try:
            await database.update_claim(
                claim_id=claim_id,
                score=0,
                verdict="ERROR",
                explanation=f"Pipeline failed: {str(e)[:200]}",
                sources=[],
            )
        except Exception:
            pass

    finally:
        pass

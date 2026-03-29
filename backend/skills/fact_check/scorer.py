import json
from .gemini import call_gemini
from .source_credibility import summarize_source_credibility

SCORE_RANGES = {
    "strong":      (7, 10, "TRUE"),
    "partial":     (4, 6, "UNVERIFIED"),
    "none":        (3, 5, "UNVERIFIED"),
    "contradicts": (1, 3, "FALSE"),
}

PROMPT = """You are a fact-check scoring engine. Based on the support level, analysis, and source credibility, assign a final score and verdict.

Support level: {support_level}
Analysis: {analysis}
Source credibility: {credibility_note}

Score must be between {min_score} and {max_score} (inclusive).
Default verdict for this support level: {default_verdict}

Verdict must be one of: TRUE, FALSE, MISLEADING, UNVERIFIED

Rules:
- Pick the exact integer score within the allowed range
- Choose the most appropriate verdict (you may override the default if the analysis warrants it, e.g. use MISLEADING instead of FALSE if the claim is partly true)
- Write a 2-sentence explanation suitable for a general audience

Respond with ONLY this JSON structure, no other text:
{{
  "score": <integer>,
  "verdict": "TRUE" | "FALSE" | "MISLEADING" | "UNVERIFIED",
  "explanation": "Two sentence explanation."
}}"""


async def score(
    support_level: str, analysis: str, sources: list[dict], log_cb
) -> dict:
    await log_cb("scorer", "running", "Calculating credibility score...")

    cred = summarize_source_credibility(sources)
    credibility_note = cred["credibility_note"]

    min_score, max_score, default_verdict = SCORE_RANGES.get(
        support_level, (3, 5, "UNVERIFIED")
    )

    prompt = PROMPT.format(
        support_level=support_level,
        analysis=analysis,
        credibility_note=credibility_note,
        min_score=min_score,
        max_score=max_score,
        default_verdict=default_verdict,
    )

    text = await call_gemini(prompt)
    data = json.loads(text)

    final_score = max(1, min(10, int(data.get("score", 5))))
    verdict = data.get("verdict", default_verdict)
    explanation = data.get("explanation", "")

    if not cred["has_primary_authority"]:
        if cred["high_count"] == 0 and cred["medium_count"] == 0:
            final_score = min(final_score, 4)
            verdict = "UNVERIFIED"
        elif cred["high_count"] == 0:
            final_score = min(final_score, 6)

    await log_cb(
        "scorer",
        "done",
        f"Score: {final_score}/10 — Verdict: {verdict}",
    )
    return {"score": final_score, "verdict": verdict, "explanation": explanation}

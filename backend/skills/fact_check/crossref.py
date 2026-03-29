import json
from urllib.parse import urlparse
from .gemini import call_gemini
from .source_credibility import get_credibility

PROMPT = """You are a fact-checking cross-reference analyst. Compare the claim against the provided sources and determine the level of support.

Claim: "{claim}"

Sources:
{sources_text}

Instructions:
- Weight HIGH credibility sources very strongly — they are primary authorities
- Treat MEDIUM credibility sources as supporting evidence
- Discount LOW credibility sources significantly — do not rely on them alone
- If only LOW credibility sources are available, set support_level to "none" unless the claim is obviously false (then use "contradicts")

Determine one of these support levels:
- "strong" — multiple credible sources clearly confirm the claim
- "partial" — some evidence supports but not conclusive
- "none" — sources don't address the claim or evidence is insufficient
- "contradicts" — credible sources clearly refute the claim

Respond with ONLY this JSON structure, no other text:
{{
  "support_level": "strong" | "partial" | "none" | "contradicts",
  "analysis": "2-3 sentence analysis of how sources relate to the claim"
}}"""


async def crossref(claim: str, sources: list[dict], log_cb) -> dict:
    await log_cb(
        "crossref",
        "running",
        f"Cross-referencing claim against {len(sources)} source(s)...",
    )

    sources_text_parts = []
    for i, src in enumerate(sources, 1):
        url = src.get("url", "")
        level, _topic = get_credibility(url)
        domain = urlparse(url).hostname or url
        if domain.startswith("www."):
            domain = domain[4:]

        sources_text_parts.append(
            f"[{i}] [CREDIBILITY: {level.upper()} | DOMAIN: {domain}] "
            f"Title: {src.get('title', '')}\n"
            f"    Snippet: {src.get('snippet', '')}"
        )

    sources_text = "\n".join(sources_text_parts)
    prompt = PROMPT.format(claim=claim, sources_text=sources_text)

    text = await call_gemini(prompt)
    data = json.loads(text)

    support_level = data.get("support_level", "none")
    analysis = data.get("analysis", "")

    await log_cb("crossref", "done", f"Support level: {support_level}")
    return {"support_level": support_level, "analysis": analysis}

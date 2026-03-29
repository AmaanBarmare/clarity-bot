import json
from .gemini import call_gemini

PROMPT = """You are a claim analysis assistant. Analyze the following claim and respond with JSON only.

Claim: "{claim}"

Instructions:
1. Classify the claim as one of: "factual", "opinion", or "satire"
2. If factual, extract up to 3 specific, verifiable assertions from the claim
3. If opinion or satire, return an empty assertions list

Respond with ONLY this JSON structure, no other text:
{{
  "claim_type": "factual" | "opinion" | "satire",
  "assertions": ["assertion 1", "assertion 2", "assertion 3"]
}}"""


async def extract(claim: str, log_cb) -> dict:
    await log_cb("extractor", "running", f"Analyzing claim: {claim[:80]}...")

    prompt = PROMPT.format(claim=claim)
    text = await call_gemini(prompt)
    data = json.loads(text)

    claim_type = data.get("claim_type", "factual")
    assertions = data.get("assertions", [])[:3]

    await log_cb(
        "extractor",
        "done",
        f"Classified as {claim_type} — {len(assertions)} assertion(s) extracted",
    )
    return {"claim_type": claim_type, "assertions": assertions}

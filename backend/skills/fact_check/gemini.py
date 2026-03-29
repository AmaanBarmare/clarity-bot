import os
import asyncio
import httpx

GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/"
    "models/gemini-2.5-flash:generateContent"
)

MAX_RETRIES = 3
BACKOFF_BASE = 2.0


async def call_gemini(prompt: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")

    for attempt in range(MAX_RETRIES):
        async with httpx.AsyncClient() as client:
            res = await client.post(
                GEMINI_URL,
                params={"key": api_key},
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=30.0,
            )

        if res.status_code == 429:
            wait = BACKOFF_BASE ** (attempt + 1)
            await asyncio.sleep(wait)
            continue

        res.raise_for_status()
        text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
        return text.strip().strip("```json").strip("```").strip()

    res.raise_for_status()
    return ""

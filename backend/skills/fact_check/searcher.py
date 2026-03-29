import os
import httpx

SERPER_URL = "https://google.serper.dev/search"


async def search(assertions: list[str], log_cb) -> dict:
    await log_cb(
        "searcher",
        "running",
        f"Searching for evidence on {len(assertions)} assertion(s)...",
    )

    api_key = os.getenv("SERPER_API_KEY")
    sources: list[dict] = []
    seen_urls: set[str] = set()

    async with httpx.AsyncClient() as client:
        for assertion in assertions[:3]:
            try:
                res = await client.post(
                    SERPER_URL,
                    headers={
                        "X-API-KEY": api_key,
                        "Content-Type": "application/json",
                    },
                    json={"q": assertion, "num": 3},
                    timeout=15.0,
                )
                res.raise_for_status()
                items = res.json().get("organic", [])

                for item in items:
                    url = item.get("link", "")
                    if url and url not in seen_urls:
                        seen_urls.add(url)
                        sources.append({
                            "title": item.get("title", ""),
                            "url": url,
                            "snippet": item.get("snippet", ""),
                        })
            except httpx.HTTPError:
                continue

    await log_cb(
        "searcher",
        "done",
        f"Found {len(sources)} unique source(s) across {len(assertions)} queries",
    )
    return {"sources": sources}

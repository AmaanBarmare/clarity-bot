from urllib.parse import urlparse

TRUSTED_SOURCES: dict[str, tuple[str, str]] = {
    # ── Space ──────────────────────────────────────────────
    "nasa.gov": ("high", "space"),
    "science.nasa.gov": ("high", "space"),
    "jpl.nasa.gov": ("high", "space"),
    "esa.int": ("high", "space"),
    "jaxa.jp": ("high", "space"),
    "isro.gov.in": ("high", "space"),
    "spacex.com": ("medium", "space"),
    "space.com": ("medium", "space"),
    "planetary.org": ("medium", "space"),
    "astronomy.com": ("medium", "space"),
    "skyandtelescope.org": ("medium", "space"),
    "universetoday.com": ("medium", "space"),

    # ── Health ─────────────────────────────────────────────
    "cdc.gov": ("high", "health"),
    "who.int": ("high", "health"),
    "nih.gov": ("high", "health"),
    "fda.gov": ("high", "health"),
    "pubmed.ncbi.nlm.nih.gov": ("high", "health"),
    "medlineplus.gov": ("high", "health"),
    "clinicaltrials.gov": ("high", "health"),
    "thelancet.com": ("high", "health"),
    "nejm.org": ("high", "health"),
    "bmj.com": ("high", "health"),
    "mayoclinic.org": ("medium", "health"),
    "clevelandclinic.org": ("medium", "health"),
    "hopkinsmedicine.org": ("medium", "health"),
    "health.harvard.edu": ("medium", "health"),

    # ── History ────────────────────────────────────────────
    "archives.gov": ("high", "history"),
    "loc.gov": ("high", "history"),
    "si.edu": ("high", "history"),
    "nps.gov": ("high", "history"),
    "britannica.com": ("medium", "history"),
    "smithsonianmag.com": ("medium", "history"),
    "history.com": ("medium", "history"),
    "worldhistory.org": ("medium", "history"),

    # ── Science / Technology ───────────────────────────────
    "nature.com": ("high", "general"),
    "sciencedirect.com": ("high", "general"),
    "science.org": ("high", "general"),
    "pnas.org": ("high", "general"),
    "arxiv.org": ("medium", "general"),
    "newscientist.com": ("medium", "general"),
    "scientificamerican.com": ("medium", "general"),
    "livescience.com": ("medium", "general"),

    # ── Fact-checkers ──────────────────────────────────────
    "snopes.com": ("high", "general"),
    "factcheck.org": ("high", "general"),
    "politifact.com": ("high", "general"),
    "fullfact.org": ("high", "general"),

    # ── Wire services / major journalism ───────────────────
    "reuters.com": ("high", "general"),
    "apnews.com": ("high", "general"),
    "bbc.com": ("medium", "general"),
    "bbc.co.uk": ("medium", "general"),
    "nytimes.com": ("medium", "general"),
    "washingtonpost.com": ("medium", "general"),
    "theguardian.com": ("medium", "general"),
    "npr.org": ("medium", "general"),
    "pbs.org": ("medium", "general"),
}

PRIMARY_AUTHORITIES = {
    "nasa.gov", "science.nasa.gov", "jpl.nasa.gov", "esa.int",
    "jaxa.jp", "isro.gov.in",
    "cdc.gov", "who.int", "nih.gov", "fda.gov", "pubmed.ncbi.nlm.nih.gov",
    "medlineplus.gov", "clinicaltrials.gov",
    "thelancet.com", "nejm.org", "bmj.com",
    "archives.gov", "loc.gov", "si.edu", "nps.gov",
    "snopes.com", "factcheck.org", "politifact.com", "fullfact.org",
    "reuters.com", "apnews.com",
    "nature.com", "sciencedirect.com", "science.org", "pnas.org",
}

LOW_CREDIBILITY_DOMAINS = {
    "reddit.com", "facebook.com", "twitter.com", "x.com",
    "tiktok.com", "instagram.com", "youtube.com", "youtu.be",
    "quora.com", "medium.com", "tumblr.com", "pinterest.com",
    "linkedin.com", "threads.net",
    "wikipedia.org", "en.wikipedia.org",
    "wikihow.com", "answers.yahoo.com",
    "blogspot.com", "wordpress.com",
}


def _extract_domain(url: str) -> str:
    try:
        parsed = urlparse(url if "://" in url else f"https://{url}")
        host = parsed.hostname or ""
        if host.startswith("www."):
            host = host[4:]
        return host.lower()
    except Exception:
        return ""


def get_credibility(url: str) -> tuple[str, str]:
    domain = _extract_domain(url)
    if not domain:
        return ("low", "unknown")

    if domain in LOW_CREDIBILITY_DOMAINS or any(
        domain.endswith(f".{blocked}") for blocked in LOW_CREDIBILITY_DOMAINS
    ):
        return ("low", "unknown")

    if domain in TRUSTED_SOURCES:
        return TRUSTED_SOURCES[domain]

    for trusted_domain, value in TRUSTED_SOURCES.items():
        if domain.endswith(f".{trusted_domain}"):
            return value

    if domain.endswith(".gov") or domain.endswith(".mil"):
        return ("medium", "general")
    if domain.endswith(".edu"):
        return ("medium", "general")

    return ("low", "unknown")


def filter_credible_sources(sources: list[dict]) -> list[dict]:
    """Keep only high and medium credibility sources.
    If none survive, return all sources so the pipeline can still run
    (they'll be labelled LOW in the prompt and score will be capped)."""
    credible = [
        src for src in sources
        if get_credibility(src.get("url", ""))[0] in ("high", "medium")
    ]
    return credible if credible else sources


def summarize_source_credibility(sources: list[dict]) -> dict:
    high_count = 0
    medium_count = 0
    low_count = 0
    has_primary = False

    for src in sources:
        url = src.get("url", "")
        level, _ = get_credibility(url)
        domain = _extract_domain(url)

        if level == "high":
            high_count += 1
        elif level == "medium":
            medium_count += 1
        else:
            low_count += 1

        if domain in PRIMARY_AUTHORITIES or any(
            domain.endswith(f".{pa}") for pa in PRIMARY_AUTHORITIES
        ):
            has_primary = True

    total = high_count + medium_count + low_count

    if has_primary:
        note = (
            f"Sources include {high_count} high-credibility source(s) "
            f"with primary authority. Evidence should be weighted strongly."
        )
    elif high_count > 0:
        note = (
            f"Sources include {high_count} high-credibility source(s). "
            f"Evidence is reasonably trustworthy."
        )
    elif medium_count > 0:
        note = (
            f"No high-credibility sources found. {medium_count} medium-credibility "
            f"source(s) available. Score should be capped at 6."
        )
    else:
        note = (
            f"All {low_count} source(s) are low-credibility. "
            f"Score must be capped at 4 and verdict should be UNVERIFIED."
        )

    return {
        "high_count": high_count,
        "medium_count": medium_count,
        "low_count": low_count,
        "total": total,
        "has_primary_authority": has_primary,
        "credibility_note": note,
    }

from urllib.parse import urlparse

TRUSTED_SOURCES: dict[str, tuple[str, str]] = {
    # Space / NASA — primary authorities
    "nasa.gov": ("high", "space"),
    "science.nasa.gov": ("high", "space"),
    "jpl.nasa.gov": ("high", "space"),
    "esa.int": ("high", "space"),
    "spacex.com": ("medium", "space"),
    "space.com": ("medium", "space"),

    # Vaccines / Health — primary authorities
    "cdc.gov": ("high", "health"),
    "who.int": ("high", "health"),
    "nih.gov": ("high", "health"),
    "fda.gov": ("high", "health"),
    "pubmed.ncbi.nlm.nih.gov": ("high", "health"),
    "mayoclinic.org": ("medium", "health"),
    "healthline.com": ("medium", "health"),
    "webmd.com": ("medium", "health"),
    "medlineplus.gov": ("high", "health"),

    # Historical facts — primary authorities
    "archives.gov": ("high", "history"),
    "loc.gov": ("high", "history"),
    "history.com": ("medium", "history"),
    "britannica.com": ("medium", "history"),
    "smithsonianmag.com": ("medium", "history"),

    # Cross-topic fact-checkers
    "snopes.com": ("high", "general"),
    "factcheck.org": ("high", "general"),
    "politifact.com": ("high", "general"),

    # Wire services / major outlets
    "reuters.com": ("high", "general"),
    "apnews.com": ("high", "general"),
    "bbc.com": ("medium", "general"),
    "bbc.co.uk": ("medium", "general"),
    "nytimes.com": ("medium", "general"),
    "washingtonpost.com": ("medium", "general"),
    "theguardian.com": ("medium", "general"),
    "nature.com": ("high", "general"),
    "sciencedirect.com": ("high", "general"),

    # Reference
    "wikipedia.org": ("medium", "general"),
    "en.wikipedia.org": ("medium", "general"),
}

PRIMARY_AUTHORITIES = {
    "nasa.gov", "science.nasa.gov", "jpl.nasa.gov", "esa.int",
    "cdc.gov", "who.int", "nih.gov", "fda.gov", "pubmed.ncbi.nlm.nih.gov",
    "medlineplus.gov", "archives.gov", "loc.gov",
    "snopes.com", "factcheck.org", "politifact.com",
    "reuters.com", "apnews.com",
    "nature.com", "sciencedirect.com",
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

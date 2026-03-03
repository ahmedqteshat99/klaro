import re


def clean_text(raw: str) -> str:
    """Remove HTML tags and normalize whitespace. Mirrors the TS cleanText function."""
    text = re.sub(r"<[^>]*>", " ", raw)
    text = text.replace("&amp;", "&")
    text = text.replace("&lt;", "<")
    text = text.replace("&gt;", ">")
    text = text.replace("&quot;", '"')
    text = text.replace("&#039;", "'")
    text = text.replace("&nbsp;", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def is_junior_position(title: str) -> bool:
    """Check if a job title is for a junior-level position (Assistenzarzt / Arzt in Weiterbildung)."""
    lower = title.lower()
    return (
        "assistenzarzt" in lower
        or "assistenzärztin" in lower
        or "arzt in weiterbildung" in lower
        or "ärztin in weiterbildung" in lower
    )

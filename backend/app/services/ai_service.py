"""Optional AI helper for improving owner-submitted listing copy."""
from __future__ import annotations

import json
import os
import re
from typing import Any
from urllib.request import Request, urlopen


DEFAULT_MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")
DEFAULT_BASE_URL = os.getenv("AI_BASE_URL", "https://api.openai.com/v1").rstrip("/")


def _extract_json(text: str) -> dict[str, Any] | None:
    match = re.search(r"\{.*\}", text or "", re.DOTALL)
    if not match:
        return None
    try:
        value = json.loads(match.group(0))
        return value if isinstance(value, dict) else None
    except json.JSONDecodeError:
        return None


def _call_llm(system_prompt: str, user_prompt: str) -> dict[str, Any] | None:
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("AI_API_KEY")
    if not api_key:
        return None

    payload = json.dumps({
        "model": DEFAULT_MODEL,
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }).encode("utf-8")

    request = Request(
        f"{DEFAULT_BASE_URL}/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))
        content = data["choices"][0]["message"]["content"]
        return _extract_json(content)
    except Exception:
        # AI is an enhancement; a provider outage must not break CityNest.
        return None


def generate_listing_copy(listing_type: str, draft: dict[str, Any], instruction: str | None = None) -> tuple[dict[str, Any], bool]:
    system = """You are CityNest's listing-quality assistant. Improve a user's draft
without inventing facts. Return JSON with title, description, highlights and
missing_details. Preserve supplied prices, locations, features and restrictions.
Missing details should be questions, not guesses."""
    result = _call_llm(system, json.dumps({
        "listing_type": listing_type, "draft": draft, "instruction": instruction
    }, ensure_ascii=False))
    if result:
        return {
            "title": str(result.get("title") or draft.get("title") or draft.get("name") or "CityNest listing"),
            "description": str(result.get("description") or draft.get("description") or ""),
            "highlights": [str(x) for x in (result.get("highlights") or [])][:8],
            "missing_details": [str(x) for x in (result.get("missing_details") or [])][:8],
        }, True

    title = draft.get("title") or draft.get("name") or "CityNest listing"
    description = draft.get("description") or ""
    if len(description) < 80:
        description = (
            f"{description.strip()} "
            "A practical CityNest listing for students and working professionals. "
            "Review the details and add any missing information before publishing."
        ).strip()
    highlights = []
    for key, label in (("monthly_rent", "Monthly rent"), ("monthly_price", "Monthly price"),
                       ("price", "Price"), ("address", "Location"), ("furnishing", "Furnishing"),
                       ("condition", "Condition")):
        if draft.get(key) not in (None, ""):
            highlights.append(f"{label}: {draft[key]}")
    missing = []
    if not draft.get("description"):
        missing.append("Add a clear description of what is included.")
    if listing_type == "property" and not draft.get("furnishing"):
        missing.append("Specify furnishing status.")
    if listing_type == "food" and not draft.get("food_type"):
        missing.append("Specify food type or dietary options.")
    if listing_type == "marketplace" and not draft.get("condition"):
        missing.append("Specify item condition.")
    return {
        "title": str(title),
        "description": description,
        "highlights": highlights[:8],
        "missing_details": missing[:8],
    }, False

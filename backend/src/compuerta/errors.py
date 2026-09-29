"""Deterministic error taxonomy — mirrors lib/compuerta/errors.py."""

from __future__ import annotations

import re


def classify_error(message: str) -> str:
    m = message.lower()
    if "rate" in m or "429" in m:
        return "rate_limit"
    if "timeout" in m or "timed out" in m:
        return "timeout"
    if "auth" in m or "401" in m or "403" in m:
        return "auth"
    if "content" in m or "filter" in m:
        return "content_filter"
    if re.search(r"\b5\d\d\b", m) or "500" in m or "502" in m or "503" in m:
        return "server"
    return "unknown"

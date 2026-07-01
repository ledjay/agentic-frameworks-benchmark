"""Compatibility wrapper for A1 notes.

The canonical FastAPI app now lives in `src.api`.
"""

from src.api import app

__all__ = ["app"]

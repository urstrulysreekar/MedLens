"""Deterministic clinical range evaluation logic for MedLens."""

from typing import Optional

from models import RangeStatus


def evaluate_range(
    value: float,
    low: Optional[float] = None,
    high: Optional[float] = None,
) -> RangeStatus:
    """Classify ``value`` against optional reference range bounds.

    Order of precedence:
    1. Below the lower bound (if provided) -> ``LOW``
    2. Above the upper bound (if provided)  -> ``HIGH``
    3. Within both bounds (when both exist) -> ``NORMAL``
    4. Otherwise (cannot be determined)     -> ``UNKNOWN``

    Boundary values are inclusive: ``value == low`` and ``value == high``
    both count as ``NORMAL`` when both bounds are present.
    """
    if low is not None and value < low:
        return RangeStatus.LOW
    if high is not None and value > high:
        return RangeStatus.HIGH
    if low is not None and high is not None and low <= value <= high:
        return RangeStatus.NORMAL
    return RangeStatus.UNKNOWN
"""Unit tests for the ``evaluate_range`` function.

Runnable with either pytest or ``python -m unittest test_evaluator``.
"""

import unittest

from evaluator import evaluate_range
from models import RangeStatus


class EvaluateRangeTest(unittest.TestCase):
    """Verify low / normal / high classification, boundaries, single bounds."""

    # --- Full reference range (both bounds) -------------------------------
    def test_below_low_is_low(self):
        self.assertEqual(evaluate_range(3.0, low=4.0, high=10.0), RangeStatus.LOW)

    def test_within_range_is_normal(self):
        self.assertEqual(evaluate_range(7.0, low=4.0, high=10.0), RangeStatus.NORMAL)

    def test_above_high_is_high(self):
        self.assertEqual(evaluate_range(11.0, low=4.0, high=10.0), RangeStatus.HIGH)

    # --- Boundary conditions (inclusive bounds) ----------------------------
    def test_value_equal_to_low_is_normal(self):
        self.assertEqual(evaluate_range(4.0, low=4.0, high=10.0), RangeStatus.NORMAL)

    def test_value_equal_to_high_is_normal(self):
        self.assertEqual(evaluate_range(10.0, low=4.0, high=10.0), RangeStatus.NORMAL)

    def test_value_just_below_low_is_low(self):
        self.assertEqual(evaluate_range(3.999, low=4.0, high=10.0), RangeStatus.LOW)

    def test_value_just_above_high_is_high(self):
        self.assertEqual(evaluate_range(10.001, low=4.0, high=10.0), RangeStatus.HIGH)

    def test_zero_length_range(self):
        """A single-point range (low == high) is still a valid interval."""
        self.assertEqual(evaluate_range(5.0, low=5.0, high=5.0), RangeStatus.NORMAL)
        self.assertEqual(evaluate_range(4.9, low=5.0, high=5.0), RangeStatus.LOW)
        self.assertEqual(evaluate_range(5.1, low=5.0, high=5.0), RangeStatus.HIGH)

    # --- Single bound (low only) --------------------------------------------
    def test_low_only_below_is_low(self):
        self.assertEqual(evaluate_range(2.0, low=5.0, high=None), RangeStatus.LOW)

    def test_low_only_at_or_above_is_unknown(self):
        """Without an upper bound we cannot confirm normality."""
        self.assertEqual(evaluate_range(5.0, low=5.0, high=None), RangeStatus.UNKNOWN)
        self.assertEqual(evaluate_range(8.0, low=5.0, high=None), RangeStatus.UNKNOWN)

    # --- Single bound (high only) ----------------------------------------
    def test_high_only_above_is_high(self):
        self.assertEqual(evaluate_range(120.0, low=None, high=100.0), RangeStatus.HIGH)

    def test_high_only_at_or_below_is_unknown(self):
        """Without a lower bound we cannot confirm normality."""
        self.assertEqual(evaluate_range(100.0, low=None, high=100.0), RangeStatus.UNKNOWN)
        self.assertEqual(evaluate_range(90.0, low=None, high=100.0), RangeStatus.UNKNOWN)

    # --- No bounds ---------------------------------------------------------
    def test_no_bounds_is_unknown(self):
        self.assertEqual(evaluate_range(7.0, low=None, high=None), RangeStatus.UNKNOWN)

    # --- Negative and decimal values ------------------------------------
    def test_negative_values(self):
        self.assertEqual(evaluate_range(-3.5, low=-2.0, high=2.0), RangeStatus.LOW)
        self.assertEqual(evaluate_range(-1.0, low=-2.0, high=2.0), RangeStatus.NORMAL)
        self.assertEqual(evaluate_range(3.5, low=-2.0, high=2.0), RangeStatus.HIGH)


if __name__ == "__main__":
    unittest.main()
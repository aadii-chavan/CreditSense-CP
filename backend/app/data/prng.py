"""A port of the frontend mock's PRNG, so both sides generate one dataset.

The seeded sample population must be identical whether the frontend runs against
its dev mock or against this service — otherwise flipping VITE_USE_MOCK would
silently change every figure on screen. That means reproducing JavaScript's
arithmetic exactly, not merely using "a" deterministic generator.
"""

from math import floor
from typing import Callable

_MASK32 = 0xFFFFFFFF


def mulberry32(seed: int) -> Callable[[], float]:
    """The mulberry32 generator as JavaScript computes it.

    Add, multiply and xor produce identical bit patterns in signed and unsigned
    32-bit arithmetic, so the sequence can be carried unsigned here and JS's
    ``>>>`` becomes a plain right shift on the masked value.
    """
    state = seed & _MASK32

    def next_float() -> float:
        nonlocal state
        state = (state + 0x6D2B79F5) & _MASK32
        t = state
        t = ((t ^ (t >> 15)) * (1 | t)) & _MASK32
        t = (t ^ (t + (((t ^ (t >> 7)) * (61 | t)) & _MASK32))) & _MASK32
        return ((t ^ (t >> 14)) & _MASK32) / 4294967296.0

    return next_float


def js_round(x: float) -> int:
    """JavaScript's ``Math.round``: halves go up, towards positive infinity.

    Python's built-in ``round`` uses banker's rounding, which would disagree on
    every exact .5 and quietly desynchronise the two datasets.
    """
    return int(floor(x + 0.5))

class Solution:
    def checkValidString(self, s: str) -> bool:
        # Track the range of possible counts of unclosed "(": each "*" may be "(", ")" or nothing.
        lo = hi = 0
        for c in s:
            if c == "(":
                lo, hi = lo + 1, hi + 1
            elif c == ")":
                lo, hi = lo - 1, hi - 1
            else:
                lo, hi = lo - 1, hi + 1
            if hi < 0:
                return False  # even reading every "*" as "(" leaves too many ")"
            lo = max(lo, 0)  # a count below zero is not a real reading; drop it
        return lo == 0  # some reading closes everything

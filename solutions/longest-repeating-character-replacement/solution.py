class Solution:
    def characterReplacement(self, s: str, k: int) -> int:
        count = [0] * 26
        l = most = 0  # most: the highest count of one letter the window has reached
        for r, c in enumerate(s):
            count[ord(c) - 65] += 1
            most = max(most, count[ord(c) - 65])
            # Letters to replace = window length - most common letter. Too many? Slide.
            if (r - l + 1) - most > k:
                count[ord(s[l]) - 65] -= 1
                l += 1
        return len(s) - l  # the window never shrinks, so its final size is the best

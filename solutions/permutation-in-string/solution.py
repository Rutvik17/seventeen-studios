class Solution:
    def checkInclusion(self, s1: str, s2: str) -> bool:
        n = len(s1)
        if n > len(s2):
            return False
        need = [0] * 26  # how many more of each letter the window still needs
        for c in s1:
            need[ord(c) - 97] += 1
        missing = n  # letters of s1 not yet matched by the window
        for r, c in enumerate(s2):
            if need[ord(c) - 97] > 0:
                missing -= 1
            need[ord(c) - 97] -= 1
            if r >= n:  # the window is too long: drop its first letter
                d = ord(s2[r - n]) - 97
                need[d] += 1
                if need[d] > 0:
                    missing += 1
            if missing == 0:
                return True
        return False

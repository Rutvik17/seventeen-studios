class Solution:
    def numDecodings(self, s: str) -> int:
        # ways(i): decodings of s[i:]. A letter is one digit 1-9, or two digits 10-26.
        # ways(i) = [s[i] != "0"] * ways(i + 1) + [s[i:i+2] in 10..26] * ways(i + 2)
        nxt, nxt2 = 1, 0  # ways(i + 1), ways(i + 2); the empty end decodes one way
        for i in range(len(s) - 1, -1, -1):
            cur = 0
            if s[i] != "0":
                cur = nxt
                if i + 1 < len(s) and 10 <= int(s[i : i + 2]) <= 26:
                    cur += nxt2
            nxt, nxt2 = cur, nxt
        return nxt

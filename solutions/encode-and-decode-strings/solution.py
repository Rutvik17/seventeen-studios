class Codec:
    def encode(self, strs: List[str]) -> str:
        # Each string becomes "<length>#<string>", so any character can appear inside it.
        return "".join(f"{len(s)}#{s}" for s in strs)

    def decode(self, s: str) -> List[str]:
        out, i = [], 0
        while i < len(s):
            j = s.index("#", i)  # the length ends at the first '#'
            n = int(s[i:j])
            out.append(s[j + 1 : j + 1 + n])
            i = j + 1 + n
        return out

class Solution:
    def letterCombinations(self, digits: str) -> List[str]:
        if not digits:
            return []
        keys = {"2": "abc", "3": "def", "4": "ghi", "5": "jkl", "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz"}
        out, cur = [], []

        def spell(i):  # letters for digits[:i] are chosen
            if i == len(digits):
                out.append("".join(cur))
                return
            for letter in keys[digits[i]]:
                cur.append(letter)
                spell(i + 1)
                cur.pop()

        spell(0)
        return out

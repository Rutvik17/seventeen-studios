class Solution:
    def alienOrder(self, words: List[str]) -> str:
        letters = {c for w in words for c in w}
        after = {c: set() for c in letters}  # letter -> letters known to come after it
        need = {c: 0 for c in letters}  # letter -> how many letters must come before it
        for a, b in zip(words, words[1:]):
            for x, y in zip(a, b):
                if x != y:  # the first difference is the only thing this pair tells us
                    if y not in after[x]:
                        after[x].add(y)
                        need[y] += 1
                    break
            else:
                if len(a) > len(b):
                    return ""  # "abc" before "ab" cannot be sorted in any alphabet
        # Kahn's algorithm, as in Course Schedule II.
        order = [c for c in letters if need[c] == 0]
        for c in order:
            for y in after[c]:
                need[y] -= 1
                if need[y] == 0:
                    order.append(y)
        return "".join(order) if len(order) == len(letters) else ""  # short means a cycle

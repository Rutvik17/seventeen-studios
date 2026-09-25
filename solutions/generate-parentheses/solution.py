class Solution:
    def generateParenthesis(self, n: int) -> List[str]:
        out, path = [], []

        def build(opened: int, closed: int) -> None:
            if len(path) == 2 * n:
                out.append("".join(path))
                return
            if opened < n:  # an opener is allowed while any remain
                path.append("(")
                build(opened + 1, closed)
                path.pop()
            if closed < opened:  # a closer is allowed only if it has an opener to match
                path.append(")")
                build(opened, closed + 1)
                path.pop()

        build(0, 0)
        return out

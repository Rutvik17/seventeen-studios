class Solution:
    def findWords(self, board: List[List[str]], words: List[str]) -> List[str]:
        # One trie of all the words; a node keeps the word that ends there.
        root = {}
        for w in words:
            node = root
            for c in w:
                node = node.setdefault(c, {})
            node["$"] = w
        rows, cols = len(board), len(board[0])
        found = []

        def dfs(r, c, parent):
            ch = board[r][c]
            node = parent[ch]
            if "$" in node:
                found.append(node.pop("$"))  # take it once
            board[r][c] = "#"  # in use on this path
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] in node:
                    dfs(nr, nc, node)
            board[r][c] = ch
            if not node:  # nothing left to find below: prune the branch
                del parent[ch]

        for r in range(rows):
            for c in range(cols):
                if board[r][c] in root:
                    dfs(r, c, root)
        return found

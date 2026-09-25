public class Solution {
    private class Node {
        public Node[] next = new Node[26];
        public string word; // the word that ends here, until it is found
        public int kids; // children still in use
    }

    private char[][] board;
    private readonly List<string> found = new();

    public IList<string> FindWords(char[][] board, string[] words) {
        // One trie of all the words.
        var root = new Node();
        foreach (var w in words) {
            var node = root;
            foreach (char c in w) {
                if (node.next[c - 'a'] == null) {
                    node.next[c - 'a'] = new Node();
                    node.kids++;
                }
                node = node.next[c - 'a'];
            }
            node.word = w;
        }
        this.board = board;
        for (int r = 0; r < board.Length; r++)
            for (int c = 0; c < board[0].Length; c++)
                if (root.next[board[r][c] - 'a'] != null) Dfs(r, c, root);
        return found;
    }

    private void Dfs(int r, int c, Node parent) {
        char ch = board[r][c];
        var node = parent.next[ch - 'a'];
        if (node.word != null) {
            found.Add(node.word); // take it once
            node.word = null;
        }
        board[r][c] = '#'; // in use on this path
        int[][] moves = { new[] { 1, 0 }, new[] { -1, 0 }, new[] { 0, 1 }, new[] { 0, -1 } };
        foreach (var m in moves) {
            int nr = r + m[0], nc = c + m[1];
            if (nr >= 0 && nr < board.Length && nc >= 0 && nc < board[0].Length && board[nr][nc] != '#' && node.next[board[nr][nc] - 'a'] != null) Dfs(nr, nc, node);
        }
        board[r][c] = ch;
        if (node.kids == 0 && node.word == null) { // nothing left to find below: prune the branch
            parent.next[ch - 'a'] = null;
            parent.kids--;
        }
    }
}

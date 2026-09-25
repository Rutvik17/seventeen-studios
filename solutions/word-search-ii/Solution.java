class Solution {
    private static class Node {
        Node[] next = new Node[26];
        String word; // the word that ends here, until it is found
        int kids; // children still in use
    }

    private char[][] board;
    private final List<String> found = new ArrayList<>();

    public List<String> findWords(char[][] board, String[] words) {
        // One trie of all the words.
        Node root = new Node();
        for (String w : words) {
            Node node = root;
            for (char c : w.toCharArray()) {
                if (node.next[c - 'a'] == null) {
                    node.next[c - 'a'] = new Node();
                    node.kids++;
                }
                node = node.next[c - 'a'];
            }
            node.word = w;
        }
        this.board = board;
        for (int r = 0; r < board.length; r++)
            for (int c = 0; c < board[0].length; c++)
                if (root.next[board[r][c] - 'a'] != null) dfs(r, c, root);
        return found;
    }

    private void dfs(int r, int c, Node parent) {
        char ch = board[r][c];
        Node node = parent.next[ch - 'a'];
        if (node.word != null) {
            found.add(node.word); // take it once
            node.word = null;
        }
        board[r][c] = '#'; // in use on this path
        int[][] moves = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        for (int[] m : moves) {
            int nr = r + m[0], nc = c + m[1];
            if (nr >= 0 && nr < board.length && nc >= 0 && nc < board[0].length && board[nr][nc] != '#' && node.next[board[nr][nc] - 'a'] != null) dfs(nr, nc, node);
        }
        board[r][c] = ch;
        if (node.kids == 0 && node.word == null) { // nothing left to find below: prune the branch
            parent.next[ch - 'a'] = null;
            parent.kids--;
        }
    }
}

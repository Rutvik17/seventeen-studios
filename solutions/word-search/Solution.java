class Solution {
    public boolean exist(char[][] board, String word) {
        // Quick refusal: the board must hold enough of every letter the word needs.
        int[] have = new int[128];
        for (char[] row : board) for (char c : row) have[c]++;
        for (char c : word.toCharArray()) if (--have[c] < 0) return false;
        for (int r = 0; r < board.length; r++)
            for (int c = 0; c < board[0].length; c++)
                if (trace(board, word, r, c, 0)) return true;
        return false;
    }

    // Can word[i..] be traced starting at (r, c)?
    private boolean trace(char[][] board, String word, int r, int c, int i) {
        if (r < 0 || r >= board.length || c < 0 || c >= board[0].length || board[r][c] != word.charAt(i)) return false;
        if (i == word.length() - 1) return true;
        board[r][c] = '#'; // in use on this path
        boolean found = trace(board, word, r + 1, c, i + 1) || trace(board, word, r - 1, c, i + 1) || trace(board, word, r, c + 1, i + 1) || trace(board, word, r, c - 1, i + 1);
        board[r][c] = word.charAt(i); // free it again
        return found;
    }
}

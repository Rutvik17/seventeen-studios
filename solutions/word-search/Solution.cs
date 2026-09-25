public class Solution {
    public bool Exist(char[][] board, string word) {
        // Quick refusal: the board must hold enough of every letter the word needs.
        var have = new int[128];
        foreach (var row in board) foreach (char c in row) have[c]++;
        foreach (char c in word) if (--have[c] < 0) return false;
        for (int r = 0; r < board.Length; r++)
            for (int c = 0; c < board[0].Length; c++)
                if (Trace(board, word, r, c, 0)) return true;
        return false;
    }

    // Can word[i..] be traced starting at (r, c)?
    private bool Trace(char[][] board, string word, int r, int c, int i) {
        if (r < 0 || r >= board.Length || c < 0 || c >= board[0].Length || board[r][c] != word[i]) return false;
        if (i == word.Length - 1) return true;
        board[r][c] = '#'; // in use on this path
        bool found = Trace(board, word, r + 1, c, i + 1) || Trace(board, word, r - 1, c, i + 1) || Trace(board, word, r, c + 1, i + 1) || Trace(board, word, r, c - 1, i + 1);
        board[r][c] = word[i]; // free it again
        return found;
    }
}

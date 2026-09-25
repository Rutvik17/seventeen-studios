class Solution {
    // Can word[i..] be traced starting at (r, c)?
    bool trace(vector<vector<char>>& board, const string& word, int r, int c, size_t i) {
        if (r < 0 || r >= (int)board.size() || c < 0 || c >= (int)board[0].size() || board[r][c] != word[i]) return false;
        if (i == word.size() - 1) return true;
        board[r][c] = '#'; // in use on this path
        bool found = trace(board, word, r + 1, c, i + 1) || trace(board, word, r - 1, c, i + 1) || trace(board, word, r, c + 1, i + 1) || trace(board, word, r, c - 1, i + 1);
        board[r][c] = word[i]; // free it again
        return found;
    }
public:
    bool exist(vector<vector<char>>& board, string word) {
        // Quick refusal: the board must hold enough of every letter the word needs.
        int have[128] = {};
        for (auto& row : board) for (char c : row) have[(int)c]++;
        for (char c : word) if (--have[(int)c] < 0) return false;
        for (int r = 0; r < (int)board.size(); r++)
            for (int c = 0; c < (int)board[0].size(); c++)
                if (trace(board, word, r, c, 0)) return true;
        return false;
    }
};

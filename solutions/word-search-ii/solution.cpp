class Solution {
    struct Node {
        Node* next[26] = {};
        string word; // the word that ends here, until it is found
        int kids = 0; // children still in use
    };
    vector<string> found;

    void dfs(vector<vector<char>>& board, int r, int c, Node* parent) {
        char ch = board[r][c];
        Node* node = parent->next[ch - 'a'];
        if (!node->word.empty()) {
            found.push_back(node->word); // take it once
            node->word.clear();
        }
        board[r][c] = '#'; // in use on this path
        int moves[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        for (auto& m : moves) {
            int nr = r + m[0], nc = c + m[1];
            if (nr >= 0 && nr < (int)board.size() && nc >= 0 && nc < (int)board[0].size() && board[nr][nc] != '#' && node->next[board[nr][nc] - 'a'])
                dfs(board, nr, nc, node);
        }
        board[r][c] = ch;
        if (node->kids == 0 && node->word.empty()) { // nothing left to find below: prune the branch
            parent->next[ch - 'a'] = nullptr;
            parent->kids--;
        }
    }
public:
    vector<string> findWords(vector<vector<char>>& board, vector<string>& words) {
        // One trie of all the words.
        Node* root = new Node();
        for (auto& w : words) {
            Node* node = root;
            for (char c : w) {
                if (!node->next[c - 'a']) {
                    node->next[c - 'a'] = new Node();
                    node->kids++;
                }
                node = node->next[c - 'a'];
            }
            node->word = w;
        }
        for (int r = 0; r < (int)board.size(); r++)
            for (int c = 0; c < (int)board[0].size(); c++)
                if (root->next[board[r][c] - 'a']) dfs(board, r, c, root);
        return found;
    }
};

class Solution {
public:
    int minDistance(string word1, string word2) {
        // d(i, j): edits turning word1[0..i) into word2[0..j). If the last letters match, d(i-1, j-1);
        // otherwise 1 + the cheapest of delete d(i-1, j), insert d(i, j-1), replace d(i-1, j-1).
        vector<int> row(word2.size() + 1);
        for (size_t j = 0; j <= word2.size(); j++) row[j] = j; // from the empty word: j inserts
        for (size_t i = 1; i <= word1.size(); i++) {
            int diag = row[0];
            row[0] = i; // into the empty word: i deletes
            for (size_t j = 1; j <= word2.size(); j++) {
                int above = row[j];
                row[j] = word1[i - 1] == word2[j - 1] ? diag : 1 + min({above, row[j - 1], diag});
                diag = above;
            }
        }
        return row[word2.size()];
    }
};

public class Solution {
    public int MinDistance(string word1, string word2) {
        // d(i, j): edits turning word1[0..i) into word2[0..j). If the last letters match, d(i-1, j-1);
        // otherwise 1 + the cheapest of delete d(i-1, j), insert d(i, j-1), replace d(i-1, j-1).
        var row = new int[word2.Length + 1];
        for (int j = 0; j <= word2.Length; j++) row[j] = j; // from the empty word: j inserts
        for (int i = 1; i <= word1.Length; i++) {
            int diag = row[0];
            row[0] = i; // into the empty word: i deletes
            for (int j = 1; j <= word2.Length; j++) {
                int above = row[j];
                row[j] = word1[i - 1] == word2[j - 1] ? diag : 1 + Math.Min(above, Math.Min(row[j - 1], diag));
                diag = above;
            }
        }
        return row[word2.Length];
    }
}

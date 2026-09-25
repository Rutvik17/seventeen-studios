class Solution {
    public int minDistance(String word1, String word2) {
        // d(i, j): edits turning word1[0..i) into word2[0..j). If the last letters match, d(i-1, j-1);
        // otherwise 1 + the cheapest of delete d(i-1, j), insert d(i, j-1), replace d(i-1, j-1).
        int[] row = new int[word2.length() + 1];
        for (int j = 0; j <= word2.length(); j++) row[j] = j; // from the empty word: j inserts
        for (int i = 1; i <= word1.length(); i++) {
            int diag = row[0];
            row[0] = i; // into the empty word: i deletes
            for (int j = 1; j <= word2.length(); j++) {
                int above = row[j];
                row[j] = word1.charAt(i - 1) == word2.charAt(j - 1) ? diag : 1 + Math.min(above, Math.min(row[j - 1], diag));
                diag = above;
            }
        }
        return row[word2.length()];
    }
}

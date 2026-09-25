public class Solution {
    private readonly IList<IList<string>> out_ = new List<IList<string>>();
    private readonly List<string> cur = new();

    public IList<IList<string>> Partition(string s) {
        int n = s.Length;
        // pal[i, j]: is s[i..j] a palindrome? Its ends match and its inside is one.
        var pal = new bool[n, n];
        for (int i = n - 1; i >= 0; i--)
            for (int j = i; j < n; j++) pal[i, j] = s[i] == s[j] && (j - i < 2 || pal[i + 1, j - 1]);
        Cut(s, pal, 0);
        return out_;
    }

    // s[0..i) is already cut into palindromes.
    private void Cut(string s, bool[,] pal, int i) {
        if (i == s.Length) {
            out_.Add(new List<string>(cur));
            return;
        }
        for (int j = i; j < s.Length; j++) {
            if (!pal[i, j]) continue;
            cur.Add(s.Substring(i, j - i + 1));
            Cut(s, pal, j + 1);
            cur.RemoveAt(cur.Count - 1);
        }
    }
}

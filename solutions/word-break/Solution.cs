public class Solution {
    public bool WordBreak(string s, IList<string> wordDict) {
        var words = new HashSet<string>(wordDict);
        int longest = wordDict.Max(w => w.Length);
        // ok[i]: can s[0..i) be split into words? It can if some word ends at i and
        // the part before that word can be split too.
        var ok = new bool[s.Length + 1];
        ok[0] = true;
        for (int i = 1; i <= s.Length; i++)
            for (int j = Math.Max(0, i - longest); j < i; j++) // no word is longer than `longest`
                if (ok[j] && words.Contains(s.Substring(j, i - j))) {
                    ok[i] = true;
                    break;
                }
        return ok[s.Length];
    }
}

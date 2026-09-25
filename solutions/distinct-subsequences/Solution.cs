public class Solution {
    public int NumDistinct(string s, string t) {
        // ways[j]: ways to pick t[0..j) from the part of s read so far. Each new letter of s can
        // either be skipped, or — if it equals t[j - 1] — end a copy of t[0..j).
        // Only the final answer is sure to fit in an int; unchecked addition wraps modulo 2^32,
        // and additions wrapped that way still give the right final value.
        var ways = new int[t.Length + 1];
        ways[0] = 1; // the empty t is picked one way
        foreach (char ch in s)
            for (int j = t.Length; j >= 1; j--) // downwards, so this letter is used once
                if (t[j - 1] == ch) ways[j] = unchecked(ways[j] + ways[j - 1]);
        return ways[t.Length];
    }
}

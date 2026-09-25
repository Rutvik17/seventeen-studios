class Solution {
    public int numDistinct(String s, String t) {
        // ways[j]: ways to pick t[0..j) from the part of s read so far. Each new letter of s can
        // either be skipped, or — if it equals t[j - 1] — end a copy of t[0..j).
        // Only the final answer is sure to fit in an int; Java's int addition wraps modulo 2^32,
        // and additions wrapped that way still give the right final value.
        int[] ways = new int[t.length() + 1];
        ways[0] = 1; // the empty t is picked one way
        for (char ch : s.toCharArray())
            for (int j = t.length(); j >= 1; j--) // downwards, so this letter is used once
                if (t.charAt(j - 1) == ch) ways[j] += ways[j - 1];
        return ways[t.length()];
    }
}

class Solution {
public:
    int numDistinct(string s, string t) {
        // ways[j]: ways to pick t[0..j) from the part of s read so far. Each new letter of s can
        // either be skipped, or — if it equals t[j - 1] — end a copy of t[0..j).
        // Only the final answer is sure to fit in an int, so count in unsigned integers, which
        // wrap modulo 2^32: additions wrapped that way still give the right final value.
        vector<unsigned> ways(t.size() + 1, 0);
        ways[0] = 1; // the empty t is picked one way
        for (char ch : s)
            for (size_t j = t.size(); j >= 1; j--) // downwards, so this letter is used once
                if (t[j - 1] == ch) ways[j] += ways[j - 1];
        return ways[t.size()];
    }
};

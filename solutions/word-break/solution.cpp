class Solution {
public:
    bool wordBreak(string s, vector<string>& wordDict) {
        unordered_set<string> words(wordDict.begin(), wordDict.end());
        size_t longest = 0;
        for (auto& w : wordDict) longest = max(longest, w.size());
        // ok[i]: can s[0..i) be split into words? It can if some word ends at i and
        // the part before that word can be split too.
        vector<bool> ok(s.size() + 1, false);
        ok[0] = true;
        for (size_t i = 1; i <= s.size(); i++)
            for (size_t j = i > longest ? i - longest : 0; j < i; j++) // no word is longer than `longest`
                if (ok[j] && words.count(s.substr(j, i - j))) {
                    ok[i] = true;
                    break;
                }
        return ok[s.size()];
    }
};

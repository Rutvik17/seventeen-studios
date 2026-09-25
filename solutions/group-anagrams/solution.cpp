class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        unordered_map<string, vector<string>> groups; // letter counts -> words
        for (const string& word : strs) {
            string key(26, 0);
            for (char c : word) key[c - 'a']++;
            groups[key].push_back(word);
        }
        vector<vector<string>> out;
        for (auto& [key, words] : groups) out.push_back(move(words));
        return out;
    }
};

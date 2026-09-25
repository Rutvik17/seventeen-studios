class Solution {
    const vector<string> keys = {"", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"};
    vector<string> out;
    string cur;

    // Letters for digits[0..i) are chosen.
    void spell(const string& digits, size_t i) {
        if (i == digits.size()) {
            out.push_back(cur);
            return;
        }
        for (char letter : keys[digits[i] - '0']) {
            cur.push_back(letter);
            spell(digits, i + 1);
            cur.pop_back();
        }
    }
public:
    vector<string> letterCombinations(string digits) {
        if (!digits.empty()) spell(digits, 0);
        return out;
    }
};

class Solution {
public:
    bool isValid(string s) {
        vector<char> stack; // the closers we expect, most recent last
        for (char c : s) {
            if (c == '(') stack.push_back(')');
            else if (c == '[') stack.push_back(']');
            else if (c == '{') stack.push_back('}');
            else {
                if (stack.empty() || stack.back() != c) return false;
                stack.pop_back();
            }
        }
        return stack.empty();
    }
};

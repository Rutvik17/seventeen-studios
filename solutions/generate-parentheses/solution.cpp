class Solution {
public:
    vector<string> generateParenthesis(int n) {
        vector<string> out;
        string path;
        function<void(int, int)> build = [&](int opened, int closed) {
            if ((int)path.size() == 2 * n) { out.push_back(path); return; }
            if (opened < n) { // an opener is allowed while any remain
                path.push_back('(');
                build(opened + 1, closed);
                path.pop_back();
            }
            if (closed < opened) { // a closer is allowed only if it has an opener to match
                path.push_back(')');
                build(opened, closed + 1);
                path.pop_back();
            }
        };
        build(0, 0);
        return out;
    }
};

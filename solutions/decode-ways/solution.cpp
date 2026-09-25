class Solution {
public:
    int numDecodings(string s) {
        // ways(i): decodings of s[i..]. A letter is one digit 1-9, or two digits 10-26.
        // ways(i) = [s[i] != '0'] * ways(i + 1) + [s[i..i+1] in 10..26] * ways(i + 2)
        int next = 1, next2 = 0; // ways(i + 1), ways(i + 2); the empty end decodes one way
        for (int i = (int)s.size() - 1; i >= 0; i--) {
            int cur = 0;
            if (s[i] != '0') {
                cur = next;
                if (i + 1 < (int)s.size() && (s[i] - '0') * 10 + (s[i + 1] - '0') <= 26) cur += next2;
            }
            next2 = next;
            next = cur;
        }
        return next;
    }
};

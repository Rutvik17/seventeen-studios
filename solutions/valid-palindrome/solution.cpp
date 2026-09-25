class Solution {
public:
    bool isPalindrome(string s) {
        int l = 0, r = (int)s.size() - 1;
        while (l < r) {
            if (!isalnum((unsigned char)s[l])) l++;
            else if (!isalnum((unsigned char)s[r])) r--;
            else if (tolower(s[l]) != tolower(s[r])) return false;
            else { l++; r--; }
        }
        return true;
    }
};

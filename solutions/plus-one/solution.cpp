class Solution {
public:
    vector<int> plusOne(vector<int>& digits) {
        for (int i = (int)digits.size() - 1; i >= 0; i--) {
            if (digits[i] < 9) {
                digits[i]++; // no carry: done
                return digits;
            }
            digits[i] = 0; // 9 + 1 = 10: write 0, carry 1 leftwards
        }
        digits.insert(digits.begin(), 1); // every digit was 9: the number grows a digit
        return digits;
    }
};

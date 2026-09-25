class Solution {
    public int[] plusOne(int[] digits) {
        for (int i = digits.length - 1; i >= 0; i--) {
            if (digits[i] < 9) {
                digits[i]++; // no carry: done
                return digits;
            }
            digits[i] = 0; // 9 + 1 = 10: write 0, carry 1 leftwards
        }
        int[] out = new int[digits.length + 1]; // every digit was 9: the number grows a digit
        out[0] = 1;
        return out;
    }
}

/**
 * @param {number[]} digits
 * @return {number[]}
 */
function plusOne(digits) {
  for (let i = digits.length - 1; i >= 0; i--) {
    if (digits[i] < 9) {
      digits[i]++; // no carry: done
      return digits;
    }
    digits[i] = 0; // 9 + 1 = 10: write 0, carry 1 leftwards
  }
  return [1, ...digits]; // every digit was 9: the number grows a digit
}

/**
 * @param {number} a
 * @param {number} b
 * @return {number}
 */
function getSum(a, b) {
  // a ^ b adds without carrying; (a & b) << 1 is the carry. Repeat until no carry is left.
  while (b !== 0) [a, b] = [a ^ b, (a & b) << 1];
  return a;
}

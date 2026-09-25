/**
 * @param {number} x
 * @param {number} n
 * @return {number}
 */
function myPow(x, n) {
  if (n < 0) [x, n] = [1 / x, -n]; // x^-n = (1/x)^n
  // Square-and-multiply: read n in binary. x, x², x⁴, x⁸… are one squaring apart,
  // and x^n is the product of those whose bit in n is 1.
  let result = 1;
  while (n > 0) {
    if (n % 2 === 1) result *= x;
    x *= x;
    n = Math.floor(n / 2); // not >> 1: 2^31 does not fit JavaScript's 32-bit shifts
  }
  return result;
}

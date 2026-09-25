/**
 * @param {number} n - a positive integer
 * @return {number} - a positive integer
 */
function reverseBits(n) {
  let out = 0;
  for (let i = 0; i < 32; i++) {
    out = (out << 1) | (n & 1); // take n's lowest bit onto out's low end
    n >>>= 1;
  }
  return out >>> 0; // read the 32 bits as unsigned
}

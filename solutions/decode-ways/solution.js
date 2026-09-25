/**
 * @param {string} s
 * @return {number}
 */
function numDecodings(s) {
  // ways(i): decodings of s[i..]. A letter is one digit 1-9, or two digits 10-26.
  // ways(i) = [s[i] != "0"] * ways(i + 1) + [s[i..i+1] in 10..26] * ways(i + 2)
  let next = 1; // ways(i + 1); the empty end decodes one way
  let next2 = 0; // ways(i + 2)
  for (let i = s.length - 1; i >= 0; i--) {
    let cur = 0;
    if (s[i] !== '0') {
      cur = next;
      const two = Number(s.slice(i, i + 2));
      if (i + 1 < s.length && two >= 10 && two <= 26) cur += next2;
    }
    [next, next2] = [cur, next];
  }
  return next;
}

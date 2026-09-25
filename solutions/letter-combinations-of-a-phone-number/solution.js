/**
 * @param {string} digits
 * @return {string[]}
 */
function letterCombinations(digits) {
  if (!digits) return [];
  const keys = { 2: 'abc', 3: 'def', 4: 'ghi', 5: 'jkl', 6: 'mno', 7: 'pqrs', 8: 'tuv', 9: 'wxyz' };
  const out = [];
  // Letters for digits[0..i) are chosen.
  const spell = (i, cur) => {
    if (i === digits.length) return out.push(cur);
    for (const letter of keys[digits[i]]) spell(i + 1, cur + letter);
  };
  spell(0, '');
  return out;
}

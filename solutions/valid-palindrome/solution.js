/**
 * @param {string} s
 * @return {boolean}
 */
function isPalindrome(s) {
  const alnum = (c) => /[a-z0-9]/i.test(c);
  let l = 0;
  let r = s.length - 1;
  while (l < r) {
    if (!alnum(s[l])) l++;
    else if (!alnum(s[r])) r--;
    else if (s[l].toLowerCase() !== s[r].toLowerCase()) return false;
    else {
      l++;
      r--;
    }
  }
  return true;
}

/**
 * @param {string} s1
 * @param {string} s2
 * @param {string} s3
 * @return {boolean}
 */
function isInterleave(s1, s2, s3) {
  if (s1.length + s2.length !== s3.length) return false;
  // ok[j] (in row i): can s1[0..i) and s2[0..j) interleave into s3[0..i + j)? The last
  // letter of s3[0..i + j) came from s1 or from s2.
  const ok = new Array(s2.length + 1).fill(false);
  for (let i = 0; i <= s1.length; i++) {
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0 && j === 0) {
        ok[j] = true;
        continue;
      }
      const k = i + j - 1;
      const from1 = i > 0 && ok[j] && s1[i - 1] === s3[k]; // ok[j] still holds row i - 1
      const from2 = j > 0 && ok[j - 1] && s2[j - 1] === s3[k];
      ok[j] = from1 || from2;
    }
  }
  return ok[s2.length];
}

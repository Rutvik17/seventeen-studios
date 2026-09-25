/**
 * @param {string[]} strs
 * @return {string[][]}
 */
function groupAnagrams(strs) {
  const groups = new Map(); // letter counts -> words with those counts
  for (const word of strs) {
    const count = new Array(26).fill(0);
    for (let i = 0; i < word.length; i++) count[word.charCodeAt(i) - 97]++;
    const key = count.join(',');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }
  return [...groups.values()];
}

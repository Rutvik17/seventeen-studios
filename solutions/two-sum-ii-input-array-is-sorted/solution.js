/**
 * @param {number[]} numbers
 * @param {number} target
 * @return {number[]}
 */
function twoSum(numbers, target) {
  let l = 0;
  let r = numbers.length - 1;
  while (l < r) {
    const total = numbers[l] + numbers[r];
    if (total === target) return [l + 1, r + 1]; // the answer is 1-indexed
    if (total < target) l++; // need a bigger sum
    else r--; // need a smaller sum
  }
  return [];
}

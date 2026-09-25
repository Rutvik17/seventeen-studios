/**
 * @param {string} num1
 * @param {string} num2
 * @return {string}
 */
function multiply(num1, num2) {
  if (num1 === '0' || num2 === '0') return '0';
  // Long multiplication: digit i of num1 times digit j of num2 lands at place i + j + 1
  // of the product (counting from the left, with room for one extra digit).
  const out = new Array(num1.length + num2.length).fill(0);
  for (let i = num1.length - 1; i >= 0; i--) {
    for (let j = num2.length - 1; j >= 0; j--) {
      const total = out[i + j + 1] + Number(num1[i]) * Number(num2[j]);
      out[i + j + 1] = total % 10;
      out[i + j] += Math.floor(total / 10); // the carry, settled when that place is reached
    }
  }
  return out.join('').replace(/^0+/, '');
}

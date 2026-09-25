/**
 * @param {string[]} tokens
 * @return {number}
 */
function evalRPN(tokens) {
  const stack = [];
  for (const tok of tokens) {
    if ('+-*/'.includes(tok)) {
      const b = stack.pop(); // the right operand is on top
      const a = stack.pop();
      if (tok === '+') stack.push(a + b);
      else if (tok === '-') stack.push(a - b);
      else if (tok === '*') stack.push(a * b);
      else stack.push(Math.trunc(a / b)); // division truncates toward zero
    } else stack.push(Number(tok));
  }
  return stack[0];
}

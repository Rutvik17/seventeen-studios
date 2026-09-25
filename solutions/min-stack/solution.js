class MinStack {
  constructor() {
    this.stack = []; // each entry: [value, smallest value at or below it]
  }
  push(val) {
    const smallest = this.stack.length ? Math.min(val, this.stack[this.stack.length - 1][1]) : val;
    this.stack.push([val, smallest]);
  }
  pop() {
    this.stack.pop();
  }
  top() {
    return this.stack[this.stack.length - 1][0];
  }
  getMin() {
    return this.stack[this.stack.length - 1][1];
  }
}

impl Solution {
    pub fn eval_rpn(tokens: Vec<String>) -> i32 {
        let mut stack: Vec<i32> = Vec::new();
        for tok in tokens {
            match tok.as_str() {
                "+" | "-" | "*" | "/" => {
                    let b = stack.pop().unwrap(); // the right operand is on top
                    let a = stack.pop().unwrap();
                    stack.push(match tok.as_str() {
                        "+" => a + b,
                        "-" => a - b,
                        "*" => a * b,
                        _ => a / b, // truncates toward zero
                    });
                }
                n => stack.push(n.parse().unwrap()),
            }
        }
        stack[0]
    }
}

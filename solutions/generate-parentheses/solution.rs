impl Solution {
    pub fn generate_parenthesis(n: i32) -> Vec<String> {
        fn build(path: &mut String, opened: i32, closed: i32, n: i32, out: &mut Vec<String>) {
            if path.len() as i32 == 2 * n {
                out.push(path.clone());
                return;
            }
            if opened < n {
                // an opener is allowed while any remain
                path.push('(');
                build(path, opened + 1, closed, n, out);
                path.pop();
            }
            if closed < opened {
                // a closer is allowed only if it has an opener to match
                path.push(')');
                build(path, opened, closed + 1, n, out);
                path.pop();
            }
        }
        let mut out = vec![];
        build(&mut String::new(), 0, 0, n, &mut out);
        out
    }
}

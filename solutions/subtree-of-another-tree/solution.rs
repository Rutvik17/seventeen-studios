impl Solution {
    pub fn is_subtree(root: Option<Rc<RefCell<TreeNode>>>, sub_root: Option<Rc<RefCell<TreeNode>>>) -> bool {
        // Write each tree in preorder, "^" before every value and "#" for every gap.
        // A subtree is then exactly a run of the big tree's text.
        fn write(node: &Option<Rc<RefCell<TreeNode>>>, out: &mut String) {
            match node {
                None => out.push('#'),
                Some(n) => {
                    let n = n.borrow();
                    out.push('^');
                    out.push_str(&n.val.to_string());
                    write(&n.left, out);
                    write(&n.right, out);
                }
            }
        }
        let (mut text, mut pat) = (String::new(), String::new());
        write(&root, &mut text);
        write(&sub_root, &mut pat);
        let (text, pat) = (text.as_bytes(), pat.as_bytes());
        // Knuth-Morris-Pratt: fail[i] is the longest proper prefix of pat[..=i] that is also its suffix.
        let mut fail = vec![0; pat.len()];
        let mut k = 0;
        for i in 1..pat.len() {
            while k > 0 && pat[i] != pat[k] {
                k = fail[k - 1];
            }
            if pat[i] == pat[k] {
                k += 1;
            }
            fail[i] = k;
        }
        k = 0;
        for &c in text {
            while k > 0 && c != pat[k] {
                k = fail[k - 1];
            }
            if c == pat[k] {
                k += 1;
            }
            if k == pat.len() {
                return true;
            }
        }
        false
    }
}

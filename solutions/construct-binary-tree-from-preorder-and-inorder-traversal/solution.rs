use std::collections::HashMap;

impl Solution {
    pub fn build_tree(preorder: Vec<i32>, inorder: Vec<i32>) -> Option<Rc<RefCell<TreeNode>>> {
        // Each value's place in inorder.
        let where_: HashMap<i32, usize> = inorder.iter().enumerate().map(|(i, &v)| (v, i)).collect();
        // The subtree made of inorder[lo..hi); next is the root of the next subtree to build.
        fn build(pre: &[i32], where_: &HashMap<i32, usize>, next: &mut usize, lo: usize, hi: usize) -> Option<Rc<RefCell<TreeNode>>> {
            if lo >= hi {
                return None;
            }
            let v = pre[*next];
            *next += 1;
            let m = where_[&v]; // left of it in inorder is the left subtree, right of it the right
            let root = Rc::new(RefCell::new(TreeNode::new(v)));
            let left = build(pre, where_, next, lo, m);
            let right = build(pre, where_, next, m + 1, hi);
            {
                let mut r = root.borrow_mut();
                r.left = left;
                r.right = right;
            }
            Some(root)
        }
        let mut next = 0;
        build(&preorder, &where_, &mut next, 0, inorder.len())
    }
}

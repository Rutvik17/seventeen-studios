use std::collections::VecDeque;

impl Solution {
    pub fn level_order(root: Option<Rc<RefCell<TreeNode>>>) -> Vec<Vec<i32>> {
        let mut out = vec![];
        let mut queue: VecDeque<Rc<RefCell<TreeNode>>> = root.into_iter().collect();
        while !queue.is_empty() {
            let mut level = vec![];
            for _ in 0..queue.len() {
                // exactly the nodes of this level
                let node = queue.pop_front().unwrap();
                let n = node.borrow();
                level.push(n.val);
                if let Some(l) = &n.left {
                    queue.push_back(l.clone());
                }
                if let Some(r) = &n.right {
                    queue.push_back(r.clone());
                }
            }
            out.push(level);
        }
        out
    }
}

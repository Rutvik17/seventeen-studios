use std::collections::HashMap;

impl Solution {
    pub fn clone_graph(node: Option<Rc<RefCell<Node>>>) -> Option<Rc<RefCell<Node>>> {
        // Values are unique, so a node's value names it: value -> its copy.
        fn clone(n: &Rc<RefCell<Node>>, copies: &mut HashMap<i32, Rc<RefCell<Node>>>) -> Rc<RefCell<Node>> {
            let val = n.borrow().val;
            if let Some(c) = copies.get(&val) {
                return c.clone();
            }
            let copy = Rc::new(RefCell::new(Node::new(val)));
            copies.insert(val, copy.clone()); // recorded before the neighbours, so a cycle back to n finds it
            let neighbors = n.borrow().neighbors.clone();
            for m in &neighbors {
                let c = clone(m, copies);
                copy.borrow_mut().neighbors.push(c);
            }
            copy
        }
        node.map(|n| clone(&n, &mut HashMap::new()))
    }
}

use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;

impl Solution {
    pub fn copy_random_list(head: Option<Rc<RefCell<Node>>>) -> Option<Rc<RefCell<Node>>> {
        // In Rust the nodes are shared (Rc) and mutable (RefCell); map each original to its copy
        // by address, then wire up next and random from the map.
        let mut copies: HashMap<*const RefCell<Node>, Rc<RefCell<Node>>> = HashMap::new();
        let mut cur = head.clone();
        while let Some(node) = cur {
            copies.insert(Rc::as_ptr(&node), Rc::new(RefCell::new(Node::new(node.borrow().val))));
            cur = node.borrow().next.clone();
        }
        let copy_of = |n: &Option<Rc<RefCell<Node>>>| n.as_ref().map(|n| copies[&Rc::as_ptr(n)].clone());
        let mut cur = head.clone();
        while let Some(node) = cur {
            let copy = copies[&Rc::as_ptr(&node)].clone();
            copy.borrow_mut().next = copy_of(&node.borrow().next);
            copy.borrow_mut().random = copy_of(&node.borrow().random);
            cur = node.borrow().next.clone();
        }
        copy_of(&head)
    }
}

use std::cell::RefCell;
use std::rc::Rc;

// A list that can loop back on itself needs shared nodes in Rust:
// pub struct ListNode { pub val: i32, pub next: Option<Rc<RefCell<ListNode>>> }
impl Solution {
    pub fn has_cycle(head: Option<Rc<RefCell<ListNode>>>) -> bool {
        let next = |n: &Option<Rc<RefCell<ListNode>>>| n.as_ref().and_then(|x| x.borrow().next.clone());
        let (mut slow, mut fast) = (head.clone(), head);
        loop {
            fast = next(&next(&fast)); // two steps
            slow = next(&slow); // one step
            match (&slow, &fast) {
                (Some(s), Some(f)) if Rc::ptr_eq(s, f) => return true, // the fast one lapped the slow one
                (_, None) => return false, // the fast one fell off the end: no loop
                _ => {}
            }
        }
    }
}

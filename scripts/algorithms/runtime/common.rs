// Runtime for testing the Rust solutions: LeetCode's node types, builders, and a JSON printer.
pub use std::cell::RefCell;
pub use std::rc::Rc;

#[derive(PartialEq, Eq, Clone, Debug)]
pub struct ListNode { pub val: i32, pub next: Option<Box<ListNode>> }
impl ListNode { #[inline] pub fn new(val: i32) -> Self { ListNode { next: None, val } } }

#[derive(Debug, PartialEq, Eq)]
pub struct TreeNode { pub val: i32, pub left: Option<Rc<RefCell<TreeNode>>>, pub right: Option<Rc<RefCell<TreeNode>>> }
impl TreeNode { #[inline] pub fn new(val: i32) -> Self { TreeNode { val, left: None, right: None } } }

pub fn mk_list(v: Vec<i32>) -> Option<Box<ListNode>> { let mut head = None; for &x in v.iter().rev() { let mut n = Box::new(ListNode::new(x)); n.next = head; head = Some(n); } head }
pub fn mk_tree(v: &[&str]) -> Option<Rc<RefCell<TreeNode>>> {
    if v.is_empty() || v[0] == "null" { return None; }
    let root = Rc::new(RefCell::new(TreeNode::new(v[0].parse().unwrap())));
    let mut q = std::collections::VecDeque::new(); q.push_back(root.clone()); let mut i = 1;
    while let Some(n) = q.pop_front() {
        if i >= v.len() { break; }
        if v[i] != "null" { let c = Rc::new(RefCell::new(TreeNode::new(v[i].parse().unwrap()))); n.borrow_mut().left = Some(c.clone()); q.push_back(c); } i += 1;
        if i < v.len() && v[i] != "null" { let c = Rc::new(RefCell::new(TreeNode::new(v[i].parse().unwrap()))); n.borrow_mut().right = Some(c.clone()); q.push_back(c); } i += 1;
    }
    Some(root)
}
pub fn find_node(r: &Option<Rc<RefCell<TreeNode>>>, val: i32) -> Option<Rc<RefCell<TreeNode>>> {
    let n = r.as_ref()?; if n.borrow().val == val { return Some(n.clone()); }
    let l = find_node(&n.borrow().left, val); if l.is_some() { return l; } find_node(&n.borrow().right, val)
}

pub trait J { fn j(&self) -> String; }
impl J for i32 { fn j(&self) -> String { self.to_string() } }
impl J for i64 { fn j(&self) -> String { self.to_string() } }
impl J for u32 { fn j(&self) -> String { self.to_string() } }
impl J for usize { fn j(&self) -> String { self.to_string() } }
impl J for f64 { fn j(&self) -> String { format!("{:.10}", self) } }
impl J for bool { fn j(&self) -> String { self.to_string() } }
impl J for char { fn j(&self) -> String { self.to_string().j() } }
impl J for String { fn j(&self) -> String { let mut o = String::from("\""); for c in self.chars() { match c { '"' => o.push_str("\\\""), '\\' => o.push_str("\\\\"), '\n' => o.push_str("\\n"), _ => o.push(c) } } o.push('"'); o } }
impl J for &str { fn j(&self) -> String { self.to_string().j() } }
impl J for () { fn j(&self) -> String { "null".to_string() } }
impl<T: J> J for Vec<T> { fn j(&self) -> String { format!("[{}]", self.iter().map(|x| x.j()).collect::<Vec<_>>().join(",")) } }
impl<T: J> J for Option<T> { fn j(&self) -> String { match self { Some(x) => x.j(), None => "null".to_string() } } }
impl J for Box<ListNode> { fn j(&self) -> String { let mut v = vec![]; let mut c: Option<&Box<ListNode>> = Some(self); while let Some(n) = c { v.push(n.val); c = n.next.as_ref(); } v.j() } }
pub fn list_j(h: &Option<Box<ListNode>>) -> String { match h { Some(b) => b.j(), None => "[]".to_string() } }
pub fn tree_j(r: &Option<Rc<RefCell<TreeNode>>>) -> String {
    let mut o: Vec<String> = vec![]; let mut q = std::collections::VecDeque::new(); q.push_back(r.clone());
    while let Some(n) = q.pop_front() { match n { None => o.push("null".into()), Some(n) => { o.push(n.borrow().val.to_string()); q.push_back(n.borrow().left.clone()); q.push_back(n.borrow().right.clone()); } } }
    while o.last().map(|s| s == "null").unwrap_or(false) { o.pop(); }
    format!("[{}]", o.join(","))
}

/// A linked list that can loop back on itself, for cycle detection.
pub mod rc {
    use super::*;
    #[derive(Debug)]
    pub struct ListNode { pub val: i32, pub next: Option<Rc<RefCell<ListNode>>> }
    impl ListNode { pub fn new(val: i32) -> Self { ListNode { val, next: None } } }
    pub fn mk_cycle(v: Vec<i32>, pos: i32) -> Option<Rc<RefCell<ListNode>>> {
        let ns: Vec<_> = v.iter().map(|&x| Rc::new(RefCell::new(ListNode::new(x)))).collect();
        for i in 0..ns.len().saturating_sub(1) { ns[i].borrow_mut().next = Some(ns[i + 1].clone()); }
        if pos >= 0 && !ns.is_empty() { ns[ns.len() - 1].borrow_mut().next = Some(ns[pos as usize].clone()); }
        ns.first().cloned()
    }
}

/// The node of a graph given as an adjacency list.
pub mod graph {
    use super::*;
    #[derive(Debug)]
    pub struct Node { pub val: i32, pub neighbors: Vec<Rc<RefCell<Node>>> }
    impl Node { pub fn new(val: i32) -> Self { Node { val, neighbors: vec![] } } }
    pub fn mk_graph(adj: Vec<Vec<i32>>) -> Option<Rc<RefCell<Node>>> {
        if adj.is_empty() { return None; }
        let ns: Vec<_> = (0..adj.len()).map(|i| Rc::new(RefCell::new(Node::new(i as i32 + 1)))).collect();
        for (i, a) in adj.iter().enumerate() { ns[i].borrow_mut().neighbors = a.iter().map(|&j| ns[j as usize - 1].clone()).collect(); }
        Some(ns[0].clone())
    }
    pub fn graph_j(n: &Option<Rc<RefCell<Node>>>) -> String {
        let n = match n { Some(n) => n.clone(), None => return "[]".into() };
        let mut by: std::collections::BTreeMap<i32, Rc<RefCell<Node>>> = Default::default(); let mut st = vec![n];
        while let Some(x) = st.pop() { let v = x.borrow().val; if by.contains_key(&v) { continue; } for y in x.borrow().neighbors.iter() { st.push(y.clone()); } by.insert(v, x); }
        let rows: Vec<String> = by.values().map(|x| x.borrow().neighbors.iter().map(|y| y.borrow().val).collect::<Vec<_>>().j()).collect();
        format!("[{}]", rows.join(","))
    }
}

/// A linked list whose nodes also point at a random node.
pub mod random {
    use super::*;
    #[derive(Debug)]
    pub struct Node { pub val: i32, pub next: Option<Rc<RefCell<Node>>>, pub random: Option<Rc<RefCell<Node>>> }
    impl Node { pub fn new(val: i32) -> Self { Node { val, next: None, random: None } } }
    pub fn mk_random(v: Vec<(i32, i32)>) -> Option<Rc<RefCell<Node>>> {
        let ns: Vec<_> = v.iter().map(|&(x, _)| Rc::new(RefCell::new(Node::new(x)))).collect();
        for i in 0..ns.len() { if i + 1 < ns.len() { ns[i].borrow_mut().next = Some(ns[i + 1].clone()); } if v[i].1 >= 0 { ns[i].borrow_mut().random = Some(ns[v[i].1 as usize].clone()); } }
        ns.first().cloned()
    }
    pub fn random_j(h: &Option<Rc<RefCell<Node>>>) -> String {
        let mut ns: Vec<Rc<RefCell<Node>>> = vec![]; let mut c = h.clone();
        while let Some(n) = c { ns.push(n.clone()); c = n.borrow().next.clone(); }
        let rows: Vec<String> = ns.iter().map(|n| { let r = n.borrow().random.as_ref().and_then(|r| ns.iter().position(|m| Rc::ptr_eq(m, r))); format!("[{},{}]", n.borrow().val, r.map(|i| i.to_string()).unwrap_or("null".into())) }).collect();
        format!("[{}]", rows.join(","))
    }
}

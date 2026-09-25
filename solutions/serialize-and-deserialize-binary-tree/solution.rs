struct Codec;

impl Codec {
    fn new() -> Self {
        Codec
    }

    /// Preorder, with "#" for every missing child: "1,2,#,#,3,4,#,#,5,#,#".
    fn serialize(&self, root: Option<Rc<RefCell<TreeNode>>>) -> String {
        fn walk(node: &Option<Rc<RefCell<TreeNode>>>, out: &mut Vec<String>) {
            match node {
                None => out.push("#".to_string()),
                Some(n) => {
                    let n = n.borrow();
                    out.push(n.val.to_string());
                    walk(&n.left, out);
                    walk(&n.right, out);
                }
            }
        }
        let mut out = vec![];
        walk(&root, &mut out);
        out.join(",")
    }

    /// Read the tokens back in the same order: a node, then its whole left side, then its right.
    fn deserialize(&self, data: String) -> Option<Rc<RefCell<TreeNode>>> {
        fn build<'a>(tokens: &mut impl Iterator<Item = &'a str>) -> Option<Rc<RefCell<TreeNode>>> {
            let t = tokens.next()?;
            if t == "#" {
                return None;
            }
            let node = Rc::new(RefCell::new(TreeNode::new(t.parse().unwrap())));
            let left = build(tokens);
            let right = build(tokens);
            {
                let mut n = node.borrow_mut();
                n.left = left;
                n.right = right;
            }
            Some(node)
        }
        build(&mut data.split(','))
    }
}

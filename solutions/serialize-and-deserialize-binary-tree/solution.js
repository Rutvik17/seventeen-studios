class Codec {
  /**
   * Preorder, with "#" for every missing child: "1,2,#,#,3,4,#,#,5,#,#".
   * @param {TreeNode} root
   * @return {string}
   */
  serialize(root) {
    const out = [];
    const walk = (node) => {
      if (!node) return out.push('#');
      out.push(String(node.val));
      walk(node.left);
      walk(node.right);
    };
    walk(root);
    return out.join(',');
  }

  /**
   * Read the tokens back in the same order: a node, then its whole left side, then its right.
   * @param {string} data
   * @return {TreeNode}
   */
  deserialize(data) {
    const tokens = data.split(',');
    let i = 0;
    const build = () => {
      const t = tokens[i++];
      if (t === '#') return null;
      const node = new TreeNode(Number(t));
      node.left = build();
      node.right = build();
      return node;
    };
    return build();
  }
}

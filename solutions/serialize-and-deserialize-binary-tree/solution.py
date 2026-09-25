class Codec:
    def serialize(self, root: Optional[TreeNode]) -> str:
        # Preorder, with "#" for every missing child: "1,2,#,#,3,4,#,#,5,#,#".
        out = []

        def walk(node):
            if not node:
                out.append("#")
                return
            out.append(str(node.val))
            walk(node.left)
            walk(node.right)

        walk(root)
        return ",".join(out)

    def deserialize(self, data: str) -> Optional[TreeNode]:
        # Read the tokens back in the same order: a node, then its whole left side, then its right.
        tokens = iter(data.split(","))

        def build():
            t = next(tokens)
            if t == "#":
                return None
            node = TreeNode(int(t))
            node.left = build()
            node.right = build()
            return node

        return build()

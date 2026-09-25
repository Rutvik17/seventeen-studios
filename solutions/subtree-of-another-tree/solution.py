class Solution:
    def isSubtree(self, root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:
        # Write each tree in preorder, "^" before every value and "#" for every gap.
        # A subtree is then exactly a run of the big tree's text.
        def write(node, out):
            if not node:
                out.append("#")
                return
            out.append("^" + str(node.val))
            write(node.left, out)
            write(node.right, out)

        text, pat = [], []
        write(root, text)
        write(subRoot, pat)
        text, pat = "".join(text), "".join(pat)
        # Knuth-Morris-Pratt: fail[i] is the longest proper prefix of pat[:i+1] that is also its suffix.
        fail = [0] * len(pat)
        k = 0
        for i in range(1, len(pat)):
            while k and pat[i] != pat[k]:
                k = fail[k - 1]
            if pat[i] == pat[k]:
                k += 1
            fail[i] = k
        k = 0
        for c in text:
            while k and c != pat[k]:
                k = fail[k - 1]
            if c == pat[k]:
                k += 1
            if k == len(pat):
                return True
        return False

/**
 * @param {TreeNode} root
 * @param {TreeNode} subRoot
 * @return {boolean}
 */
function isSubtree(root, subRoot) {
  // Write each tree in preorder, "^" before every value and "#" for every gap.
  // A subtree is then exactly a run of the big tree's text.
  const write = (node, out) => {
    if (!node) return out.push('#');
    out.push('^' + node.val);
    write(node.left, out);
    write(node.right, out);
  };
  const t = [];
  const p = [];
  write(root, t);
  write(subRoot, p);
  const text = t.join('');
  const pat = p.join('');
  // Knuth-Morris-Pratt: fail[i] is the longest proper prefix of pat[0..i] that is also its suffix.
  const fail = new Array(pat.length).fill(0);
  for (let i = 1, k = 0; i < pat.length; i++) {
    while (k && pat[i] !== pat[k]) k = fail[k - 1];
    if (pat[i] === pat[k]) k++;
    fail[i] = k;
  }
  for (let i = 0, k = 0; i < text.length; i++) {
    while (k && text[i] !== pat[k]) k = fail[k - 1];
    if (text[i] === pat[k]) k++;
    if (k === pat.length) return true;
  }
  return false;
}

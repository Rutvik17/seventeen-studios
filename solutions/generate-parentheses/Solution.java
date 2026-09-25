class Solution {
    public List<String> generateParenthesis(int n) {
        List<String> out = new ArrayList<>();
        build(new StringBuilder(), 0, 0, n, out);
        return out;
    }

    private void build(StringBuilder path, int opened, int closed, int n, List<String> out) {
        if (path.length() == 2 * n) { out.add(path.toString()); return; }
        if (opened < n) { // an opener is allowed while any remain
            path.append('(');
            build(path, opened + 1, closed, n, out);
            path.deleteCharAt(path.length() - 1);
        }
        if (closed < opened) { // a closer is allowed only if it has an opener to match
            path.append(')');
            build(path, opened, closed + 1, n, out);
            path.deleteCharAt(path.length() - 1);
        }
    }
}

package common;
import java.util.*;
/** Builders for the harness's inputs, and a JSON printer for its outputs. */
public final class H {
    public static ListNode mkList(int[] v) { ListNode d = new ListNode(), c = d; for (int x : v) { c.next = new ListNode(x); c = c.next; } return d.next; }
    public static ListNode mkCycle(int[] v, int pos) { ListNode[] ns = new ListNode[v.length]; for (int i = 0; i < v.length; i++) ns[i] = new ListNode(v[i]); for (int i = 0; i + 1 < v.length; i++) ns[i].next = ns[i + 1]; if (pos >= 0 && v.length > 0) ns[v.length - 1].next = ns[pos]; return v.length == 0 ? null : ns[0]; }
    public static TreeNode mkTree(String[] v) {
        if (v.length == 0 || v[0].equals("null")) return null;
        TreeNode root = new TreeNode(Integer.parseInt(v[0])); Deque<TreeNode> q = new ArrayDeque<>(); q.add(root); int i = 1;
        while (!q.isEmpty() && i < v.length) {
            TreeNode n = q.poll();
            if (i < v.length && !v[i].equals("null")) { n.left = new TreeNode(Integer.parseInt(v[i])); q.add(n.left); } i++;
            if (i < v.length && !v[i].equals("null")) { n.right = new TreeNode(Integer.parseInt(v[i])); q.add(n.right); } i++;
        }
        return root;
    }
    public static TreeNode findNode(TreeNode r, int val) { if (r == null) return null; if (r.val == val) return r; TreeNode a = findNode(r.left, val); return a != null ? a : findNode(r.right, val); }
    public static common.random.Node mkRandom(int[][] v) { common.random.Node[] ns = new common.random.Node[v.length]; for (int i = 0; i < v.length; i++) ns[i] = new common.random.Node(v[i][0]); for (int i = 0; i < v.length; i++) { if (i + 1 < v.length) ns[i].next = ns[i + 1]; if (v[i][1] >= 0) ns[i].random = ns[v[i][1]]; } return v.length == 0 ? null : ns[0]; }
    public static common.graph.Node mkGraph(int[][] adj) { if (adj.length == 0) return null; common.graph.Node[] ns = new common.graph.Node[adj.length]; for (int i = 0; i < adj.length; i++) ns[i] = new common.graph.Node(i + 1); for (int i = 0; i < adj.length; i++) for (int j : adj[i]) ns[i].neighbors.add(ns[j - 1]); return ns[0]; }

    static String str(String s) { StringBuilder o = new StringBuilder("\""); for (char c : s.toCharArray()) { if (c == '"' || c == '\\') o.append('\\').append(c); else if (c == '\n') o.append("\\n"); else o.append(c); } return o.append('"').toString(); }
    public static String json(Object x) {
        if (x == null) return "null";
        if (x instanceof String) return str((String) x);
        if (x instanceof Character) return str(String.valueOf(x));
        if (x instanceof Double || x instanceof Float) return String.format("%.10f", ((Number) x).doubleValue());
        if (x instanceof Number || x instanceof Boolean) return x.toString();
        if (x instanceof int[]) { int[] a = (int[]) x; StringBuilder o = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) o.append(','); o.append(a[i]); } return o.append(']').toString(); }
        if (x instanceof long[]) { long[] a = (long[]) x; StringBuilder o = new StringBuilder("["); for (int i = 0; i < a.length; i++) { if (i > 0) o.append(','); o.append(a[i]); } return o.append(']').toString(); }
        if (x instanceof double[]) { double[] a = (double[]) x; List<Object> l = new ArrayList<>(); for (double d : a) l.add(d); return json(l); }
        if (x instanceof boolean[]) { boolean[] a = (boolean[]) x; List<Object> l = new ArrayList<>(); for (boolean d : a) l.add(d); return json(l); }
        if (x instanceof char[]) { char[] a = (char[]) x; List<Object> l = new ArrayList<>(); for (char d : a) l.add(d); return json(l); }
        if (x instanceof Object[]) return json(Arrays.asList((Object[]) x));
        if (x instanceof Iterable) { StringBuilder o = new StringBuilder("["); boolean f = true; for (Object y : (Iterable<?>) x) { if (!f) o.append(','); f = false; o.append(json(y)); } return o.append(']').toString(); }
        if (x instanceof ListNode) { List<Object> l = new ArrayList<>(); int k = 0; for (ListNode n = (ListNode) x; n != null && k++ < 10000; n = n.next) l.add(n.val); return json(l); }
        if (x instanceof TreeNode) {
            List<String> o = new ArrayList<>(); Deque<TreeNode> q = new LinkedList<>(); q.add((TreeNode) x);
            while (!q.isEmpty()) { TreeNode n = q.poll(); if (n == null) o.add("null"); else { o.add(String.valueOf(n.val)); q.add(n.left); q.add(n.right); } }
            while (!o.isEmpty() && o.get(o.size() - 1).equals("null")) o.remove(o.size() - 1);
            return "[" + String.join(",", o) + "]";
        }
        if (x instanceof common.random.Node) { List<common.random.Node> ns = new ArrayList<>(); for (common.random.Node n = (common.random.Node) x; n != null; n = n.next) ns.add(n); StringBuilder o = new StringBuilder("["); for (int i = 0; i < ns.size(); i++) { if (i > 0) o.append(','); int r = -1; for (int j = 0; j < ns.size(); j++) if (ns.get(j) == ns.get(i).random) r = j; o.append('[').append(ns.get(i).val).append(',').append(r < 0 ? "null" : String.valueOf(r)).append(']'); } return o.append(']').toString(); }
        if (x instanceof common.graph.Node) { TreeMap<Integer, common.graph.Node> by = new TreeMap<>(); Deque<common.graph.Node> st = new ArrayDeque<>(); st.push((common.graph.Node) x); while (!st.isEmpty()) { common.graph.Node n = st.pop(); if (by.containsKey(n.val)) continue; by.put(n.val, n); for (common.graph.Node m : n.neighbors) st.push(m); } List<Object> rows = new ArrayList<>(); for (common.graph.Node n : by.values()) { List<Object> a = new ArrayList<>(); for (common.graph.Node m : n.neighbors) a.add(m.val); rows.add(a); } return json(rows); }
        throw new RuntimeException("cannot print " + x.getClass());
    }
}

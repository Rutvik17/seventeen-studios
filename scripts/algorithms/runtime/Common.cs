// Runtime for testing the C# solutions: LeetCode's node types, builders, and a JSON printer.
using System.Collections;
using System.Globalization;
using System.Text;

public class ListNode { public int val; public ListNode next; public ListNode(int val = 0, ListNode next = null) { this.val = val; this.next = next; } }
public class TreeNode { public int val; public TreeNode left; public TreeNode right; public TreeNode(int val = 0, TreeNode left = null, TreeNode right = null) { this.val = val; this.left = left; this.right = right; } }
namespace Common.Graph {
    public class Node { public int val; public IList<Node> neighbors; public Node() { val = 0; neighbors = new List<Node>(); } public Node(int _val) { val = _val; neighbors = new List<Node>(); } public Node(int _val, List<Node> _neighbors) { val = _val; neighbors = _neighbors; } }
}
namespace Common.Random {
    public class Node { public int val; public Node next; public Node random; public Node(int _val) { val = _val; next = null; random = null; } }
}

public static class H {
    public static ListNode MkList(int[] v) { var d = new ListNode(); var c = d; foreach (var x in v) { c.next = new ListNode(x); c = c.next; } return d.next; }
    public static ListNode MkCycle(int[] v, int pos) { var ns = v.Select(x => new ListNode(x)).ToArray(); for (int i = 0; i + 1 < ns.Length; i++) ns[i].next = ns[i + 1]; if (pos >= 0 && ns.Length > 0) ns[^1].next = ns[pos]; return ns.Length == 0 ? null : ns[0]; }
    public static TreeNode MkTree(string[] v) {
        if (v.Length == 0 || v[0] == "null") return null;
        var root = new TreeNode(int.Parse(v[0])); var q = new Queue<TreeNode>(); q.Enqueue(root); int i = 1;
        while (q.Count > 0 && i < v.Length) {
            var n = q.Dequeue();
            if (i < v.Length && v[i] != "null") { n.left = new TreeNode(int.Parse(v[i])); q.Enqueue(n.left); } i++;
            if (i < v.Length && v[i] != "null") { n.right = new TreeNode(int.Parse(v[i])); q.Enqueue(n.right); } i++;
        }
        return root;
    }
    public static TreeNode FindNode(TreeNode r, int val) { if (r == null) return null; if (r.val == val) return r; return FindNode(r.left, val) ?? FindNode(r.right, val); }
    public static Common.Random.Node MkRandom(int[][] v) { var ns = v.Select(p => new Common.Random.Node(p[0])).ToArray(); for (int i = 0; i < ns.Length; i++) { if (i + 1 < ns.Length) ns[i].next = ns[i + 1]; if (v[i][1] >= 0) ns[i].random = ns[v[i][1]]; } return ns.Length == 0 ? null : ns[0]; }
    public static Common.Graph.Node MkGraph(int[][] adj) { if (adj.Length == 0) return null; var ns = Enumerable.Range(1, adj.Length).Select(i => new Common.Graph.Node(i)).ToArray(); for (int i = 0; i < adj.Length; i++) foreach (var j in adj[i]) ns[i].neighbors.Add(ns[j - 1]); return ns[0]; }

    static string Str(string s) { var o = new StringBuilder("\""); foreach (var c in s) { if (c == '"' || c == '\\') o.Append('\\').Append(c); else if (c == '\n') o.Append("\\n"); else o.Append(c); } return o.Append('"').ToString(); }
    public static string Json(object x) {
        switch (x) {
            case null: return "null";
            case string s: return Str(s);
            case char c: return Str(c.ToString());
            case bool b: return b ? "true" : "false";
            case double d: return d.ToString("F10", CultureInfo.InvariantCulture);
            case float f: return ((double)f).ToString("F10", CultureInfo.InvariantCulture);
            case int or long or uint or ulong or short: return Convert.ToString(x, CultureInfo.InvariantCulture);
            case ListNode l: { var v = new List<object>(); int k = 0; for (var n = l; n != null && k++ < 10000; n = n.next) v.Add(n.val); return Json(v); }
            case TreeNode t: {
                var o = new List<string>(); var q = new Queue<TreeNode>(); q.Enqueue(t);
                while (q.Count > 0) { var n = q.Dequeue(); if (n == null) o.Add("null"); else { o.Add(n.val.ToString()); q.Enqueue(n.left); q.Enqueue(n.right); } }
                while (o.Count > 0 && o[^1] == "null") o.RemoveAt(o.Count - 1);
                return "[" + string.Join(",", o) + "]";
            }
            case Common.Random.Node r: { var ns = new List<Common.Random.Node>(); for (var n = r; n != null; n = n.next) ns.Add(n); return "[" + string.Join(",", ns.Select(n => "[" + n.val + "," + (n.random == null ? "null" : ns.IndexOf(n.random).ToString()) + "]")) + "]"; }
            case Common.Graph.Node g: { var by = new SortedDictionary<int, Common.Graph.Node>(); var st = new Stack<Common.Graph.Node>(); st.Push(g); while (st.Count > 0) { var n = st.Pop(); if (by.ContainsKey(n.val)) continue; by[n.val] = n; foreach (var m in n.neighbors) st.Push(m); } return "[" + string.Join(",", by.Values.Select(n => Json(n.neighbors.Select(m => (object)m.val).ToList()))) + "]"; }
            case IEnumerable e: { var parts = new List<string>(); foreach (var y in e) parts.Add(Json(y)); return "[" + string.Join(",", parts) + "]"; }
        }
        throw new Exception("cannot print " + x.GetType());
    }
}

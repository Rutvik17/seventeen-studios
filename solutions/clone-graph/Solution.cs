public class Solution {
    private readonly Dictionary<Node, Node> copies = new(); // original node -> its copy

    public Node CloneGraph(Node node) {
        if (node == null) return null;
        if (copies.TryGetValue(node, out var done)) return done;
        var copy = new Node(node.val);
        copies[node] = copy; // recorded before the neighbours, so a cycle back to node finds it
        foreach (var m in node.neighbors) copy.neighbors.Add(CloneGraph(m));
        return copy;
    }
}

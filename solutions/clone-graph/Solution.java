class Solution {
    private final Map<Node, Node> copies = new HashMap<>(); // original node -> its copy

    public Node cloneGraph(Node node) {
        if (node == null) return null;
        if (copies.containsKey(node)) return copies.get(node);
        Node copy = new Node(node.val);
        copies.put(node, copy); // recorded before the neighbours, so a cycle back to node finds it
        for (Node m : node.neighbors) copy.neighbors.add(cloneGraph(m));
        return copy;
    }
}

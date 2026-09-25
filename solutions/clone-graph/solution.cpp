class Solution {
    unordered_map<Node*, Node*> copies; // original node -> its copy
public:
    Node* cloneGraph(Node* node) {
        if (!node) return nullptr;
        if (copies.count(node)) return copies[node];
        Node* copy = new Node(node->val);
        copies[node] = copy; // recorded before the neighbours, so a cycle back to node finds it
        for (Node* m : node->neighbors) copy->neighbors.push_back(cloneGraph(m));
        return copy;
    }
};

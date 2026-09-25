public class LRUCache {
    private readonly int cap;
    private readonly LinkedList<(int key, int val)> order = new(); // most recently used first
    private readonly Dictionary<int, LinkedListNode<(int key, int val)>> where = new();

    public LRUCache(int capacity) { cap = capacity; }

    public int Get(int key) {
        if (!where.TryGetValue(key, out var node)) return -1;
        order.Remove(node);
        order.AddFirst(node); // it has just been used
        return node.Value.val;
    }

    public void Put(int key, int value) {
        if (where.TryGetValue(key, out var old)) order.Remove(old);
        where[key] = order.AddFirst((key, value));
        if (where.Count > cap) {
            where.Remove(order.Last.Value.key); // evict the least recently used, at the back
            order.RemoveLast();
        }
    }
}

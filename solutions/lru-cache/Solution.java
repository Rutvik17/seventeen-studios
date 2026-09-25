class LRUCache {
    private static class Node {
        int key, val;
        Node prev, next;
        Node(int key, int val) { this.key = key; this.val = val; }
    }

    private final int cap;
    private final Map<Integer, Node> map = new HashMap<>();
    // A doubly linked list in order of use: least recent after head, most recent before tail.
    private final Node head = new Node(0, 0), tail = new Node(0, 0);

    public LRUCache(int capacity) {
        cap = capacity;
        head.next = tail;
        tail.prev = head;
    }

    private void unlink(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }

    private void pushRecent(Node n) { n.prev = tail.prev; n.next = tail; tail.prev.next = n; tail.prev = n; }

    public int get(int key) {
        Node n = map.get(key);
        if (n == null) return -1;
        unlink(n);
        pushRecent(n); // it has just been used
        return n.val;
    }

    public void put(int key, int value) {
        Node old = map.get(key);
        if (old != null) unlink(old);
        Node n = new Node(key, value);
        map.put(key, n);
        pushRecent(n);
        if (map.size() > cap) {
            Node lru = head.next; // the least recently used
            unlink(lru);
            map.remove(lru.key);
        }
    }
}

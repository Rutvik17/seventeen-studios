class Node:
    def __init__(self, key=0, val=0):
        self.key, self.val = key, val
        self.prev = self.next = None


class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.map = {}  # key -> node
        # A doubly linked list in order of use: least recent after head, most recent before tail.
        self.head, self.tail = Node(), Node()
        self.head.next, self.tail.prev = self.tail, self.head

    def _unlink(self, node: Node) -> None:
        node.prev.next, node.next.prev = node.next, node.prev

    def _push_recent(self, node: Node) -> None:
        node.prev, node.next = self.tail.prev, self.tail
        self.tail.prev.next = node
        self.tail.prev = node

    def get(self, key: int) -> int:
        if key not in self.map:
            return -1
        node = self.map[key]
        self._unlink(node)
        self._push_recent(node)  # it has just been used
        return node.val

    def put(self, key: int, value: int) -> None:
        if key in self.map:
            self._unlink(self.map[key])
        node = Node(key, value)
        self.map[key] = node
        self._push_recent(node)
        if len(self.map) > self.cap:
            lru = self.head.next  # the least recently used
            self._unlink(lru)
            del self.map[lru.key]

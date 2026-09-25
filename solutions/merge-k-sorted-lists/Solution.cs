public class Solution {
    public ListNode MergeKLists(ListNode[] lists) {
        // A min-heap holds the front node of each list; the smallest front comes out first.
        var heap = new PriorityQueue<ListNode, int>();
        foreach (var l in lists) if (l != null) heap.Enqueue(l, l.val);
        var dummy = new ListNode();
        var tail = dummy;
        while (heap.TryDequeue(out var node, out _)) {
            tail.next = node;
            tail = node;
            if (node.next != null) heap.Enqueue(node.next, node.next.val); // that list's next front
        }
        return dummy.next;
    }
}

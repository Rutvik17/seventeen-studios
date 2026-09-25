class Solution {
    public ListNode mergeKLists(ListNode[] lists) {
        // A min-heap holds the front node of each list; the smallest front comes out first.
        PriorityQueue<ListNode> heap = new PriorityQueue<>((a, b) -> Integer.compare(a.val, b.val));
        for (ListNode l : lists) if (l != null) heap.add(l);
        ListNode dummy = new ListNode(), tail = dummy;
        while (!heap.isEmpty()) {
            ListNode node = heap.poll();
            tail.next = node;
            tail = node;
            if (node.next != null) heap.add(node.next); // that list's next front
        }
        return dummy.next;
    }
}

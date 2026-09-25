class Solution {
public:
    ListNode* mergeKLists(vector<ListNode*>& lists) {
        // A min-heap holds the front node of each list; the smallest front comes out first.
        auto later = [](ListNode* a, ListNode* b) { return a->val > b->val; };
        priority_queue<ListNode*, vector<ListNode*>, decltype(later)> heap(later);
        for (ListNode* l : lists) if (l) heap.push(l);
        ListNode dummy;
        ListNode* tail = &dummy;
        while (!heap.empty()) {
            ListNode* node = heap.top();
            heap.pop();
            tail->next = node;
            tail = node;
            if (node->next) heap.push(node->next); // that list's next front
        }
        return dummy.next;
    }
};

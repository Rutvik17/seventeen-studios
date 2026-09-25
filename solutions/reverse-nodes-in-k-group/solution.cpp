class Solution {
public:
    ListNode* reverseKGroup(ListNode* head, int k) {
        ListNode dummy(0, head);
        ListNode* before = &dummy; // the node just before the group being reversed
        while (true) {
            ListNode* end = before; // find the group's last node, if the group is complete
            for (int i = 0; i < k; i++) {
                end = end->next;
                if (!end) return dummy.next; // fewer than k left: leave them
            }
            ListNode *after = end->next, *prev = after, *cur = before->next;
            while (cur != after) { ListNode* next = cur->next; cur->next = prev; prev = cur; cur = next; } // reverse
            ListNode* first = before->next; // now the group's last node
            before->next = end; // the old last node leads the group
            before = first;
        }
    }
};

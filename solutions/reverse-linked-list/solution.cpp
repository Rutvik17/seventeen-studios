class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        ListNode *prev = nullptr, *cur = head; // prev: the part already reversed
        while (cur) {
            ListNode* next = cur->next; // remember the rest before cutting it off
            cur->next = prev; // point this node backwards
            prev = cur;
            cur = next;
        }
        return prev;
    }
};

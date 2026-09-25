class Solution {
public:
    Node* copyRandomList(Node* head) {
        // 1. Put each copy right after its original: A -> A' -> B -> B' -> ...
        for (Node* cur = head; cur; cur = cur->next->next) {
            Node* copy = new Node(cur->val);
            copy->next = cur->next;
            cur->next = copy;
        }
        // 2. A copy's random is the node right after its original's random.
        for (Node* cur = head; cur; cur = cur->next->next)
            cur->next->random = cur->random ? cur->random->next : nullptr;
        // 3. Unweave the two lists.
        Node dummy(0);
        Node* tail = &dummy;
        for (Node* cur = head; cur; cur = cur->next) {
            Node* copy = cur->next;
            cur->next = copy->next;
            tail->next = copy;
            tail = copy;
        }
        return dummy.next;
    }
};

class Solution {
    // The sum of the squares of x's digits.
    int step(int x) {
        int total = 0;
        for (; x > 0; x /= 10) total += (x % 10) * (x % 10);
        return total;
    }
public:
    bool isHappy(int n) {
        // The numbers either reach 1 or fall into a loop. Floyd's tortoise and hare finds out
        // without remembering them: fast moves two steps for each one of slow.
        int slow = n, fast = step(n);
        while (fast != 1 && slow != fast) {
            slow = step(slow);
            fast = step(step(fast));
        }
        return fast == 1;
    }
};

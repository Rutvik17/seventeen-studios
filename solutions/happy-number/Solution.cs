public class Solution {
    public bool IsHappy(int n) {
        // The numbers either reach 1 or fall into a loop. Floyd's tortoise and hare finds out
        // without remembering them: fast moves two steps for each one of slow.
        int slow = n, fast = Step(n);
        while (fast != 1 && slow != fast) {
            slow = Step(slow);
            fast = Step(Step(fast));
        }
        return fast == 1;
    }

    // The sum of the squares of x's digits.
    private int Step(int x) {
        int total = 0;
        for (; x > 0; x /= 10) total += (x % 10) * (x % 10);
        return total;
    }
}

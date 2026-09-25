public class Solution {
    public int ClimbStairs(int n) {
        // ways(i) = ways(i - 1) + ways(i - 2): the last move was one step or two.
        int a = 1, b = 1; // ways to reach step 0 and step 1
        for (int i = 1; i < n; i++) (a, b) = (b, a + b);
        return b;
    }
}

class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        Deque<Integer> dq = new ArrayDeque<>(); // indices whose values decrease front to back
        int[] out = new int[nums.length - k + 1];
        for (int i = 0; i < nums.length; i++) {
            while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i]) dq.pollLast(); // can never be a max again
            dq.offerLast(i);
            if (dq.peekFirst() <= i - k) dq.pollFirst(); // the front has slid out of the window
            if (i >= k - 1) out[i - k + 1] = nums[dq.peekFirst()]; // the front is the maximum
        }
        return out;
    }
}

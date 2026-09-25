public class Solution {
    public int[] MaxSlidingWindow(int[] nums, int k) {
        var dq = new LinkedList<int>(); // indices whose values decrease front to back
        var output = new int[nums.Length - k + 1];
        for (int i = 0; i < nums.Length; i++) {
            while (dq.Count > 0 && nums[dq.Last.Value] <= nums[i]) dq.RemoveLast(); // can never be a max again
            dq.AddLast(i);
            if (dq.First.Value <= i - k) dq.RemoveFirst(); // the front has slid out of the window
            if (i >= k - 1) output[i - k + 1] = nums[dq.First.Value]; // the front is the maximum
        }
        return output;
    }
}

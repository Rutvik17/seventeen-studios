impl Solution {
    pub fn find_duplicate(nums: Vec<i32>) -> i32 {
        // Read i -> nums[i] as a linked list; the repeated value is where its loop begins.
        let step = |i: usize| nums[i] as usize;
        let (mut slow, mut fast) = (step(0), step(step(0)));
        while slow != fast {
            slow = step(slow);
            fast = step(step(fast));
        }
        // From the start and from the meeting point, equal steps reach the loop's entrance.
        slow = 0;
        while slow != fast {
            slow = step(slow);
            fast = step(fast);
        }
        slow as i32
    }
}

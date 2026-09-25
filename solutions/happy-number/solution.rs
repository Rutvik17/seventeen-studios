impl Solution {
    pub fn is_happy(n: i32) -> bool {
        // The sum of the squares of x's digits.
        fn step(mut x: i32) -> i32 {
            let mut total = 0;
            while x > 0 {
                total += (x % 10) * (x % 10);
                x /= 10;
            }
            total
        }
        // The numbers either reach 1 or fall into a loop. Floyd's tortoise and hare finds out
        // without remembering them: fast moves two steps for each one of slow.
        let (mut slow, mut fast) = (n, step(n));
        while fast != 1 && slow != fast {
            slow = step(slow);
            fast = step(step(fast));
        }
        fast == 1
    }
}

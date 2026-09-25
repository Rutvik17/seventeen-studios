impl Solution {
    pub fn climb_stairs(n: i32) -> i32 {
        // ways(i) = ways(i - 1) + ways(i - 2): the last move was one step or two.
        let (mut a, mut b) = (1, 1); // ways to reach step 0 and step 1
        for _ in 1..n {
            (a, b) = (b, a + b);
        }
        b
    }
}

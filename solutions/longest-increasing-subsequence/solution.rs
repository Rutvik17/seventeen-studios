impl Solution {
    pub fn length_of_lis(nums: Vec<i32>) -> i32 {
        // tails[k]: the smallest last value of any increasing run of length k + 1 seen so far.
        // tails is itself increasing, so each number finds its place by binary search.
        let mut tails: Vec<i32> = vec![];
        for x in nums {
            let k = tails.partition_point(|&t| t < x); // the first tail >= x
            if k == tails.len() {
                tails.push(x); // x extends the longest run
            } else {
                tails[k] = x; // a run of length k + 1 can now end lower
            }
        }
        tails.len() as i32
    }
}

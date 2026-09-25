impl Solution {
    pub fn find_kth_largest(mut nums: Vec<i32>, k: i32) -> i32 {
        // Quickselect: the k-th largest is the one that would sit at index n - k if sorted.
        let target = nums.len() - k as usize;
        let (mut lo, mut hi) = (0, nums.len() - 1);
        // Rust's standard library has no random numbers; xorshift is a small, fast generator.
        let mut seed: u64 = 0x9E37_79B9_7F4A_7C15;
        loop {
            seed ^= seed << 13;
            seed ^= seed >> 7;
            seed ^= seed << 17;
            let pivot = nums[lo + (seed % (hi - lo + 1) as u64) as usize]; // a random pivot defeats adversarial inputs
            // Three-way partition of lo..=hi: < pivot, then == pivot, then > pivot.
            let (mut lt, mut i, mut gt) = (lo, lo, hi as isize);
            while i as isize <= gt {
                if nums[i] < pivot {
                    nums.swap(lt, i);
                    lt += 1;
                    i += 1;
                } else if nums[i] > pivot {
                    nums.swap(gt as usize, i);
                    gt -= 1;
                } else {
                    i += 1;
                }
            }
            if target < lt {
                hi = lt - 1; // it is among the smaller ones
            } else if target as isize > gt {
                lo = (gt + 1) as usize; // among the larger ones
            } else {
                return pivot; // it lands in the block equal to the pivot
            }
        }
    }
}

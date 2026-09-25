impl Solution {
    pub fn find_median_sorted_arrays(nums1: Vec<i32>, nums2: Vec<i32>) -> f64 {
        let (a, b) = if nums1.len() <= nums2.len() { (nums1, nums2) } else { (nums2, nums1) }; // search the shorter
        let (m, n) = (a.len(), b.len());
        let half = (m + n + 1) / 2; // how many elements belong on the left
        let (mut lo, mut hi) = (0, m);
        loop {
            let i = (lo + hi) / 2; // take i from a and half - i from b for the left side
            let j = half - i;
            let a_left = if i > 0 { a[i - 1] as i64 } else { i64::MIN };
            let a_right = if i < m { a[i] as i64 } else { i64::MAX };
            let b_left = if j > 0 { b[j - 1] as i64 } else { i64::MIN };
            let b_right = if j < n { b[j] as i64 } else { i64::MAX };
            if a_left <= b_right && b_left <= a_right {
                // everything on the left is <= everything on the right
                if (m + n) % 2 == 1 {
                    return a_left.max(b_left) as f64;
                }
                return (a_left.max(b_left) + a_right.min(b_right)) as f64 / 2.0;
            }
            if a_left > b_right {
                hi = i - 1; // took too many from a
            } else {
                lo = i + 1; // took too few from a
            }
        }
    }
}

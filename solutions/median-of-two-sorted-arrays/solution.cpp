class Solution {
public:
    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {
        if (nums1.size() > nums2.size()) return findMedianSortedArrays(nums2, nums1); // search the shorter
        int m = nums1.size(), n = nums2.size(), half = (m + n + 1) / 2; // elements on the left
        int lo = 0, hi = m;
        while (true) {
            int i = (lo + hi) / 2, j = half - i; // i from nums1 and j from nums2 on the left
            long long aLeft = i > 0 ? nums1[i - 1] : LLONG_MIN;
            long long aRight = i < m ? nums1[i] : LLONG_MAX;
            long long bLeft = j > 0 ? nums2[j - 1] : LLONG_MIN;
            long long bRight = j < n ? nums2[j] : LLONG_MAX;
            if (aLeft <= bRight && bLeft <= aRight) { // everything left <= everything right
                if ((m + n) % 2 == 1) return max(aLeft, bLeft);
                return (max(aLeft, bLeft) + min(aRight, bRight)) / 2.0;
            }
            if (aLeft > bRight) hi = i - 1; // took too many from nums1
            else lo = i + 1; // took too few from nums1
        }
    }
};

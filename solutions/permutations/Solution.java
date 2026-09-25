class Solution {
    public List<List<Integer>> permute(int[] nums) {
        List<List<Integer>> out = new ArrayList<>();
        place(nums, 0, out);
        return out;
    }

    // Positions before k are fixed; choose what goes at k.
    private void place(int[] nums, int k, List<List<Integer>> out) {
        if (k == nums.length) {
            List<Integer> p = new ArrayList<>();
            for (int x : nums) p.add(x);
            out.add(p);
            return;
        }
        for (int i = k; i < nums.length; i++) {
            swap(nums, k, i); // bring nums[i] to position k
            place(nums, k + 1, out);
            swap(nums, k, i); // and put it back
        }
    }

    private static void swap(int[] a, int i, int j) {
        int t = a[i];
        a[i] = a[j];
        a[j] = t;
    }
}

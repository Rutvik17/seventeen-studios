class Solution {
    public List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> out = new ArrayList<>();
        choose(nums, 0, new ArrayList<>(), out);
        return out;
    }

    // Decide about nums[i], then everything after it.
    private void choose(int[] nums, int i, List<Integer> cur, List<List<Integer>> out) {
        if (i == nums.length) {
            out.add(new ArrayList<>(cur));
            return;
        }
        cur.add(nums[i]); // with nums[i]
        choose(nums, i + 1, cur, out);
        cur.remove(cur.size() - 1); // undo, then without it
        choose(nums, i + 1, cur, out);
    }
}

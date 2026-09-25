class Solution {
    public List<List<Integer>> subsetsWithDup(int[] nums) {
        Arrays.sort(nums); // equal values side by side
        List<List<Integer>> out = new ArrayList<>();
        extend(nums, 0, new ArrayList<>(), out);
        return out;
    }

    // cur is a subset; try adding each later value to it.
    private void extend(int[] nums, int start, List<Integer> cur, List<List<Integer>> out) {
        out.add(new ArrayList<>(cur));
        for (int i = start; i < nums.length; i++) {
            if (i > start && nums[i] == nums[i - 1]) continue; // the same value in the same place would repeat a subset
            cur.add(nums[i]);
            extend(nums, i + 1, cur, out);
            cur.remove(cur.size() - 1);
        }
    }
}

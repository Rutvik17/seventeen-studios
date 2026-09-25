class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        Arrays.sort(nums);
        List<List<Integer>> out = new ArrayList<>();
        for (int i = 0; i < nums.length - 2; i++) {
            if (nums[i] > 0) break; // the smallest of the three is positive
            if (i > 0 && nums[i] == nums[i - 1]) continue; // same first number: same triplets
            int l = i + 1, r = nums.length - 1;
            while (l < r) {
                int total = nums[i] + nums[l] + nums[r];
                if (total < 0) l++;
                else if (total > 0) r--;
                else {
                    out.add(List.of(nums[i], nums[l], nums[r]));
                    l++;
                    while (l < r && nums[l] == nums[l - 1]) l++; // skip repeats of the middle number
                }
            }
        }
        return out;
    }
}

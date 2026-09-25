class Solution {
    public List<List<Integer>> combinationSum(int[] candidates, int target) {
        Arrays.sort(candidates); // so a candidate too big means every later one is too
        List<List<Integer>> out = new ArrayList<>();
        pick(candidates, 0, target, new ArrayList<>(), out);
        return out;
    }

    // Add candidates from index start on; left: what is still needed.
    private void pick(int[] c, int start, int left, List<Integer> cur, List<List<Integer>> out) {
        if (left == 0) {
            out.add(new ArrayList<>(cur));
            return;
        }
        for (int i = start; i < c.length && c[i] <= left; i++) {
            cur.add(c[i]);
            pick(c, i, left - c[i], cur, out); // i, not i + 1: the same number may be used again
            cur.remove(cur.size() - 1);
        }
    }
}

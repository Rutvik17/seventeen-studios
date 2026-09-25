class Solution {
    public List<List<Integer>> combinationSum2(int[] candidates, int target) {
        Arrays.sort(candidates); // equal values side by side, and too big means every later one is too
        List<List<Integer>> out = new ArrayList<>();
        pick(candidates, 0, target, new ArrayList<>(), out);
        return out;
    }

    private void pick(int[] c, int start, int left, List<Integer> cur, List<List<Integer>> out) {
        if (left == 0) {
            out.add(new ArrayList<>(cur));
            return;
        }
        for (int i = start; i < c.length && c[i] <= left; i++) {
            if (i > start && c[i] == c[i - 1]) continue; // the same value in the same place would repeat a combination
            cur.add(c[i]);
            pick(c, i + 1, left - c[i], cur, out); // each candidate used at most once
            cur.remove(cur.size() - 1);
        }
    }
}

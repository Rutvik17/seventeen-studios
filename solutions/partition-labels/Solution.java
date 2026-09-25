class Solution {
    public List<Integer> partitionLabels(String s) {
        int[] last = new int[26]; // where each letter appears for the last time
        for (int i = 0; i < s.length(); i++) last[s.charAt(i) - 'a'] = i;
        List<Integer> sizes = new ArrayList<>();
        int start = 0, end = 0;
        for (int i = 0; i < s.length(); i++) {
            end = Math.max(end, last[s.charAt(i) - 'a']); // this part must reach at least that far
            if (i == end) { // every letter seen so far is finished: cut here
                sizes.add(end - start + 1);
                start = i + 1;
            }
        }
        return sizes;
    }
}

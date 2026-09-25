public class Solution {
    public IList<int> PartitionLabels(string s) {
        var last = new int[26]; // where each letter appears for the last time
        for (int i = 0; i < s.Length; i++) last[s[i] - 'a'] = i;
        var sizes = new List<int>();
        int start = 0, end = 0;
        for (int i = 0; i < s.Length; i++) {
            end = Math.Max(end, last[s[i] - 'a']); // this part must reach at least that far
            if (i == end) { // every letter seen so far is finished: cut here
                sizes.Add(end - start + 1);
                start = i + 1;
            }
        }
        return sizes;
    }
}

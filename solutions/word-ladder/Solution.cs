public class Solution {
    public int LadderLength(string beginWord, string endWord, IList<string> wordList) {
        var words = new HashSet<string>(wordList);
        if (!words.Contains(endWord)) return 0;
        // Breadth-first: every word reached in round k is k steps from the start, the fewest possible.
        var frontier = new List<string> { beginWord };
        words.Remove(beginWord);
        for (int steps = 1; frontier.Count > 0; steps++) {
            var next = new List<string>();
            foreach (var w in frontier) {
                if (w == endWord) return steps;
                var cs = w.ToCharArray();
                for (int i = 0; i < cs.Length; i++) {
                    char keep = cs[i];
                    for (char ch = 'a'; ch <= 'z'; ch++) { // every word one letter away
                        cs[i] = ch;
                        var cand = new string(cs);
                        if (words.Remove(cand)) next.Add(cand); // reached now, by the shortest route
                    }
                    cs[i] = keep;
                }
            }
            frontier = next;
        }
        return 0;
    }
}

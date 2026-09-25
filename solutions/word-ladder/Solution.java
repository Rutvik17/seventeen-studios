class Solution {
    public int ladderLength(String beginWord, String endWord, List<String> wordList) {
        Set<String> words = new HashSet<>(wordList);
        if (!words.contains(endWord)) return 0;
        // Breadth-first: every word reached in round k is k steps from the start, the fewest possible.
        List<String> frontier = List.of(beginWord);
        words.remove(beginWord);
        for (int steps = 1; !frontier.isEmpty(); steps++) {
            List<String> next = new ArrayList<>();
            for (String w : frontier) {
                if (w.equals(endWord)) return steps;
                char[] cs = w.toCharArray();
                for (int i = 0; i < cs.length; i++) {
                    char keep = cs[i];
                    for (char ch = 'a'; ch <= 'z'; ch++) { // every word one letter away
                        cs[i] = ch;
                        String cand = new String(cs);
                        if (words.remove(cand)) next.add(cand); // reached now, by the shortest route
                    }
                    cs[i] = keep;
                }
            }
            frontier = next;
        }
        return 0;
    }
}

class Solution {
    public boolean wordBreak(String s, List<String> wordDict) {
        Set<String> words = new HashSet<>(wordDict);
        int longest = 0;
        for (String w : wordDict) longest = Math.max(longest, w.length());
        // ok[i]: can s[0..i) be split into words? It can if some word ends at i and
        // the part before that word can be split too.
        boolean[] ok = new boolean[s.length() + 1];
        ok[0] = true;
        for (int i = 1; i <= s.length(); i++)
            for (int j = Math.max(0, i - longest); j < i; j++) // no word is longer than `longest`
                if (ok[j] && words.contains(s.substring(j, i))) {
                    ok[i] = true;
                    break;
                }
        return ok[s.length()];
    }
}

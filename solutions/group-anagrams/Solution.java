class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> groups = new HashMap<>(); // letter counts -> words
        for (String word : strs) {
            char[] count = new char[26];
            for (char c : word.toCharArray()) count[c - 'a']++;
            groups.computeIfAbsent(new String(count), k -> new ArrayList<>()).add(word);
        }
        return new ArrayList<>(groups.values());
    }
}

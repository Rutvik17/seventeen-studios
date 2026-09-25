class Solution {
    public String alienOrder(String[] words) {
        Map<Character, Set<Character>> after = new HashMap<>(); // letter -> letters known to come after it
        Map<Character, Integer> need = new HashMap<>(); // letter -> how many letters must come before it
        for (String w : words)
            for (char c : w.toCharArray()) {
                after.putIfAbsent(c, new HashSet<>());
                need.putIfAbsent(c, 0);
            }
        for (int i = 0; i + 1 < words.length; i++) {
            String a = words[i], b = words[i + 1];
            int k = 0;
            while (k < a.length() && k < b.length() && a.charAt(k) == b.charAt(k)) k++;
            if (k == a.length() || k == b.length()) {
                if (a.length() > b.length()) return ""; // "abc" before "ab" cannot be sorted in any alphabet
                continue;
            }
            // The first difference is the only thing this pair tells us.
            if (after.get(a.charAt(k)).add(b.charAt(k))) need.merge(b.charAt(k), 1, Integer::sum);
        }
        // Kahn's algorithm, as in Course Schedule II.
        StringBuilder order = new StringBuilder();
        Deque<Character> ready = new ArrayDeque<>();
        for (char c : need.keySet()) if (need.get(c) == 0) ready.add(c);
        while (!ready.isEmpty()) {
            char c = ready.poll();
            order.append(c);
            for (char y : after.get(c)) if (need.merge(y, -1, Integer::sum) == 0) ready.add(y);
        }
        return order.length() == need.size() ? order.toString() : ""; // short means a cycle
    }
}

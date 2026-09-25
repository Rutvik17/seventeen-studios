public class Solution {
    public string AlienOrder(string[] words) {
        var after = new Dictionary<char, HashSet<char>>(); // letter -> letters known to come after it
        var need = new Dictionary<char, int>(); // letter -> how many letters must come before it
        foreach (var w in words)
            foreach (char c in w) {
                after.TryAdd(c, new HashSet<char>());
                need.TryAdd(c, 0);
            }
        for (int i = 0; i + 1 < words.Length; i++) {
            string a = words[i], b = words[i + 1];
            int k = 0;
            while (k < a.Length && k < b.Length && a[k] == b[k]) k++;
            if (k == a.Length || k == b.Length) {
                if (a.Length > b.Length) return ""; // "abc" before "ab" cannot be sorted in any alphabet
                continue;
            }
            // The first difference is the only thing this pair tells us.
            if (after[a[k]].Add(b[k])) need[b[k]]++;
        }
        // Kahn's algorithm, as in Course Schedule II.
        var order = new List<char>(need.Keys.Where(c => need[c] == 0));
        for (int h = 0; h < order.Count; h++)
            foreach (char y in after[order[h]])
                if (--need[y] == 0) order.Add(y);
        return order.Count == need.Count ? new string(order.ToArray()) : ""; // short means a cycle
    }
}

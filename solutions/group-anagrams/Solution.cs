public class Solution {
    public IList<IList<string>> GroupAnagrams(string[] strs) {
        var groups = new Dictionary<string, IList<string>>(); // letter counts -> words
        foreach (string word in strs) {
            var count = new char[26];
            foreach (char c in word) count[c - 'a']++;
            string key = new string(count);
            if (!groups.TryGetValue(key, out var list)) groups[key] = list = new List<string>();
            list.Add(word);
        }
        return groups.Values.ToList();
    }
}

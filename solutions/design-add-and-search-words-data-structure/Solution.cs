public class WordDictionary {
    private readonly WordDictionary[] next = new WordDictionary[26]; // a trie: one slot per letter
    private bool end;

    public void AddWord(string word) {
        WordDictionary node = this;
        foreach (char c in word) {
            node.next[c - 'a'] ??= new WordDictionary();
            node = node.next[c - 'a'];
        }
        node.end = true;
    }

    public bool Search(string word) {
        return Find(this, word, 0);
    }

    private static bool Find(WordDictionary node, string word, int i) {
        if (i == word.Length) return node.end;
        if (word[i] == '.') { // any letter: try every child
            foreach (var child in node.next)
                if (child != null && Find(child, word, i + 1)) return true;
            return false;
        }
        var next = node.next[word[i] - 'a'];
        return next != null && Find(next, word, i + 1);
    }
}

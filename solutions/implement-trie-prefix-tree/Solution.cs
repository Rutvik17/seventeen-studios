public class Trie {
    private readonly Trie[] next = new Trie[26]; // one slot per letter
    private bool end; // a word ends here

    public void Insert(string word) {
        Trie node = this;
        foreach (char c in word) {
            node.next[c - 'a'] ??= new Trie();
            node = node.next[c - 'a'];
        }
        node.end = true;
    }

    // The node reached by spelling s, or null.
    private Trie Walk(string s) {
        Trie node = this;
        foreach (char c in s) {
            node = node.next[c - 'a'];
            if (node == null) return null;
        }
        return node;
    }

    public bool Search(string word) {
        Trie node = Walk(word);
        return node != null && node.end;
    }

    public bool StartsWith(string prefix) {
        return Walk(prefix) != null;
    }
}

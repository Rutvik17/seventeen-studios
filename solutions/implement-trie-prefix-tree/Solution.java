class Trie {
    private final Trie[] next = new Trie[26]; // one slot per letter
    private boolean end; // a word ends here

    public void insert(String word) {
        Trie node = this;
        for (char c : word.toCharArray()) {
            if (node.next[c - 'a'] == null) node.next[c - 'a'] = new Trie();
            node = node.next[c - 'a'];
        }
        node.end = true;
    }

    // The node reached by spelling s, or null.
    private Trie walk(String s) {
        Trie node = this;
        for (char c : s.toCharArray()) {
            node = node.next[c - 'a'];
            if (node == null) return null;
        }
        return node;
    }

    public boolean search(String word) {
        Trie node = walk(word);
        return node != null && node.end;
    }

    public boolean startsWith(String prefix) {
        return walk(prefix) != null;
    }
}

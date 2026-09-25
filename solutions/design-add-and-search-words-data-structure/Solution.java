class WordDictionary {
    private final WordDictionary[] next = new WordDictionary[26]; // a trie: one slot per letter
    private boolean end;

    public void addWord(String word) {
        WordDictionary node = this;
        for (char c : word.toCharArray()) {
            if (node.next[c - 'a'] == null) node.next[c - 'a'] = new WordDictionary();
            node = node.next[c - 'a'];
        }
        node.end = true;
    }

    public boolean search(String word) {
        return find(this, word, 0);
    }

    private static boolean find(WordDictionary node, String word, int i) {
        if (i == word.length()) return node.end;
        char c = word.charAt(i);
        if (c == '.') { // any letter: try every child
            for (WordDictionary child : node.next) if (child != null && find(child, word, i + 1)) return true;
            return false;
        }
        WordDictionary child = node.next[c - 'a'];
        return child != null && find(child, word, i + 1);
    }
}

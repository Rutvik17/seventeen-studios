class WordDictionary {
    WordDictionary* next[26] = {}; // a trie: one slot per letter
    bool end = false;

    static bool find(WordDictionary* node, const string& word, size_t i) {
        if (i == word.size()) return node->end;
        if (word[i] == '.') { // any letter: try every child
            for (auto* child : node->next)
                if (child && find(child, word, i + 1)) return true;
            return false;
        }
        auto* child = node->next[word[i] - 'a'];
        return child && find(child, word, i + 1);
    }
public:
    WordDictionary() {}

    void addWord(string word) {
        WordDictionary* node = this;
        for (char c : word) {
            if (!node->next[c - 'a']) node->next[c - 'a'] = new WordDictionary();
            node = node->next[c - 'a'];
        }
        node->end = true;
    }

    bool search(string word) {
        return find(this, word, 0);
    }
};

class Trie {
    Trie* next[26] = {}; // one slot per letter
    bool end = false; // a word ends here

    // The node reached by spelling s, or null.
    Trie* walk(const string& s) {
        Trie* node = this;
        for (char c : s) {
            node = node->next[c - 'a'];
            if (!node) return nullptr;
        }
        return node;
    }
public:
    Trie() {}

    void insert(string word) {
        Trie* node = this;
        for (char c : word) {
            if (!node->next[c - 'a']) node->next[c - 'a'] = new Trie();
            node = node->next[c - 'a'];
        }
        node->end = true;
    }

    bool search(string word) {
        Trie* node = walk(word);
        return node && node->end;
    }

    bool startsWith(string prefix) {
        return walk(prefix) != nullptr;
    }
};

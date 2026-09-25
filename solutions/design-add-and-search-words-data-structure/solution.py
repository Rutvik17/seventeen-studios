class WordDictionary:
    def __init__(self):
        self.root = {}  # a trie: letter -> child node; "$" marks the end of a word

    def addWord(self, word: str) -> None:
        node = self.root
        for c in word:
            node = node.setdefault(c, {})
        node["$"] = True

    def search(self, word: str) -> bool:
        def find(node, i):
            if i == len(word):
                return "$" in node
            if word[i] == ".":  # any letter: try every child
                return any(find(child, i + 1) for c, child in node.items() if c != "$")
            return word[i] in node and find(node[word[i]], i + 1)

        return find(self.root, 0)

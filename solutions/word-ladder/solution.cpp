class Solution {
public:
    int ladderLength(string beginWord, string endWord, vector<string>& wordList) {
        unordered_set<string> words(wordList.begin(), wordList.end());
        if (!words.count(endWord)) return 0;
        // Breadth-first: every word reached in round k is k steps from the start, the fewest possible.
        vector<string> frontier{beginWord};
        words.erase(beginWord);
        for (int steps = 1; !frontier.empty(); steps++) {
            vector<string> next;
            for (string w : frontier) {
                if (w == endWord) return steps;
                for (size_t i = 0; i < w.size(); i++) {
                    char keep = w[i];
                    for (char ch = 'a'; ch <= 'z'; ch++) { // every word one letter away
                        w[i] = ch;
                        if (words.erase(w)) next.push_back(w); // reached now, by the shortest route
                    }
                    w[i] = keep;
                }
            }
            frontier = move(next);
        }
        return 0;
    }
};

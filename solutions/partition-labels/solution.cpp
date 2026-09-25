class Solution {
public:
    vector<int> partitionLabels(string s) {
        int last[26]; // where each letter appears for the last time
        for (int i = 0; i < (int)s.size(); i++) last[s[i] - 'a'] = i;
        vector<int> sizes;
        int start = 0, end = 0;
        for (int i = 0; i < (int)s.size(); i++) {
            end = max(end, last[s[i] - 'a']); // this part must reach at least that far
            if (i == end) { // every letter seen so far is finished: cut here
                sizes.push_back(end - start + 1);
                start = i + 1;
            }
        }
        return sizes;
    }
};

class Solution {
public:
    int leastInterval(vector<char>& tasks, int n) {
        int count[26] = {};
        for (char t : tasks) count[t - 'A']++;
        int most = *max_element(count, count + 26); // how often the commonest task occurs
        int tied = std::count(count, count + 26, most); // how many tasks occur that often
        // The commonest task needs (most - 1) frames of n + 1 slots, then one last run holding
        // every task tied for commonest. If other tasks overflow the frames, nothing idles.
        return max((int)tasks.size(), (most - 1) * (n + 1) + tied);
    }
};

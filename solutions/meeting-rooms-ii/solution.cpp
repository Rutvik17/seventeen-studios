class Solution {
public:
    int minMeetingRooms(vector<vector<int>>& intervals) {
        // Sweep through time. Each start needs a room; each end frees one. The most rooms
        // busy at once is the answer. An end at the same moment as a start frees its room first.
        vector<int> starts, ends;
        for (auto& iv : intervals) {
            starts.push_back(iv[0]);
            ends.push_back(iv[1]);
        }
        sort(starts.begin(), starts.end());
        sort(ends.begin(), ends.end());
        int busy = 0, best = 0;
        size_t j = 0;
        for (int s : starts) {
            while (ends[j] <= s) { // meetings finished by now
                busy--;
                j++;
            }
            best = max(best, ++busy);
        }
        return best;
    }
};

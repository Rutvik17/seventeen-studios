class TimeMap {
    // key -> (timestamp, value) pairs. Timestamps arrive increasing, so each list is sorted.
    unordered_map<string, vector<pair<int, string>>> store;
public:
    TimeMap() {}

    void set(string key, string value, int timestamp) {
        store[key].push_back({timestamp, value});
    }

    string get(string key, int timestamp) {
        auto it = store.find(key);
        if (it == store.end()) return "";
        auto& entries = it->second;
        // The first entry later than timestamp; the one before it is the latest in time.
        auto after = upper_bound(entries.begin(), entries.end(), timestamp,
                                 [](int t, const pair<int, string>& e) { return t < e.first; });
        return after == entries.begin() ? "" : prev(after)->second;
    }
};

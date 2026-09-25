public class TimeMap {
    // key -> (timestamp, value) pairs. Timestamps arrive increasing, so each list is sorted.
    private readonly Dictionary<string, List<(int time, string value)>> store = new();

    public TimeMap() {}

    public void Set(string key, string value, int timestamp) {
        if (!store.TryGetValue(key, out var list)) store[key] = list = new();
        list.Add((timestamp, value));
    }

    public string Get(string key, int timestamp) {
        if (!store.TryGetValue(key, out var entries)) return "";
        int lo = 0, hi = entries.Count; // find the first entry later than timestamp
        while (lo < hi) {
            int mid = (lo + hi) / 2;
            if (entries[mid].time <= timestamp) lo = mid + 1;
            else hi = mid;
        }
        return lo > 0 ? entries[lo - 1].value : ""; // the one before it is the latest in time
    }
}

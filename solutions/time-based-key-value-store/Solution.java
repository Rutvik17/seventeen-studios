class TimeMap {
    // key -> timestamps and values. Timestamps arrive increasing, so each list is sorted.
    private final Map<String, List<Integer>> times = new HashMap<>();
    private final Map<String, List<String>> values = new HashMap<>();

    public TimeMap() {}

    public void set(String key, String value, int timestamp) {
        times.computeIfAbsent(key, k -> new ArrayList<>()).add(timestamp);
        values.computeIfAbsent(key, k -> new ArrayList<>()).add(value);
    }

    public String get(String key, int timestamp) {
        List<Integer> ts = times.get(key);
        if (ts == null) return "";
        int lo = 0, hi = ts.size(); // find the first entry later than timestamp
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (ts.get(mid) <= timestamp) lo = mid + 1;
            else hi = mid;
        }
        return lo > 0 ? values.get(key).get(lo - 1) : ""; // the one before it is the latest in time
    }
}

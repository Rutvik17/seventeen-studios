class TimeMap:
    def __init__(self):
        # key -> list of (timestamp, value). Timestamps arrive increasing, so each list is sorted.
        self.store = defaultdict(list)

    def set(self, key: str, value: str, timestamp: int) -> None:
        self.store[key].append((timestamp, value))

    def get(self, key: str, timestamp: int) -> str:
        entries = self.store.get(key, [])
        lo, hi = 0, len(entries)  # find the first entry later than timestamp
        while lo < hi:
            mid = (lo + hi) // 2
            if entries[mid][0] <= timestamp:
                lo = mid + 1
            else:
                hi = mid
        return entries[lo - 1][1] if lo > 0 else ""  # the one before it is the latest in time

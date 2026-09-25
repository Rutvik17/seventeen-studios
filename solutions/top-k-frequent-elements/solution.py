class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        count = Counter(nums)
        # buckets[f] holds every number that appears exactly f times.
        buckets = [[] for _ in range(len(nums) + 1)]
        for x, f in count.items():
            buckets[f].append(x)
        out = []
        for f in range(len(buckets) - 1, 0, -1):
            for x in buckets[f]:
                out.append(x)
                if len(out) == k:
                    return out
        return out

class Solution:
    def lengthOfLIS(self, nums: List[int]) -> int:
        # tails[k]: the smallest last value of any increasing run of length k + 1 seen so far.
        # tails is itself increasing, so each number finds its place by binary search.
        tails = []
        for x in nums:
            k = bisect_left(tails, x)  # the first tail >= x
            if k == len(tails):
                tails.append(x)  # x extends the longest run
            else:
                tails[k] = x  # a run of length k + 1 can now end lower
        return len(tails)

class Solution:
    def subsetsWithDup(self, nums: List[int]) -> List[List[int]]:
        nums.sort()  # equal values side by side
        out, cur = [], []

        def extend(start):  # cur is a subset; try adding each later value to it
            out.append(cur[:])
            for i in range(start, len(nums)):
                if i > start and nums[i] == nums[i - 1]:
                    continue  # the same value in the same place would repeat a subset
                cur.append(nums[i])
                extend(i + 1)
                cur.pop()

        extend(0)
        return out

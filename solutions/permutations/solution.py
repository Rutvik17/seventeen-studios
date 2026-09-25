class Solution:
    def permute(self, nums: List[int]) -> List[List[int]]:
        out = []

        def place(k):  # positions before k are fixed; choose what goes at k
            if k == len(nums):
                out.append(nums[:])
                return
            for i in range(k, len(nums)):
                nums[k], nums[i] = nums[i], nums[k]  # bring nums[i] to position k
                place(k + 1)
                nums[k], nums[i] = nums[i], nums[k]  # and put it back

        place(0)
        return out

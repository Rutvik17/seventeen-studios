class Solution:
    def twoSum(self, numbers: List[int], target: int) -> List[int]:
        l, r = 0, len(numbers) - 1
        while l < r:
            total = numbers[l] + numbers[r]
            if total == target:
                return [l + 1, r + 1]  # the answer is 1-indexed
            if total < target:
                l += 1  # need a bigger sum: move the small end up
            else:
                r -= 1  # need a smaller sum: move the big end down
        return []

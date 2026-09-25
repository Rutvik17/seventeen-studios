class Solution:
    def findDuplicate(self, nums: List[int]) -> int:
        # Read i -> nums[i] as a linked list; the repeated value is where its loop begins.
        slow = fast = 0
        while True:
            slow = nums[slow]
            fast = nums[nums[fast]]
            if slow == fast:
                break
        # From the start and from the meeting point, equal steps reach the loop's entrance.
        slow = 0
        while slow != fast:
            slow, fast = nums[slow], nums[fast]
        return slow

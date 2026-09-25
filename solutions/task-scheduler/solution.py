class Solution:
    def leastInterval(self, tasks: List[str], n: int) -> int:
        count = Counter(tasks)
        most = max(count.values())  # how often the commonest task occurs
        tied = sum(1 for c in count.values() if c == most)  # how many tasks occur that often
        # The commonest task needs (most - 1) gaps of n after its runs, each frame n + 1 long,
        # then one last run holding every task tied for commonest. If other tasks overflow
        # the frames, no idle is needed at all and the answer is simply the number of tasks.
        return max(len(tasks), (most - 1) * (n + 1) + tied)

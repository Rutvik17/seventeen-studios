class Solution:
    def canCompleteCircuit(self, gas: List[int], cost: List[int]) -> int:
        # If there is less gas than cost in total, no start works. Otherwise the answer is the
        # station after the last point where the running tank went negative: no start at or
        # before that point can get past it.
        if sum(gas) < sum(cost):
            return -1
        start = tank = 0
        for i in range(len(gas)):
            tank += gas[i] - cost[i]
            if tank < 0:
                start, tank = i + 1, 0
        return start

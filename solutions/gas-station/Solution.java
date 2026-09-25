class Solution {
    public int canCompleteCircuit(int[] gas, int[] cost) {
        // If there is less gas than cost in total, no start works. Otherwise the answer is the
        // station after the last point where the running tank went negative: no start at or
        // before that point can get past it.
        int total = 0, tank = 0, start = 0;
        for (int i = 0; i < gas.length; i++) {
            total += gas[i] - cost[i];
            tank += gas[i] - cost[i];
            if (tank < 0) {
                start = i + 1;
                tank = 0;
            }
        }
        return total < 0 ? -1 : start;
    }
}

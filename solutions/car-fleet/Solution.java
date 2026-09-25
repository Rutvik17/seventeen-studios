class Solution {
    public int carFleet(int target, int[] position, int[] speed) {
        int n = position.length;
        Integer[] order = new Integer[n];
        for (int i = 0; i < n; i++) order[i] = i;
        Arrays.sort(order, (a, b) -> position[b] - position[a]); // nearest the target first
        int fleets = 0;
        double slowest = 0; // arrival time of the fleet just ahead
        for (int i : order) {
            double t = (double) (target - position[i]) / speed[i]; // arrival on its own
            if (t > slowest) { fleets++; slowest = t; } // cannot catch up: a new fleet
        }
        return fleets;
    }
}

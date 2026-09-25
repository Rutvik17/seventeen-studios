public class Solution {
    public int CarFleet(int target, int[] position, int[] speed) {
        var order = Enumerable.Range(0, position.Length).OrderByDescending(i => position[i]); // nearest first
        int fleets = 0;
        double slowest = 0; // arrival time of the fleet just ahead
        foreach (int i in order) {
            double t = (double)(target - position[i]) / speed[i]; // arrival on its own
            if (t > slowest) { fleets++; slowest = t; } // cannot catch up: a new fleet
        }
        return fleets;
    }
}

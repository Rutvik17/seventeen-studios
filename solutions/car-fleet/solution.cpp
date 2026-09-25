class Solution {
public:
    int carFleet(int target, vector<int>& position, vector<int>& speed) {
        vector<pair<int, int>> cars;
        for (size_t i = 0; i < position.size(); i++) cars.push_back({position[i], speed[i]});
        sort(cars.rbegin(), cars.rend()); // nearest the target first
        int fleets = 0;
        double slowest = 0; // arrival time of the fleet just ahead
        for (auto [p, s] : cars) {
            double t = (double)(target - p) / s; // arrival on its own
            if (t > slowest) { fleets++; slowest = t; } // cannot catch up: a new fleet
        }
        return fleets;
    }
};

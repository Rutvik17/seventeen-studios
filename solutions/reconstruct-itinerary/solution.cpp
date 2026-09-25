class Solution {
public:
    vector<string> findItinerary(vector<vector<string>>& tickets) {
        unordered_map<string, vector<string>> outOf; // airport -> destinations still to fly to
        sort(tickets.rbegin(), tickets.rend());
        for (auto& t : tickets) outOf[t[0]].push_back(t[1]); // reverse order, so popping gives the smallest first
        // Hierholzer's algorithm: fly on while tickets remain; an airport with none left
        // is where the route ends, so it is written down last-first.
        vector<string> route, stack{"JFK"};
        while (!stack.empty()) {
            auto& next = outOf[stack.back()];
            if (!next.empty()) {
                string to = next.back();
                next.pop_back();
                stack.push_back(to);
            } else {
                route.push_back(stack.back());
                stack.pop_back();
            }
        }
        reverse(route.begin(), route.end());
        return route;
    }
};

class Solution:
    def findItinerary(self, tickets: List[List[str]]) -> List[str]:
        out_of = defaultdict(list)  # airport -> destinations still to fly to
        for a, b in sorted(tickets, reverse=True):
            out_of[a].append(b)  # reverse order, so popping gives the smallest first
        # Hierholzer's algorithm: fly on while tickets remain; an airport with none left
        # is where the route ends, so it is written down last-first.
        route, stack = [], ["JFK"]
        while stack:
            if out_of[stack[-1]]:
                stack.append(out_of[stack[-1]].pop())
            else:
                route.append(stack.pop())
        return route[::-1]

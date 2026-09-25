class Solution {
    public List<String> findItinerary(List<List<String>> tickets) {
        Map<String, PriorityQueue<String>> outOf = new HashMap<>(); // airport -> destinations, smallest first
        for (List<String> t : tickets) outOf.computeIfAbsent(t.get(0), k -> new PriorityQueue<>()).add(t.get(1));
        // Hierholzer's algorithm: fly on while tickets remain; an airport with none left
        // is where the route ends, so it is written down last-first.
        LinkedList<String> route = new LinkedList<>();
        Deque<String> stack = new ArrayDeque<>();
        stack.push("JFK");
        while (!stack.isEmpty()) {
            PriorityQueue<String> next = outOf.get(stack.peek());
            if (next != null && !next.isEmpty()) stack.push(next.poll());
            else route.addFirst(stack.pop());
        }
        return route;
    }
}

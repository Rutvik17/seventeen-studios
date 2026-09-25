public class Solution {
    public IList<string> FindItinerary(IList<IList<string>> tickets) {
        var outOf = new Dictionary<string, List<string>>(); // airport -> destinations still to fly to
        foreach (var t in tickets.OrderByDescending(t => t[1], StringComparer.Ordinal)) {
            if (!outOf.ContainsKey(t[0])) outOf[t[0]] = new List<string>();
            outOf[t[0]].Add(t[1]); // reverse order, so taking from the end gives the smallest first
        }
        // Hierholzer's algorithm: fly on while tickets remain; an airport with none left
        // is where the route ends, so it is written down last-first.
        var route = new List<string>();
        var stack = new Stack<string>();
        stack.Push("JFK");
        while (stack.Count > 0) {
            if (outOf.TryGetValue(stack.Peek(), out var next) && next.Count > 0) {
                stack.Push(next[^1]);
                next.RemoveAt(next.Count - 1);
            } else route.Add(stack.Pop());
        }
        route.Reverse();
        return route;
    }
}

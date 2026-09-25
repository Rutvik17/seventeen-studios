public class DetectSquares {
    private readonly Dictionary<int, Dictionary<int, int>> col = new(); // x -> {y -> points added there}

    public void Add(int[] point) {
        if (!col.TryGetValue(point[0], out var c)) col[point[0]] = c = new Dictionary<int, int>();
        c[point[1]] = c.GetValueOrDefault(point[1]) + 1;
    }

    private int At(int x, int y) => col.TryGetValue(x, out var c) ? c.GetValueOrDefault(y) : 0;

    public int Count(int[] point) {
        int x = point[0], y = point[1], total = 0;
        if (!col.TryGetValue(x, out var same)) return 0;
        // A point straight above or below the query fixes the side length d; the square then
        // lies to the right or to the left, and needs its other two corners.
        foreach (var (y2, n) in same) {
            int d = y2 - y;
            if (d == 0) continue;
            foreach (int x2 in new[] { x + d, x - d }) total += n * At(x2, y) * At(x2, y2);
        }
        return total;
    }
}

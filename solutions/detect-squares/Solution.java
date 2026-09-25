class DetectSquares {
    private final Map<Integer, Map<Integer, Integer>> col = new HashMap<>(); // x -> {y -> points added there}

    public void add(int[] point) {
        col.computeIfAbsent(point[0], k -> new HashMap<>()).merge(point[1], 1, Integer::sum);
    }

    private int at(int x, int y) {
        Map<Integer, Integer> c = col.get(x);
        return c == null ? 0 : c.getOrDefault(y, 0);
    }

    public int count(int[] point) {
        int x = point[0], y = point[1], total = 0;
        Map<Integer, Integer> same = col.get(x);
        if (same == null) return 0;
        // A point straight above or below the query fixes the side length d; the square then
        // lies to the right or to the left, and needs its other two corners.
        for (Map.Entry<Integer, Integer> e : same.entrySet()) {
            int y2 = e.getKey(), d = y2 - y;
            if (d == 0) continue;
            for (int x2 : new int[] {x + d, x - d}) total += e.getValue() * at(x2, y) * at(x2, y2);
        }
        return total;
    }
}

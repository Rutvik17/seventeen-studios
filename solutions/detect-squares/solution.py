class DetectSquares:
    def __init__(self):
        self.col = defaultdict(Counter)  # x -> {y -> how many points added there}

    def add(self, point: List[int]) -> None:
        x, y = point
        self.col[x][y] += 1

    def count(self, point: List[int]) -> int:
        x, y = point
        total = 0
        # A point straight above or below the query fixes the side length d; the square then
        # lies to the right or to the left, and needs its other two corners.
        for y2, n in self.col[x].items():
            d = y2 - y
            if d == 0:
                continue
            for x2 in (x + d, x - d):
                if x2 in self.col:
                    total += n * self.col[x2][y] * self.col[x2][y2]
        return total

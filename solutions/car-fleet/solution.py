class Solution:
    def carFleet(self, target: int, position: List[int], speed: List[int]) -> int:
        cars = sorted(zip(position, speed), reverse=True)  # nearest the target first
        fleets = 0
        slowest = 0.0  # arrival time of the fleet just ahead
        for p, s in cars:
            t = (target - p) / s  # when this car would arrive on its own
            if t > slowest:  # it cannot catch the fleet ahead: a new fleet
                fleets += 1
                slowest = t
        return fleets

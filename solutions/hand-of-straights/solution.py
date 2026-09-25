class Solution:
    def isNStraightHand(self, hand: List[int], groupSize: int) -> bool:
        if len(hand) % groupSize:
            return False
        count = Counter(hand)
        # The smallest card left must start a run — nothing smaller is left to come before it.
        for card in sorted(count):
            n = count[card]
            if n == 0:
                continue
            for x in range(card, card + groupSize):  # n runs start here, each needing card..card+size-1
                if count[x] < n:
                    return False
                count[x] -= n
        return True

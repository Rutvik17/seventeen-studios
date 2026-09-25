public class Solution {
    public int LastStoneWeight(int[] stones) {
        var heap = new PriorityQueue<int, int>(); // priority -weight: the heaviest on top
        foreach (int s in stones) heap.Enqueue(s, -s);
        while (heap.Count > 1) {
            int y = heap.Dequeue(), x = heap.Dequeue(); // the two heaviest, y >= x
            if (y > x) heap.Enqueue(y - x, -(y - x));
        }
        return heap.Count > 0 ? heap.Peek() : 0;
    }
}

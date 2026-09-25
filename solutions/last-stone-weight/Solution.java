class Solution {
    public int lastStoneWeight(int[] stones) {
        PriorityQueue<Integer> heap = new PriorityQueue<>(Collections.reverseOrder()); // the heaviest on top
        for (int s : stones) heap.offer(s);
        while (heap.size() > 1) {
            int y = heap.poll(), x = heap.poll(); // the two heaviest, y >= x
            if (y > x) heap.offer(y - x);
        }
        return heap.isEmpty() ? 0 : heap.peek();
    }
}

class Twitter {
    private int time = 0; // rises with every tweet: larger is more recent
    private final Map<Integer, List<int[]>> tweets = new HashMap<>(); // user -> [time, tweetId], oldest first
    private final Map<Integer, Set<Integer>> follows = new HashMap<>(); // user -> the users they follow

    public void postTweet(int userId, int tweetId) {
        tweets.computeIfAbsent(userId, u -> new ArrayList<>()).add(new int[] {++time, tweetId});
    }

    public List<Integer> getNewsFeed(int userId) {
        // Merge the users' lists newest-first with a heap holding each list's next tweet:
        // entries are {time, tweetId, user, index}.
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> Integer.compare(b[0], a[0]));
        Set<Integer> users = new HashSet<>(follows.getOrDefault(userId, Set.of()));
        users.add(userId);
        for (int u : users) {
            List<int[]> list = tweets.get(u);
            if (list != null && !list.isEmpty()) {
                int[] t = list.get(list.size() - 1);
                heap.offer(new int[] {t[0], t[1], u, list.size() - 1});
            }
        }
        List<Integer> feed = new ArrayList<>();
        while (!heap.isEmpty() && feed.size() < 10) {
            int[] e = heap.poll();
            feed.add(e[1]);
            if (e[3] > 0) { // that user's next older tweet
                int[] t = tweets.get(e[2]).get(e[3] - 1);
                heap.offer(new int[] {t[0], t[1], e[2], e[3] - 1});
            }
        }
        return feed;
    }

    public void follow(int followerId, int followeeId) {
        if (followerId != followeeId) follows.computeIfAbsent(followerId, u -> new HashSet<>()).add(followeeId);
    }

    public void unfollow(int followerId, int followeeId) {
        Set<Integer> s = follows.get(followerId);
        if (s != null) s.remove(followeeId);
    }
}

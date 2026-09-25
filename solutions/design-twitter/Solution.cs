public class Twitter {
    private int time = 0; // rises with every tweet: larger is more recent
    private readonly Dictionary<int, List<(int time, int id)>> tweets = new(); // user -> tweets, oldest first
    private readonly Dictionary<int, HashSet<int>> follows = new(); // user -> the users they follow

    public void PostTweet(int userId, int tweetId) {
        if (!tweets.ContainsKey(userId)) tweets[userId] = new();
        tweets[userId].Add((++time, tweetId));
    }

    public IList<int> GetNewsFeed(int userId) {
        // Merge the users' lists newest-first with a heap holding each list's next tweet
        // (priority: minus its time, so the newest comes out first).
        var heap = new PriorityQueue<(int id, int user, int index), int>();
        var users = new HashSet<int>(follows.GetValueOrDefault(userId) ?? new HashSet<int>()) { userId };
        foreach (int u in users) {
            if (tweets.TryGetValue(u, out var list) && list.Count > 0) heap.Enqueue((list[^1].id, u, list.Count - 1), -list[^1].time);
        }
        var feed = new List<int>();
        while (heap.Count > 0 && feed.Count < 10) {
            var (id, u, i) = heap.Dequeue();
            feed.Add(id);
            if (i > 0) heap.Enqueue((tweets[u][i - 1].id, u, i - 1), -tweets[u][i - 1].time); // that user's next older tweet
        }
        return feed;
    }

    public void Follow(int followerId, int followeeId) {
        if (followerId == followeeId) return;
        if (!follows.ContainsKey(followerId)) follows[followerId] = new();
        follows[followerId].Add(followeeId);
    }

    public void Unfollow(int followerId, int followeeId) {
        if (follows.TryGetValue(followerId, out var s)) s.Remove(followeeId);
    }
}

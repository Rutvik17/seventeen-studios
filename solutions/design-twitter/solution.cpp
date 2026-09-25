class Twitter {
    int time = 0; // rises with every tweet: larger is more recent
    unordered_map<int, vector<pair<int, int>>> tweets; // user -> (time, tweetId), oldest first
    unordered_map<int, unordered_set<int>> follows; // user -> the users they follow
public:
    Twitter() {}

    void postTweet(int userId, int tweetId) {
        tweets[userId].push_back({++time, tweetId});
    }

    vector<int> getNewsFeed(int userId) {
        // Merge the users' lists newest-first with a heap holding each list's next tweet:
        // entries are (time, tweetId, user, index).
        priority_queue<tuple<int, int, int, int>> heap;
        unordered_set<int> users = follows[userId];
        users.insert(userId);
        for (int u : users) {
            auto& list = tweets[u];
            if (!list.empty()) heap.push({list.back().first, list.back().second, u, (int)list.size() - 1});
        }
        vector<int> feed;
        while (!heap.empty() && feed.size() < 10) {
            auto [t, tid, u, i] = heap.top();
            heap.pop();
            feed.push_back(tid);
            if (i > 0) heap.push({tweets[u][i - 1].first, tweets[u][i - 1].second, u, i - 1}); // that user's next older tweet
        }
        return feed;
    }

    void follow(int followerId, int followeeId) {
        if (followerId != followeeId) follows[followerId].insert(followeeId);
    }

    void unfollow(int followerId, int followeeId) {
        follows[followerId].erase(followeeId);
    }
};

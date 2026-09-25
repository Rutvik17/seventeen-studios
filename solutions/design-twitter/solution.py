class Twitter:
    def __init__(self):
        self.time = 0  # rises with every tweet: larger is more recent
        self.tweets = defaultdict(list)  # user -> [(time, tweetId)], oldest first
        self.follows = defaultdict(set)  # user -> the users they follow

    def postTweet(self, userId: int, tweetId: int) -> None:
        self.time += 1
        self.tweets[userId].append((self.time, tweetId))

    def getNewsFeed(self, userId: int) -> List[int]:
        # Merge the users' lists newest-first with a heap holding each list's next tweet.
        heap = []
        for u in self.follows[userId] | {userId}:
            if self.tweets[u]:
                i = len(self.tweets[u]) - 1
                t, tid = self.tweets[u][i]
                heap.append((-t, tid, u, i))
        heapify(heap)
        feed = []
        while heap and len(feed) < 10:
            _, tid, u, i = heappop(heap)
            feed.append(tid)
            if i > 0:  # that user's next older tweet
                t, nid = self.tweets[u][i - 1]
                heappush(heap, (-t, nid, u, i - 1))
        return feed

    def follow(self, followerId: int, followeeId: int) -> None:
        if followerId != followeeId:
            self.follows[followerId].add(followeeId)

    def unfollow(self, followerId: int, followeeId: int) -> None:
        self.follows[followerId].discard(followeeId)

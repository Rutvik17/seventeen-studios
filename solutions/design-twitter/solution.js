/** JavaScript has no built-in heap: a binary heap with the smallest (by `less`) on top. */
class Heap {
  constructor(less) {
    this.a = [];
    this.less = less;
  }
  get size() {
    return this.a.length;
  }
  push(x) {
    const a = this.a;
    a.push(x);
    for (let i = a.length - 1; i > 0; ) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (l + 1 < a.length && this.less(a[l + 1], a[m])) m = l + 1;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

class Twitter {
  constructor() {
    this.time = 0; // rises with every tweet: larger is more recent
    this.tweets = new Map(); // user -> [[time, tweetId]], oldest first
    this.follows = new Map(); // user -> the users they follow
  }

  /** @param {number} userId @param {number} tweetId */
  postTweet(userId, tweetId) {
    if (!this.tweets.has(userId)) this.tweets.set(userId, []);
    this.tweets.get(userId).push([++this.time, tweetId]);
  }

  /** @param {number} userId @return {number[]} */
  getNewsFeed(userId) {
    // Merge the users' lists newest-first with a heap holding each list's next tweet.
    const heap = new Heap((a, b) => a[0] > b[0]);
    for (const u of new Set([userId, ...(this.follows.get(userId) ?? [])])) {
      const list = this.tweets.get(u);
      if (list?.length) heap.push([...list[list.length - 1], u, list.length - 1]);
    }
    const feed = [];
    while (heap.size && feed.length < 10) {
      const [, tid, u, i] = heap.pop();
      feed.push(tid);
      if (i > 0) heap.push([...this.tweets.get(u)[i - 1], u, i - 1]); // that user's next older tweet
    }
    return feed;
  }

  /** @param {number} followerId @param {number} followeeId */
  follow(followerId, followeeId) {
    if (followerId === followeeId) return;
    if (!this.follows.has(followerId)) this.follows.set(followerId, new Set());
    this.follows.get(followerId).add(followeeId);
  }

  /** @param {number} followerId @param {number} followeeId */
  unfollow(followerId, followeeId) {
    this.follows.get(followerId)?.delete(followeeId);
  }
}

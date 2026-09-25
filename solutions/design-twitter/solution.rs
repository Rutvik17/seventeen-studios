use std::collections::{BinaryHeap, HashMap, HashSet};

struct Twitter {
    time: i32,                            // rises with every tweet: larger is more recent
    tweets: HashMap<i32, Vec<(i32, i32)>>, // user -> (time, tweetId), oldest first
    follows: HashMap<i32, HashSet<i32>>,  // user -> the users they follow
}

impl Twitter {
    fn new() -> Self {
        Twitter { time: 0, tweets: HashMap::new(), follows: HashMap::new() }
    }

    fn post_tweet(&mut self, user_id: i32, tweet_id: i32) {
        self.time += 1;
        self.tweets.entry(user_id).or_default().push((self.time, tweet_id));
    }

    fn get_news_feed(&self, user_id: i32) -> Vec<i32> {
        // Merge the users' lists newest-first with a heap holding each list's next tweet:
        // entries are (time, tweetId, user, index).
        let mut users: HashSet<i32> = self.follows.get(&user_id).cloned().unwrap_or_default();
        users.insert(user_id);
        let mut heap = BinaryHeap::new();
        for u in users {
            if let Some(list) = self.tweets.get(&u) {
                if let Some(&(t, id)) = list.last() {
                    heap.push((t, id, u, list.len() - 1));
                }
            }
        }
        let mut feed = vec![];
        while feed.len() < 10 {
            let Some((_, id, u, i)) = heap.pop() else { break };
            feed.push(id);
            if i > 0 {
                // that user's next older tweet
                let (t, nid) = self.tweets[&u][i - 1];
                heap.push((t, nid, u, i - 1));
            }
        }
        feed
    }

    fn follow(&mut self, follower_id: i32, followee_id: i32) {
        if follower_id != followee_id {
            self.follows.entry(follower_id).or_default().insert(followee_id);
        }
    }

    fn unfollow(&mut self, follower_id: i32, followee_id: i32) {
        if let Some(s) = self.follows.get_mut(&follower_id) {
            s.remove(&followee_id);
        }
    }
}

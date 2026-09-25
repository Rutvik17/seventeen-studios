class LRUCache {
    int cap;
    list<pair<int, int>> order; // {key, value}, most recently used at the front
    unordered_map<int, list<pair<int, int>>::iterator> where; // key -> its place in order
public:
    LRUCache(int capacity) : cap(capacity) {}

    int get(int key) {
        auto it = where.find(key);
        if (it == where.end()) return -1;
        order.splice(order.begin(), order, it->second); // move to the front: just used
        return it->second->second;
    }

    void put(int key, int value) {
        auto it = where.find(key);
        if (it != where.end()) order.erase(it->second);
        order.push_front({key, value});
        where[key] = order.begin();
        if ((int)where.size() > cap) {
            where.erase(order.back().first); // evict the least recently used, at the back
            order.pop_back();
        }
    }
};

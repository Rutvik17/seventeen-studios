class MinStack {
    vector<pair<int, int>> st; // {value, smallest at or below}
public:
    MinStack() {}
    void push(int val) {
        int smallest = st.empty() ? val : min(val, st.back().second);
        st.push_back({val, smallest});
    }
    void pop() { st.pop_back(); }
    int top() { return st.back().first; }
    int getMin() { return st.back().second; }
};

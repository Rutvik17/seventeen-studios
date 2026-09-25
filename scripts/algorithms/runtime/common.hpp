// Runtime for testing the C++ solutions: LeetCode's node types, builders, and a JSON printer.
#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val; ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};
struct TreeNode {
    int val; TreeNode *left; TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};
namespace graph {
class Node {
public:
    int val; vector<Node*> neighbors;
    Node() { val = 0; neighbors = vector<Node*>(); }
    Node(int _val) { val = _val; neighbors = vector<Node*>(); }
    Node(int _val, vector<Node*> _neighbors) { val = _val; neighbors = _neighbors; }
};
}
namespace rnd {
class Node {
public:
    int val; Node* next; Node* random;
    Node(int _val) { val = _val; next = NULL; random = NULL; }
};
}

inline ListNode* mkList(vector<int> v) { ListNode d; ListNode* c = &d; for (int x : v) { c->next = new ListNode(x); c = c->next; } return d.next; }
inline ListNode* mkCycle(vector<int> v, int pos) { vector<ListNode*> ns; for (int x : v) ns.push_back(new ListNode(x)); for (size_t i = 0; i + 1 < ns.size(); i++) ns[i]->next = ns[i + 1]; if (pos >= 0 && !ns.empty()) ns.back()->next = ns[pos]; return ns.empty() ? nullptr : ns[0]; }
inline TreeNode* mkTree(vector<string> v) {
    if (v.empty() || v[0] == "null") return nullptr;
    TreeNode* root = new TreeNode(stoi(v[0])); queue<TreeNode*> q; q.push(root); size_t i = 1;
    while (!q.empty() && i < v.size()) {
        TreeNode* n = q.front(); q.pop();
        if (i < v.size() && v[i] != "null") { n->left = new TreeNode(stoi(v[i])); q.push(n->left); } i++;
        if (i < v.size() && v[i] != "null") { n->right = new TreeNode(stoi(v[i])); q.push(n->right); } i++;
    }
    return root;
}
inline TreeNode* findNode(TreeNode* r, int val) { if (!r) return nullptr; if (r->val == val) return r; TreeNode* a = findNode(r->left, val); return a ? a : findNode(r->right, val); }
inline rnd::Node* mkRandom(vector<pair<int,int>> v) { vector<rnd::Node*> ns; for (auto& p : v) ns.push_back(new rnd::Node(p.first)); for (size_t i = 0; i < ns.size(); i++) { if (i + 1 < ns.size()) ns[i]->next = ns[i + 1]; if (v[i].second >= 0) ns[i]->random = ns[v[i].second]; } return ns.empty() ? nullptr : ns[0]; }
inline graph::Node* mkGraph(vector<vector<int>> adj) { if (adj.empty()) return nullptr; vector<graph::Node*> ns; for (size_t i = 0; i < adj.size(); i++) ns.push_back(new graph::Node(i + 1)); for (size_t i = 0; i < adj.size(); i++) for (int j : adj[i]) ns[i]->neighbors.push_back(ns[j - 1]); return ns[0]; }

inline string J(int x) { return to_string(x); }
inline string J(long x) { return to_string(x); }
inline string J(long long x) { return to_string(x); }
inline string J(unsigned x) { return to_string(x); }
inline string J(double x) { ostringstream o; o << setprecision(12) << x; string s = o.str(); return s; }
inline string J(bool x) { return x ? "true" : "false"; }
inline string J(const string& s) { string o = "\""; for (char c : s) { if (c == '"' || c == '\\') { o += '\\'; o += c; } else if (c == '\n') o += "\\n"; else o += c; } return o + "\""; }
inline string J(const char* s) { return J(string(s)); }
inline string J(char c) { return J(string(1, c)); }
string J(ListNode* h);
string J(TreeNode* r);
string J(graph::Node* n);
string J(rnd::Node* n);
template <class T> string J(const vector<T>& v) { string o = "["; bool f = true; for (const auto& x : v) { if (!f) o += ","; f = false; o += J(x); } return o + "]"; }
inline string J(const vector<bool>& v) { string o = "["; for (size_t i = 0; i < v.size(); i++) { if (i) o += ","; o += v[i] ? "true" : "false"; } return o + "]"; }
inline string J(ListNode* h) { vector<int> v; int k = 0; while (h && k++ < 10000) { v.push_back(h->val); h = h->next; } return J(v); }
inline string J(TreeNode* r) {
    vector<string> o; queue<TreeNode*> q; q.push(r);
    while (!q.empty()) { TreeNode* n = q.front(); q.pop(); if (!n) o.push_back("null"); else { o.push_back(to_string(n->val)); q.push(n->left); q.push(n->right); } }
    while (!o.empty() && o.back() == "null") o.pop_back();
    string s = "["; for (size_t i = 0; i < o.size(); i++) { if (i) s += ","; s += o[i]; } return s + "]";
}
inline string J(rnd::Node* h) { vector<rnd::Node*> ns; for (auto n = h; n; n = n->next) ns.push_back(n); string s = "["; for (size_t i = 0; i < ns.size(); i++) { if (i) s += ","; int r = -1; for (size_t j = 0; j < ns.size(); j++) if (ns[j] == ns[i]->random) r = j; s += "[" + to_string(ns[i]->val) + "," + (r < 0 ? string("null") : to_string(r)) + "]"; } return s + "]"; }
inline string J(graph::Node* n) { if (!n) return "[]"; map<int, graph::Node*> by; vector<graph::Node*> st{n}; while (!st.empty()) { auto x = st.back(); st.pop_back(); if (by.count(x->val)) continue; by[x->val] = x; for (auto y : x->neighbors) st.push_back(y); } string s = "["; for (int v = 1; v <= (int)by.size(); v++) { if (v > 1) s += ","; vector<int> a; for (auto y : by[v]->neighbors) a.push_back(y->val); s += J(a); } return s + "]"; }

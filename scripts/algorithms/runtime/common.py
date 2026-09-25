# Runtime for testing the Python solutions: LeetCode's node classes and the
# builders and serialisers the generated harness calls.
from typing import *
import collections, heapq, math, bisect, itertools, functools, json, sys, string, random
from collections import *
from heapq import *
from functools import lru_cache, cache, reduce


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


class RandomNode:
    def __init__(self, x: int, next=None, random=None):
        self.val = int(x)
        self.next = next
        self.random = random


class GraphNode:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []


def mk_list(vals):
    head = cur = ListNode()
    for v in vals:
        cur.next = ListNode(v)
        cur = cur.next
    return head.next


def mk_cycle(spec):
    vals, pos = spec
    nodes = [ListNode(v) for v in vals]
    for a, b in zip(nodes, nodes[1:]):
        a.next = b
    if pos >= 0 and nodes:
        nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None


def mk_tree(vals):
    if not vals or vals[0] is None:
        return None
    root = TreeNode(vals[0])
    q = deque([root])
    i = 1
    while q and i < len(vals):
        n = q.popleft()
        if i < len(vals) and vals[i] is not None:
            n.left = TreeNode(vals[i]); q.append(n.left)
        i += 1
        if i < len(vals) and vals[i] is not None:
            n.right = TreeNode(vals[i]); q.append(n.right)
        i += 1
    return root


def find_node(root, val):
    st = [root]
    while st:
        n = st.pop()
        if n is None:
            continue
        if n.val == val:
            return n
        st += [n.left, n.right]
    return None


def mk_random(pairs):
    nodes = [RandomNode(v) for v, _ in pairs]
    for a, b in zip(nodes, nodes[1:]):
        a.next = b
    for n, (_, r) in zip(nodes, pairs):
        n.random = nodes[r] if r is not None else None
    return nodes[0] if nodes else None


def mk_graph(adj):
    if not adj:
        return None
    nodes = [GraphNode(i + 1) for i in range(len(adj))]
    for i, ns in enumerate(adj):
        nodes[i].neighbors = [nodes[j - 1] for j in ns]
    return nodes[0]


def _conv(x, seen=None):
    if isinstance(x, ListNode):
        out, n, k = [], x, 0
        while n is not None and k < 10000:
            out.append(_conv(n.val)); n = n.next; k += 1
        return out
    if isinstance(x, TreeNode):
        out, q = [], deque([x])
        while q:
            n = q.popleft()
            if n is None:
                out.append(None)
            else:
                out.append(n.val); q.append(n.left); q.append(n.right)
        while out and out[-1] is None:
            out.pop()
        return out
    if isinstance(x, RandomNode):
        nodes, n = [], x
        while n is not None:
            nodes.append(n); n = n.next
        idx = {id(n): i for i, n in enumerate(nodes)}
        return [[n.val, idx[id(n.random)] if n.random is not None else None] for n in nodes]
    if isinstance(x, GraphNode):
        by, st = {}, [x]
        while st:
            n = st.pop()
            if n.val in by:
                continue
            by[n.val] = n
            st += n.neighbors
        return [[m.val for m in by[v].neighbors] for v in range(1, len(by) + 1)]
    if isinstance(x, (list, tuple)):
        return [_conv(y) for y in x]
    if isinstance(x, float) and x.is_integer() is False:
        return x
    return x


def to_json(x):
    return json.dumps(_conv(x), separators=(",", ":"))


def to_json_node(x):
    """A list, tree or graph answer: an empty one is written [], as LeetCode writes it."""
    return to_json(x if x is not None else [])

import type { Category } from './types';

export const advancedGraphs: Category = {
  slug: 'advanced-graphs',
  title: 'Advanced Graphs',
  blurb: 'Weighted edges and ordering constraints: shortest paths with Dijkstra and Bellman–Ford, the cheapest network with Prim, and a route that uses every edge once.',
  problems: [
    {
      slug: 'reconstruct-itinerary',
      number: 332,
      title: 'Reconstruct Itinerary',
      difficulty: 'Hard',
      statement: [
        'Each ticket `[from, to]` is one flight. Starting at `"JFK"`, use every ticket exactly once and return the airports in the order visited.',
        'If several itineraries use every ticket, return the one that comes first alphabetically when read as a list of airports. At least one exists.',
      ],
      constraints: ['1 ≤ tickets.length ≤ 300', 'Airports are three uppercase letters.', 'A ticket never goes from an airport to itself.'],
      idea: [
        'A route using every edge exactly once is an Eulerian path. Greedily taking the alphabetically first flight each time can strand you: fly JFK → KUL first, and the ticket NRT → JFK is never used.',
        'Hierholzer’s algorithm fixes this by building the route backwards. Always take the smallest remaining flight. When you land somewhere with no tickets left, that airport must be the end of whatever is still unwritten — so write it down (at the back) and step back to try from the previous airport. Reversed at the end, the written list is the itinerary.',
      ],
      complexity: { time: 'O(E log E) — sorting the E tickets; the walk itself is O(E)', space: 'O(E)' },
    },
    {
      slug: 'min-cost-to-connect-all-points',
      number: 1584,
      title: 'Min Cost to Connect All Points',
      difficulty: 'Medium',
      statement: [
        'Given points `[x, y]`, connecting two costs their Manhattan distance, `|x₁ − x₂| + |y₁ − y₂|` — the distance along a street grid.',
        'Return the least total cost to connect all the points so that every point can reach every other along the connections.',
      ],
      constraints: ['1 ≤ points.length ≤ 1000', '−10⁶ ≤ x, y ≤ 10⁶', 'All points are different.'],
      idea: [
        'The cheapest set of connections that joins everything is a minimum spanning tree: n − 1 links and no loop, since a loop always has a link that can go.',
        'Prim’s algorithm grows it from one point. Keep, for every point outside the tree, the cheapest link from it to any point inside. Each round, add the outside point with the cheapest link, then let it offer cheaper links to the rest. With every pair of points connectable, scanning the array of n costs each round (n² in all) beats sorting all n² / 2 possible links.',
      ],
      complexity: { time: 'O(n²)', space: 'O(n)' },
    },
    {
      slug: 'network-delay-time',
      number: 743,
      title: 'Network Delay Time',
      difficulty: 'Medium',
      statement: [
        'A network has `n` nodes, numbered 1 to `n`. Each `[u, v, w]` in `times` means a signal sent from `u` reaches `v` after `w` time units (one way).',
        'A signal starts at node `k`. Return how long until every node has received it, or −1 if some node never does.',
      ],
      constraints: ['1 ≤ k ≤ n ≤ 100', '1 ≤ times.length ≤ 6000', '0 ≤ w ≤ 100, and no pair (u, v) repeats.'],
      idea: [
        'Each node hears the signal at the length of its shortest path from `k`; the answer is the longest of those.',
        'Dijkstra’s algorithm finds shortest paths when no weight is negative. Keep a min-heap of (arrival time, node). The earliest entry is final — any other route would pass through a later node first, and times only add up. Settle it, and offer its neighbours their arrival times through it. Entries for nodes already settled are stale and skipped.',
      ],
      complexity: { time: 'O(E log E)', space: 'O(n + E)' },
    },
    {
      slug: 'swim-in-rising-water',
      number: 778,
      title: 'Swim in Rising Water',
      difficulty: 'Hard',
      statement: [
        'An `n × n` grid gives the height of each square. Rain falls; at time `t` the water is `t` deep everywhere, and you can swim between neighbouring squares (up, down, left, right) only if both are at most `t` high. Swimming takes no time.',
        'Starting at the top-left square, return the least time at which you can reach the bottom-right one.',
      ],
      constraints: ['1 ≤ n ≤ 50', '0 ≤ grid[i][j] < n², and every height is different.'],
      idea: [
        'A route can be swum once the water covers its highest square. So the question is the route whose highest square is lowest.',
        'That is Dijkstra’s algorithm with a different cost: a route’s cost is the largest height along it, not the sum. Pull the cheapest frontier square from a min-heap; its neighbours cost the larger of that and their own height. The first time the bottom-right square comes off the heap, its cost is the answer.',
      ],
      complexity: { time: 'O(n² log n)', space: 'O(n²)' },
    },
    {
      slug: 'alien-dictionary',
      number: 269,
      title: 'Alien Dictionary',
      difficulty: 'Hard',
      statement: [
        'An alien language uses lowercase English letters in an unknown order. You are given its words sorted in dictionary order by that alphabet.',
        'Return a string of all the letters used, in an order consistent with the sorting. Any consistent order will do; if none exists, return `""`.',
      ],
      constraints: ['1 ≤ words.length ≤ 100', '1 ≤ words[i].length ≤ 100', 'Only lowercase English letters.'],
      idea: [
        'Only neighbouring words tell anything, and only at their first difference: `wrt` before `wrf` says `t` comes before `f`, nothing more. One case says the list is impossible: a word before its own prefix, like `abc` before `ab`.',
        'Each rule is an arrow between two letters, so the alphabet is a topological order of those arrows — found with Kahn’s algorithm, as in Course Schedule II. If some letters never become free, the rules contain a cycle and no alphabet exists.',
      ],
      complexity: { time: 'O(C) — C the total letters in all words', space: 'O(U + R) — U letters, R rules, both at most 26 and 26²' },
    },
    {
      slug: 'cheapest-flights-within-k-stops',
      number: 787,
      title: 'Cheapest Flights Within K Stops',
      difficulty: 'Medium',
      statement: [
        'There are `n` cities. Each `[from, to, price]` is a one-way flight.',
        'Return the cheapest price from `src` to `dst` using at most `k` stops in between (so at most `k + 1` flights), or −1 if there is no such route.',
      ],
      constraints: ['1 ≤ n ≤ 100', '1 ≤ price ≤ 10⁴', 'At most one flight between any two cities in each direction.', '0 ≤ src, dst, k < n, and src ≠ dst.'],
      idea: [
        'Dijkstra’s cheapest-first order ignores how many flights a route uses, and the cheapest route may have too many. Bellman–Ford counts them naturally: each round lets every route grow by one flight.',
        'Start with `src` at 0 and everything else unreachable. Each round, for every flight `u → v`, see whether reaching `u` last round and then flying on is cheaper. Reading last round’s prices — a copy — is what keeps each round to exactly one extra flight. After `k + 1` rounds, the price of `dst` is the cheapest with at most `k` stops.',
      ],
      complexity: { time: 'O(k · F) — F flights, k + 1 rounds', space: 'O(n)' },
    },
  ],
};

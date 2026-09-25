import type { Category } from './types';

export const graphs: Category = {
  slug: 'graphs',
  title: 'Graphs',
  blurb: 'Things joined to things — cells on a map, courses by their prerequisites, words by one letter. Depth-first goes deep along one path; breadth-first spreads out one ring at a time.',
  problems: [
    {
      slug: 'number-of-islands',
      number: 200,
      title: 'Number of Islands',
      difficulty: 'Medium',
      statement: [
        'A map is an `m × n` grid of `"1"` (land) and `"0"` (water). An island is a group of land cells joined horizontally or vertically, surrounded by water; everything beyond the grid’s edge is water.',
        'Return the number of islands.',
      ],
      constraints: ['1 ≤ m, n ≤ 300', 'Each cell is "0" or "1".'],
      idea: [
        'Scan the grid. The first land cell of each island that the scan meets is where that island is counted — so count it, then make sure none of the island’s other cells can be counted again.',
        'Do that by sinking the island: a depth-first search (here with an explicit stack of cells to visit) spreads from the cell to every land neighbour, turning each into water. When the scan moves on, the whole island is gone, and the next land it meets must be a new island.',
      ],
      complexity: { time: 'O(m · n) — each cell sunk at most once', space: 'O(m · n) — the stack, when the whole map is land' },
    },
    {
      slug: 'clone-graph',
      number: 133,
      title: 'Clone Graph',
      difficulty: 'Medium',
      statement: [
        'A graph is a set of nodes joined by edges. Here each node has a value and a list of its `neighbors`, and the graph is undirected: every edge is listed at both of its ends.',
        'Given one node of a connected graph, return a deep copy — new nodes with the same values, joined in exactly the same way. It is written here as an adjacency list: row `i` lists the neighbours of the node with value `i + 1`.',
      ],
      constraints: ['0 ≤ number of nodes ≤ 100', '1 ≤ Node.val ≤ 100, each different', 'No repeated edges and no node joined to itself.', 'The graph is connected.'],
      idea: [
        'Walk the graph, copying each node as it is first met. The danger is cycles: node 1’s neighbour is 2, whose neighbour is 1 again. Copying naively would go round forever, or make two copies of node 1.',
        'So keep a hash map from each original node to its copy. Before copying a node, check the map; if it is there, reuse the copy. And record the copy in the map before copying the neighbours — then a cycle back to this node finds its copy already waiting.',
      ],
      complexity: { time: 'O(V + E) — each node and edge once', space: 'O(V) — the map' },
    },
    {
      slug: 'max-area-of-island',
      number: 695,
      title: 'Max Area of Island',
      difficulty: 'Medium',
      statement: ['A grid holds `1` for land and `0` for water; an island is land cells joined horizontally or vertically. Its area is its number of cells. Return the largest area, or 0 if there is no land.'],
      constraints: ['1 ≤ m, n ≤ 50', 'Each cell is 0 or 1.'],
      idea: [
        'This is Number of Islands, counting cells instead of islands. When the scan meets land, a depth-first search spreads over the whole island, sinking each cell as it goes and counting one for each.',
        'The count when the search runs out is that island’s area; keep the largest.',
      ],
      complexity: { time: 'O(m · n)', space: 'O(m · n)' },
    },
    {
      slug: 'pacific-atlantic-water-flow',
      number: 417,
      title: 'Pacific Atlantic Water Flow',
      difficulty: 'Medium',
      statement: [
        'An island is an `m × n` grid of heights. The Pacific Ocean touches its top and left edges; the Atlantic, its bottom and right edges. Rain flows from a cell to a neighbour (up, down, left, right) whose height is equal or lower, and from any edge cell into the ocean beside it.',
        'Return every cell `[r, c]` from which rain can reach both oceans.',
      ],
      constraints: ['1 ≤ m, n ≤ 200', '0 ≤ heights[r][c] ≤ 10⁵'],
      idea: [
        'Asking each cell “can I reach the ocean?” repeats the same walks. Turn it round: start at the ocean and walk uphill. Water can flow from a cell down to the Pacific exactly when the Pacific’s edge can “climb” to that cell through neighbours of equal or greater height.',
        'So run one search from every Pacific edge cell, climbing, and mark what it reaches; do the same from the Atlantic edge. The answer is the cells marked by both.',
      ],
      complexity: { time: 'O(m · n) — each search visits a cell once', space: 'O(m · n) — two sets of marks' },
    },
    {
      slug: 'surrounded-regions',
      number: 130,
      title: 'Surrounded Regions',
      difficulty: 'Medium',
      statement: [
        'A board holds `X` and `O`. A region of `O`s (joined horizontally or vertically) is captured if it is completely surrounded by `X` — that is, if none of its cells is on the board’s edge. Capturing turns all its `O`s into `X`.',
        'Capture every surrounded region, changing the board in place.',
      ],
      constraints: ['1 ≤ m, n ≤ 200', 'Each cell is "X" or "O".'],
      idea: [
        'Finding each region and checking whether it touches the edge works, but the reverse is simpler: the regions that survive are exactly those joined to an `O` on the edge.',
        'So start from every `O` on the border and spread through its region, marking the cells safe (`S`). Afterwards, every `O` still unmarked is surrounded — make it `X` — and every `S` goes back to `O`.',
      ],
      complexity: { time: 'O(m · n)', space: 'O(m · n) — the stack' },
    },
    {
      slug: 'rotting-oranges',
      number: 994,
      title: 'Rotting Oranges',
      difficulty: 'Medium',
      statement: [
        'Each cell of a grid is `0` (empty), `1` (a fresh orange) or `2` (a rotten one). Every minute, each fresh orange next to a rotten one (up, down, left, right) rots.',
        'Return the number of minutes until no fresh orange is left, or −1 if some can never rot.',
      ],
      constraints: ['1 ≤ m, n ≤ 10', 'Each cell is 0, 1 or 2.'],
      idea: [
        'The rot spreads in rings, one step a minute — which is exactly how breadth-first search explores: everything one step away, then everything two steps away. Start it from every rotten orange at once (a “multi-source” search), with all of them in the queue.',
        'Each round of the queue is one minute: every orange rotted in that round was fresh and next to one rotted the round before. Count fresh oranges down as they rot; if the queue empties with some left, they are cut off by empty cells: −1.',
      ],
      complexity: { time: 'O(m · n)', space: 'O(m · n) — the queue' },
    },
    {
      slug: 'walls-and-gates',
      number: 286,
      title: 'Walls and Gates',
      difficulty: 'Medium',
      statement: [
        'Each cell of a grid is `−1` (a wall), `0` (a gate), or `2147483647` (an empty room; the largest 32-bit integer stands for “infinity”).',
        'Fill each empty room with the number of steps (up, down, left, right, never through a wall) to its nearest gate. A room no gate can reach keeps `2147483647`. Change the grid in place.',
      ],
      constraints: ['1 ≤ m, n ≤ 250', 'Each cell is −1, 0 or 2³¹ − 1.'],
      idea: [
        'Searching from every room to find its nearest gate repeats work. Instead search from all the gates at once, breadth-first, like the rot in Rotting Oranges.',
        'Breadth-first search reaches cells in order of distance. So the first time a room is reached, it is from its nearest gate, by the shortest route: write down that distance and never touch the room again. A room still at infinity when the search ends has no route to any gate.',
      ],
      complexity: { time: 'O(m · n)', space: 'O(m · n) — the queue' },
    },
    {
      slug: 'course-schedule',
      number: 207,
      title: 'Course Schedule',
      difficulty: 'Medium',
      statement: [
        'There are `numCourses` courses, numbered from 0. Each pair `[a, b]` in `prerequisites` means course `b` must be taken before course `a`.',
        'Return `true` if it is possible to take every course.',
      ],
      constraints: ['1 ≤ numCourses ≤ 2000', '0 ≤ prerequisites.length ≤ 5000', 'No pair appears twice.'],
      idea: [
        'Draw each prerequisite as an arrow from `b` to `a`: a directed graph. The courses can all be taken unless the arrows form a cycle — a course that, through a chain of prerequisites, needs itself.',
        'Kahn’s algorithm finds out by doing it. Count, for each course, how many prerequisites it still waits for. Any course waiting for none can be taken; taking it lowers the count of every course that needed it, and some of those may reach zero in turn. If every course gets taken, there is no cycle. Courses on a cycle never reach zero.',
      ],
      complexity: { time: 'O(V + E) — V courses, E prerequisites', space: 'O(V + E)' },
    },
    {
      slug: 'course-schedule-ii',
      number: 210,
      title: 'Course Schedule II',
      difficulty: 'Medium',
      statement: [
        'As in Course Schedule: `numCourses` courses, and pairs `[a, b]` meaning `b` must come before `a`.',
        'Return an order in which to take all the courses. Any valid order will do; if none exists, return an empty array.',
      ],
      constraints: ['1 ≤ numCourses ≤ 2000', 'Every pair is distinct, and a ≠ b.'],
      idea: [
        'An order in which every arrow points forward is a topological order. Kahn’s algorithm produces one: the order in which it takes the courses.',
        'Write each course down as it is taken — a course is only taken once all its prerequisites have been. If the list ends shorter than `numCourses`, the missing courses are stuck on a cycle, and there is no valid order.',
      ],
      complexity: { time: 'O(V + E)', space: 'O(V + E)' },
    },
    {
      slug: 'redundant-connection',
      number: 684,
      title: 'Redundant Connection',
      difficulty: 'Medium',
      statement: [
        'A tree — a connected graph with no cycles — on nodes `1` to `n` had one extra edge added, so now it has `n` edges and exactly one cycle.',
        'Return an edge whose removal leaves a tree. If several would, return the one that comes last in `edges`.',
      ],
      constraints: ['3 ≤ n ≤ 1000', '`edges.length` is n', '1 ≤ a < b ≤ n, and no edge repeats.', 'The graph is connected.'],
      idea: [
        'Add the edges one at a time, keeping track of which nodes are already connected. The first edge whose two ends are already connected closes the cycle — and since the cycle is completed by exactly that edge, it is the last edge of the cycle in the list, which is the one asked for.',
        'Union-find tracks connected groups: each node points toward a representative of its group; `find` follows the pointers, `union` hangs one group’s representative under another’s. Hanging the smaller group under the larger, and shortening paths as they are followed, keeps every operation almost constant time.',
      ],
      complexity: { time: 'O(n · α(n)) — α grows so slowly it is below 5 for any real n', space: 'O(n)' },
    },
    {
      slug: 'number-of-connected-components-in-an-undirected-graph',
      number: 323,
      title: 'Number of Connected Components in an Undirected Graph',
      difficulty: 'Medium',
      statement: ['There are `n` nodes, numbered 0 to `n − 1`, and a list of undirected edges. Return the number of connected components — separate groups, where every node in a group can reach every other.'],
      constraints: ['1 ≤ n ≤ 2000', '1 ≤ edges.length ≤ 5000', 'No edge repeats.'],
      idea: [
        'Start with every node in a group of its own: `n` groups. Each edge either joins two different groups into one — one group fewer — or falls inside a group already joined, and changes nothing.',
        'Union-find answers “same group?” and does the joining, each in almost constant time. The count left at the end is the answer.',
      ],
      complexity: { time: 'O(n + E · α(n))', space: 'O(n)' },
    },
    {
      slug: 'graph-valid-tree',
      number: 261,
      title: 'Graph Valid Tree',
      difficulty: 'Medium',
      statement: ['Given `n` nodes numbered 0 to `n − 1` and a list of undirected edges, return `true` if together they form a tree: connected, with no cycles.'],
      constraints: ['1 ≤ n ≤ 2000', '0 ≤ edges.length ≤ 5000', 'No self-loops and no repeated edges.'],
      idea: [
        'A tree on `n` nodes always has exactly `n − 1` edges. So first count: any other number, and it is not a tree.',
        'With exactly `n − 1` edges, it is a tree precisely when there is no cycle — each of the `n − 1` edges then joins two separate groups, bringing `n` groups down to 1: connected. Union-find spots a cycle as an edge whose ends are already in the same group.',
      ],
      complexity: { time: 'O(n · α(n))', space: 'O(n)' },
    },
    {
      slug: 'word-ladder',
      number: 127,
      title: 'Word Ladder',
      difficulty: 'Hard',
      statement: [
        'A ladder from `beginWord` to `endWord` is a sequence of words, each differing from the one before in exactly one letter, where every word after the first is in `wordList`.',
        'Return the number of words in the shortest ladder, or 0 if there is none.',
      ],
      constraints: ['1 ≤ beginWord.length ≤ 10', '`endWord` has the same length; `beginWord` ≠ `endWord`.', '1 ≤ wordList.length ≤ 5000', 'All words are lowercase and different.'],
      idea: [
        'Picture every word as a node, with an edge between two words one letter apart. The question is then the shortest path from `beginWord` to `endWord`, and in a graph whose edges all count the same, breadth-first search finds shortest paths.',
        'The edges are never built. From a word, try each position with each of the 26 letters and keep the results that are in the word list — at most 26 × L lookups. Remove each word from the list when it is first reached: breadth-first reaches it first by a shortest route, so no later route can be better.',
      ],
      complexity: { time: 'O(N · L² · 26) — N words, each tried at L positions, each new word L letters long', space: 'O(N · L)' },
    },
  ],
};

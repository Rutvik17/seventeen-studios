import type { Category } from './types';

export const tries: Category = {
  slug: 'tries',
  title: 'Tries',
  blurb: 'Store words letter by letter down a tree, so every word sharing a beginning shares the path — and a prefix is found in as many steps as it has letters.',
  problems: [
    {
      slug: 'implement-trie-prefix-tree',
      number: 208,
      title: 'Implement Trie (Prefix Tree)',
      difficulty: 'Medium',
      statement: [
        'Build a trie (pronounced “try”), a tree for storing words. Support `insert(word)`; `search(word)`, which says whether that exact word was inserted; and `startsWith(prefix)`, which says whether any inserted word begins with `prefix`.',
      ],
      constraints: ['1 ≤ word.length, prefix.length ≤ 2000', 'Only lowercase English letters.', 'At most 3 × 10⁴ calls in total.'],
      idea: [
        'Each node of a trie has up to 26 children, one per letter. A word is a path from the root: `cat` goes root → c → a → t. Words with a common beginning share its path — `car` and `cat` share root → c → a.',
        'Insert walks the path, creating any missing nodes, and marks the last node as the end of a word. Search and startsWith both walk the path and fail if a letter is missing; the difference is that search also needs the end mark — `app` is a prefix of `apple` but only a word if it was inserted itself.',
      ],
      complexity: { time: 'O(L) per call — one step per letter', space: 'O(total letters inserted) — at most one node each' },
    },
    {
      slug: 'design-add-and-search-words-data-structure',
      number: 211,
      title: 'Design Add and Search Words Data Structure',
      difficulty: 'Medium',
      statement: [
        'Design a structure with `addWord(word)`, which stores a word, and `search(word)`, which says whether any stored word matches. In a search, the character `.` matches any one letter.',
      ],
      constraints: ['1 ≤ word.length ≤ 25', 'Stored words are lowercase letters; searches may also contain `.`', 'At most 2 dots in each search.', 'At most 10⁴ calls in total.'],
      idea: [
        'Store the words in a trie. A search with ordinary letters walks one path, as in Implement Trie.',
        'A `.` can be any letter, so at that point the search branches: it tries every child, and succeeds if any of them leads on to a match. This is depth-first search — following one choice all the way before trying the next. With at most two dots, a search visits at most 26 × 26 paths.',
      ],
      complexity: { time: 'O(L) to add; O(26ᵈ × L) to search with d dots', space: 'O(total letters stored)' },
    },
    {
      slug: 'word-search-ii',
      number: 212,
      title: 'Word Search II',
      difficulty: 'Hard',
      statement: [
        'Given an `m × n` grid of letters, `board`, and a list of `words`, return every word that can be traced on the board, in any order.',
        'A word is traced by moving between cells that touch horizontally or vertically, one letter per cell, using no cell twice in the same word.',
      ],
      constraints: ['1 ≤ m, n ≤ 12', '1 ≤ words.length ≤ 3 × 10⁴', '1 ≤ words[i].length ≤ 10', 'Only lowercase letters; the words are all different.'],
      idea: [
        'Searching the board once per word repeats the same walks thousands of times. Put all the words in one trie instead, and walk the board once: from each cell, a depth-first search follows the letters as long as the path spelled so far is a path in the trie.',
        'When the walk reaches a node where a word ends, that word is found; remove it from the node so it is reported once. A cell is marked while it is on the current path, so it is not reused. And once a trie branch has no words left below it, cut it off — later walks stop there at once.',
      ],
      complexity: { time: 'O(m · n · 4 · 3ᴸ⁻¹) — each start, then at most 3 new directions a step, L the longest word', space: 'O(total letters in words) — the trie' },
    },
  ],
};

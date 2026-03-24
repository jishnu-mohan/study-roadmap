# Tries (Prefix Trees)

**[SR]**

### What It Is

A **trie** (pronounced "try") is a tree-like data structure used for efficient storage and retrieval of strings. Each node represents a character, and paths from root to nodes represent prefixes.

Unlike a hash map of strings (which gives O(L) lookup where L is string length), a trie also supports **prefix queries** efficiently -- "give me all words starting with 'pre'" -- which a hash map cannot do without scanning all keys.

### How It Works Internally

```python
class TrieNode:
    def __init__(self):
        self.children = {}  # char -> TrieNode
        self.is_end = False  # marks end of a complete word

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end = True

    def search(self, word):
        node = self._find_node(word)
        return node is not None and node.is_end

    def starts_with(self, prefix):
        return self._find_node(prefix) is not None

    def _find_node(self, prefix):
        node = self.root
        for char in prefix:
            if char not in node.children:
                return None
            node = node.children[char]
        return node
```

**How it looks in memory** (inserting "cat", "car", "card"):

```
root
 |
 c
 |
 a
/ \
t   r
    |
    d

"cat"  -> c-a-t (end)
"car"  -> c-a-r (end)
"card" -> c-a-r-d (end)
```

Shared prefixes share nodes. This is the trie's main advantage.

**Space optimization -- compressed trie (Patricia trie / radix tree):**
- Merge chains of single-child nodes into one node with a multi-character label.
- Example: instead of c -> a -> r -> d, store "card" in fewer nodes.
- You will not be asked to implement this in interviews, but mentioning it shows depth.

### Operations and Complexity

| Operation | Time | Space |
|---|---|---|
| Insert word of length L | O(L) | O(L) worst case (new path) |
| Search word of length L | O(L) | - |
| Search prefix of length L | O(L) | - |
| Delete word of length L | O(L) | - |
| Total space for N words, avg length L | - | O(N * L) worst case, but shared prefixes reduce this |

### When to Use It

- **"Prefix matching"** or **"starts with"** --> trie.
- **"Autocomplete"** or **"type-ahead"** --> trie.
- **"Word search on a board"** where you explore multiple words simultaneously --> trie (much faster than checking each word individually).
- **"Longest common prefix"** --> trie.
- **"Dictionary of words"** with prefix operations --> trie beats hash set.

**When NOT to use a trie:** If you only need exact match lookup and do not care about prefixes, a hash set is simpler and often faster.

### Common Interview Patterns

1. **Basic trie operations**: Insert, search, starts_with (the Implement Trie problem itself).

2. **Word Search II** (Backtracking + Trie): Insert all target words into a trie. Do DFS on the grid, and as you explore, walk down the trie simultaneously. This prunes the search space massively because you stop exploring a path as soon as no word in the trie matches the prefix.

3. **Autocomplete system**: Trie with frequency counts at end nodes. For a given prefix, find the node, then DFS from there to collect all words and sort by frequency.

### Must-Know Problems

**Implement Trie (Prefix Tree)** (LeetCode 208)
- Approach: Direct implementation as shown above.
- Key insight: the children dictionary at each node maps characters to child nodes. The `is_end` flag distinguishes complete words from mere prefixes.

**Word Search II** (LeetCode 212)
- Approach: Build a trie from the word list. Backtrack on the grid while traversing the trie. When you reach an `is_end` node, you found a word.
- Key insight: without the trie, you would do a separate backtracking search for each word. With the trie, you search for all words simultaneously, sharing computation on common prefixes.
- Optimization: after finding a word, remove its `is_end` flag to avoid duplicates. Prune trie branches with no remaining words.

**Design Add and Search Words** (LeetCode 211)
- Approach: Trie with modified search that handles '.' wildcard by recursively trying all children at that position.
- Key insight: the '.' wildcard turns a single search path into a branching search, but the trie structure still limits the branches to only existing characters.

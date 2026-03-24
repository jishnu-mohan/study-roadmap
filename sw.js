const CACHE_NAME = 'study-roadmap-v1';

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/viewer.html',
  '/STUDY-GUIDE.md',
  '/00-master-roadmap.md',
  '/dsa/data-structures/00-complexity-reference.md',
  '/dsa/data-structures/01-arrays-and-strings.md',
  '/dsa/data-structures/02-hash-maps-and-sets.md',
  '/dsa/data-structures/03-linked-lists.md',
  '/dsa/data-structures/04-stacks-and-queues.md',
  '/dsa/data-structures/05-trees.md',
  '/dsa/data-structures/06-heaps.md',
  '/dsa/data-structures/07-graphs.md',
  '/dsa/data-structures/08-tries.md',
  '/dsa/data-structures/09-union-find.md',
  '/dsa/patterns/00-pattern-decision-tree.md',
  '/dsa/patterns/01-two-pointers.md',
  '/dsa/patterns/02-sliding-window.md',
  '/dsa/patterns/03-binary-search.md',
  '/dsa/patterns/04-bfs-dfs.md',
  '/dsa/patterns/05-dynamic-programming.md',
  '/dsa/patterns/06-backtracking.md',
  '/dsa/patterns/07-greedy.md',
  '/dsa/patterns/08-intervals.md',
  '/dsa/patterns/09-topological-sort.md',
  '/dsa/patterns/10-monotonic-stack.md',
  '/dsa/patterns/11-bit-manipulation.md',
  '/dsa/patterns/12-graph-algorithms.md',
  '/dsa/practice-problems.md',
  '/dsa/revision-cheatsheet.md',
  '/system-design/building-blocks/00-quick-reference.md',
  '/system-design/building-blocks/01-scalability.md',
  '/system-design/building-blocks/02-load-balancing.md',
  '/system-design/building-blocks/03-caching.md',
  '/system-design/building-blocks/04-cdn.md',
  '/system-design/building-blocks/05-database-selection.md',
  '/system-design/building-blocks/06-database-scaling.md',
  '/system-design/building-blocks/07-message-queues.md',
  '/system-design/building-blocks/08-api-gateway-rate-limiting.md',
  '/system-design/building-blocks/09-consistent-hashing.md',
  '/system-design/building-blocks/10-cap-theorem.md',
  '/system-design/building-blocks/11-microservices-vs-monolith.md',
  '/system-design/building-blocks/12-event-driven-architecture.md',
  '/system-design/building-blocks/13-blob-storage.md',
  '/system-design/building-blocks/14-search.md',
  '/system-design/building-blocks/15-monitoring-observability.md',
  '/system-design/hld-problems/01-url-shortener.md',
  '/system-design/hld-problems/02-rate-limiter.md',
  '/system-design/hld-problems/03-chat-messaging.md',
  '/system-design/hld-problems/04-news-feed.md',
  '/system-design/hld-problems/05-notification-system.md',
  '/system-design/hld-problems/06-distributed-cache.md',
  '/system-design/hld-problems/07-task-queue.md',
  '/system-design/hld-problems/08-product-catalog.md',
  '/system-design/hld-problems/09-analytics-dashboard.md',
  '/system-design/hld-problems/10-file-upload.md',
  '/system-design/hld-problems/11-search-autocomplete.md',
  '/system-design/hld-problems/12-event-driven-order-pipeline.md',
  '/system-design/lld-problems/01-parking-lot.md',
  '/system-design/lld-problems/02-lru-cache.md',
  '/system-design/lld-problems/03-rate-limiter.md',
  '/system-design/lld-problems/04-task-scheduler.md',
  '/system-design/lld-problems/05-pub-sub.md',
  '/system-design/lld-problems/06-order-state-machine.md',
  '/backend/apis/01-rest-api-design.md',
  '/backend/apis/02-graphql.md',
  '/backend/apis/03-grpc.md',
  '/backend/apis/04-websockets-sse.md',
  '/backend/apis/05-authentication.md',
  '/backend/apis/06-rate-limiting.md',
  '/backend/databases/01-postgresql.md',
  '/backend/databases/02-dynamodb.md',
  '/backend/databases/03-sql-vs-nosql.md',
  '/backend/databases/04-indexing-strategies.md',
  '/backend/databases/05-sharding-replication.md',
  '/backend/databases/06-interview-questions.md',
  '/backend/distributed-systems/01-consistency-models.md',
  '/backend/distributed-systems/02-distributed-transactions.md',
  '/backend/distributed-systems/03-consensus.md',
  '/backend/distributed-systems/04-idempotency.md',
  '/backend/distributed-systems/05-resilience-patterns.md',
  '/backend/distributed-systems/06-distributed-locking.md',
  '/backend/distributed-systems/07-event-sourcing-cqrs.md',
  '/backend/distributed-systems/08-observability.md',
  '/backend/distributed-systems/09-failure-modes.md',
  '/behavioral/star-stories.md',
  '/behavioral/common-questions.md',
  '/revision/spaced-repetition-tracker.md',
  'https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.1/marked.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/python.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/typescript.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/javascript.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/sql.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/bash.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/json.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/protobuf.min.js',
];

// Install: cache all files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: try network first (gets fresh content), fall back to cache (works offline)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

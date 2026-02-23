

## Plan: Fix TinyFish Integration Based on Official Best Practices

### Research Findings -- What We're Doing Wrong

After studying the TinyFish docs, API reference, cookbook examples (competitor-analysis, logistics-sentry), and our edge function code, I found **5 critical issues**:

---

### Issue 1: The Timeout is Broken (Most Critical Bug)

In `runTinyFishTask` at line 1094, we call `clearTimeout(timeout)` immediately after `fetch()` returns. But `fetch()` resolves when **HTTP headers arrive** -- NOT when the SSE stream finishes. The 120-second timeout protects only the initial connection, not the streaming phase. Once TinyFish starts streaming PROGRESS events, **our timeout has already been cleared** and the stream can run indefinitely (30+ minutes as you observed).

**Fix**: Move `clearTimeout` to AFTER the stream reading loop completes.

---

### Issue 2: No Concurrency Limit

TinyFish pricing:
- Pay-as-you-go: **2 concurrent agents**
- Standard ($15/mo): **4 concurrent agents**
- Pro ($150/mo): **20 concurrent agents**

We're launching all 8-12 tasks simultaneously with `tasks.forEach(async ...)`. If we're on Standard plan, TinyFish will queue/reject tasks beyond 4 concurrent, causing them to either hang waiting or fail.

**Fix**: Add a concurrency limiter (e.g., run at most 4 agents in parallel).

---

### Issue 3: Using "stealth" Mode for Everything

The docs show two browser profiles:
- `lite`: Standard browser -- faster, cheaper
- `stealth`: Anti-detection browser -- for bot-protected sites

We use `stealth` for everything, including Reddit and Hacker News which don't need it. Stealth mode is slower and costs more steps.

**Fix**: Use `lite` for open sites (Reddit, HN, Quora, Stack Overflow), `stealth` only for protected sites (G2, Capterra, Amazon).

---

### Issue 4: No Proxy for Geo-restricted/Protected Sites

The docs explicitly show proxy support for protected sites:
```
proxy_config: { enabled: true, country_code: "US" }
```

G2 and Capterra are blocking us with Cloudflare. TinyFish has built-in residential proxies at $0/GB (included in every plan). We're not using them.

**Fix**: Enable proxy for sites known to have Cloudflare protection.

---

### Issue 5: Goals Still Too Complex Despite Prompt Changes

Looking at the TinyFish cookbook examples, their goals are ultra-simple:
- "Extract the first 2 product names and prices"
- "Find the pricing page and extract all plan details"
- "Extract all products on this page. For each product return: name, price, and link"

Our Gemini classifier still generates goals like "Search reddit.com/r/SaaS for 'CRM frustrations', sort by Top Past Year, extract titles and top 3 comments from first 5 posts." This has multiple steps (search, sort, extract from multiple posts). TinyFish works best with **one page, one extraction**.

**Fix**: Pre-build the URL with search/filter parameters so TinyFish lands directly on the results page. Make the goal purely about extraction, not navigation.

---

### The Fix (5 Changes, 1 File)

All changes are in `supabase/functions/generate-report/index.ts`:

**Change 1: Fix the timeout bug**

Move `clearTimeout(timeout)` from line 1094 (after fetch) to inside the `finally` block of the try/catch in `runTinyFishTask`. Also re-arm the abort signal for the streaming phase:

```text
Before:
  const response = await fetch(..., { signal: controller.signal });
  clearTimeout(timeout);  // BUG: cleared before stream is read
  // ... reads stream for potentially 30+ minutes ...

After:
  const response = await fetch(..., { signal: controller.signal });
  // DON'T clear timeout here -- let it protect the stream too
  try {
    // ... read stream ...
  } finally {
    clearTimeout(timeout);  // Only clear after stream is done
  }
```

**Change 2: Add concurrency limiter**

Add a simple semaphore that limits parallel TinyFish calls to 4:

```text
async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  maxConcurrent: number
): Promise<T[]> {
  // Process tasks with at most maxConcurrent running at once
}
```

Use this in the scraping phase instead of `tasks.forEach(async ...)`.

**Change 3: Smart browser profile selection**

Add a map of which platforms need stealth vs lite:

```text
const STEALTH_PLATFORMS = new Set([
  "g2", "capterra", "trustpilot", "glassdoor",
  "amazon_reviews", "apple_app_store", "google_play_store"
]);

// In runTinyFishTask:
browser_profile: STEALTH_PLATFORMS.has(task.platform) ? "stealth" : "lite"
```

**Change 4: Enable proxy for protected sites**

Add proxy config for stealth platforms:

```text
const PROXY_PLATFORMS = new Set([
  "g2", "capterra", "trustpilot", "glassdoor",
  "amazon_reviews"
]);

// In the fetch body:
...(PROXY_PLATFORMS.has(task.platform) && {
  proxy_config: { enabled: true, country_code: "US" }
})
```

**Change 5: Restructure goals to be extraction-only**

Update the classification prompt to emphasize:
- The `url_or_query` field MUST be a fully-formed URL with search params already embedded (e.g., `https://www.reddit.com/r/SaaS/search/?q=CRM+frustrations&sort=top&t=year`)
- The `goal` field should ONLY describe what to extract from the page that loads, NOT how to navigate there
- Goal examples become:
  - "Extract the titles and top 3 comments from the first 5 posts visible on this page. Return as JSON."
  - "Extract the first 10 review texts, reviewer names, and star ratings visible on this page. Return as JSON."

This is the key architectural insight from the cookbook: TinyFish works best when you give it a **pre-built URL** and ask it to **extract from the current page** rather than navigate.

---

### Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Individual task time | Unlimited (30+ min observed) | Hard-capped at 120s (actually enforced) |
| Concurrent agents | All at once (exceeds plan limit) | 4 at a time (matches plan) |
| Protected site success | 0% (Cloudflare blocks) | Higher with proxy + stealth |
| Easy site speed | Slow (stealth overhead) | Faster (lite mode) |
| Goal complexity | Multi-step navigation | Single-page extraction |

### Files Modified

- `supabase/functions/generate-report/index.ts` (all 5 changes)


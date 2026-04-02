---
title: "Service Worker Blocking All External Images, Fonts, and Analytics on Production"
date: 2026-04-02
tags:
  - service-worker
  - pwa
  - production
  - csp
  - images
  - youtube
severity: critical
module: client / public / sw.js
symptom: "All external resources (MLB images, YouTube thumbnails, Google Fonts, PostHog) return 503 Offline on production; works on localhost"
root_cause: "Service worker fetch handler intercepted non-same-origin GET requests and returned 503 when fetch failed through SW proxy"
resolution_type: service-worker-configuration
affected_files:
  - client/public/sw.js
  - server/src/index.ts
related_features:
  - daily-diamond
  - mlb-feed
  - youtube-videos
commit: 9db7545
---

# Service Worker Blocking All External Images, Fonts, and Analytics on Production

## Problem Symptom

On production (`app.thefantasticleagues.com`), ALL external resources failed to load:
- MLB highlight thumbnails (`img.mlbstatic.com`) — Daily Diamond hero images blank
- MLB player headshots — blank throughout the app
- YouTube video thumbnails (`i.ytimg.com`) — video cards blank
- Google Fonts (`fonts.googleapis.com`) — fallback fonts used
- Google Sign-in (`accounts.google.com`) — sign-in widget broken
- PostHog analytics (`us.i.posthog.com`) — analytics not loading

Every external resource returned **`503 (Offline)`** in the browser console.

**On localhost, everything worked perfectly.** This was the critical clue.

## Investigation Steps

1. **Initial hypothesis: CSP (Content Security Policy)** — The `img-src` directive was missing MLB domains. Fixed by adding `https://img.mlbstatic.com` and `https://*.mlb.com` to helmet CSP config in `server/src/index.ts`. **This was necessary but not sufficient** — images still failed after deploy.

2. **Cloudflare cache purge** — Purged all cached content from Cloudflare dashboard. No improvement.

3. **Checked browser console errors** — ALL external domains returned `503 (Offline)`, not just images. Google Fonts, PostHog, YouTube thumbnails — everything. This ruled out CSP as the sole cause (CSP blocks with a different error message).

4. **Checked for Service Worker** — `navigator.serviceWorker.getRegistrations()` revealed an active service worker with scope `https://app.thefantasticleagues.com/`.

5. **Read `client/public/sw.js`** — Found the root cause.

## Root Cause Analysis

The service worker's `fetch` event handler intercepted ALL GET requests, including those to external domains:

```javascript
// BEFORE (broken)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET and API requests
  if (request.method !== 'GET' || request.url.includes('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => { /* cache same-origin responses */ })
      .catch(() =>
        caches.match(request).then(
          (cached) =>
            cached ||
            (request.mode === 'navigate'
              ? caches.match('/')
              : new Response('Offline', { status: 503, statusText: 'Offline' }))
        )
      )
  );
});
```

The problem chain:
1. Browser requests `https://img.mlbstatic.com/...` (external image)
2. Service worker intercepts the request (it's a GET and doesn't contain `/api/`)
3. SW attempts `fetch(request)` — this fails because the SW proxy can't properly handle cross-origin image requests (CORS/opaque response issues)
4. The `.catch()` handler fires
5. `caches.match(request)` returns `undefined` (never cached)
6. Since `request.mode !== 'navigate'`, it returns `new Response('Offline', { status: 503, statusText: 'Offline' })`

**Why it worked on localhost:** The Vite dev server doesn't register a service worker. The `sw.js` is only loaded from the static build served on production.

## Working Solution

Add a same-origin check before the service worker intercepts requests:

```javascript
// AFTER (fixed)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET, API requests, and external URLs
  if (request.method !== 'GET' || request.url.includes('/api/')) return;
  const isSameOrigin = new URL(request.url).origin === self.location.origin;
  if (!isSameOrigin) return;

  event.respondWith(
    fetch(request)
      .then((response) => { /* cache same-origin responses */ })
      .catch(() =>
        caches.match(request).then(
          (cached) =>
            cached ||
            (request.mode === 'navigate'
              ? caches.match('/')
              : new Response('Offline', { status: 503, statusText: 'Offline' }))
        )
      )
  );
});
```

Also bumped the cache name from `tfl-v2` to `tfl-v3` to force all clients to update their service worker on next page load.

### Secondary Fix: CSP `img-src`

Even with the SW fix, the CSP `img-src` directive was missing MLB domains. Added to `server/src/index.ts`:

```typescript
// BEFORE
imgSrc: ["'self'", "data:", "https://*.googleusercontent.com", "https://i.ytimg.com", "https://*.ytimg.com"],

// AFTER
imgSrc: ["'self'", "data:", "https://*.googleusercontent.com", "https://i.ytimg.com", "https://*.ytimg.com", "https://img.mlbstatic.com", "https://*.mlb.com"],
```

## Prevention Strategies

### 1. Service Workers Must Never Intercept External URLs

Any service worker `fetch` handler should start with:
```javascript
const isSameOrigin = new URL(request.url).origin === self.location.origin;
if (!isSameOrigin) return;
```

This is a universal rule. External CDN resources (images, fonts, analytics, auth) should always go directly to the network, never through the SW proxy.

### 2. CSP Must Include All Image Domains Before Launch

When adding a new feature that loads images from a new domain, add the domain to the CSP `img-src` directive at the same time. Checklist:
- MLB images: `img.mlbstatic.com`, `*.mlb.com`
- YouTube thumbnails: `i.ytimg.com`, `*.ytimg.com`
- Google profile photos: `*.googleusercontent.com`

### 3. Test on Production After Deploy

This bug was invisible on localhost because:
- Vite dev server doesn't register the service worker
- Vite dev server doesn't enforce CSP headers
- Both only apply in the production static build

**Always test on production** (or a staging environment that serves the static build) after deploying changes that affect external resources.

### 4. Test Cases

- After any SW change: verify `navigator.serviceWorker.getRegistrations()` returns updated SW
- After any CSP change: check browser console for blocked resource errors
- After adding external image sources: verify images load on production, not just localhost

## Related Documentation

- [CSP WebSocket and CDN Issues](../deployment/csp-websocket-and-cdn-issues.md) — prior CSP issue with WebSocket connections and CDN routing
- [Hardcoded API Paths / Cloudflare Cache Bypass](../deployment/hardcoded-api-paths-cloudflare-cache-bypass.md) — related production-only issue caused by Cloudflare proxying
- FEEDBACK.md Session 55 cont. — documents this fix

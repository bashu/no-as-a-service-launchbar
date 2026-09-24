/*
No-as-a-Service Action for LaunchBar
by Basil Shubin (@bashu)
2026-09-21

Copyright see: https://github.com/bashu/no-as-a-service-launchbar/blob/main/LICENSE

API: https://naas.isalman.dev/no
*/

var ENDPOINTS = [
  'https://naas.isalman.dev/no'                 // upstream
];
var CACHE_LIMIT = 20;
var TIMEOUT_SEC = 3;

function loadCache() {
  var c = Action.preferences.cache;
  return Array.isArray(c) ? c : [];
}

function saveCache(list) {
  Action.preferences.cache = list.slice(0, CACHE_LIMIT);
}

// Newest first, no duplicates, max CACHE_LIMIT
function remember(reason) {
  var cache = loadCache().filter(function (r) { return r !== reason; });
  cache.unshift(reason);
  saveCache(cache);
  return loadCache();
}

function fetchReason() {
  for (var i = 0; i < ENDPOINTS.length; i++) {
    try {
      var res = HTTP.getJSON(ENDPOINTS[i], { timeout: TIMEOUT_SEC });
      if (res && res.data && typeof res.data.reason === 'string' && res.data.reason.trim()) {
        return res.data.reason.trim();
      }
      if (res && res.error) LaunchBar.log('NaaS ' + ENDPOINTS[i] + ': ' + res.error);
    } catch (e) {
      LaunchBar.log('NaaS ' + ENDPOINTS[i] + ' exception: ' + e);
    }
  }
  return null;
}

function toItem(reason, subtitle) {
  return {
    title: reason,
    subtitle: subtitle,
    icon: 'no-sign',
    action: 'copyExcuse',
    actionArgument: reason,
    actionRunsInBackground: true,
    actionReturnsItems: false
  };
}

function run() {
  var fetched = fetchReason();
  var seenBefore = fetched && loadCache().indexOf(fetched) !== -1;
  var cache = fetched ? remember(fetched) : loadCache();

  if (!cache.length) {
    return [{ title: 'API unavailable and cache is empty', subtitle: 'Try again when online (nothing to copy)' }];
  }

  return cache.map(function (r, i) {
    if (fetched && i === 0) return toItem(r, (seenBefore ? 'Latest, seen before' : 'New excuse') + ' · Enter to copy');
    return toItem(r, (fetched ? 'Cached' : 'Offline, from cache') + ' · Enter to copy');
  });
}

// Called on every keystroke (LBLiveFeedbackEnabled); never hits the API.
function runWithString(query) {
  var cache = loadCache();
  var q = (query || '').toLowerCase().trim();

  if (!q) {
    if (!cache.length) return [{ title: 'No cached excuses yet', subtitle: 'Open without text to fetch one' }];
    return cache.map(function (r) { return toItem(r, 'Cached · Enter to copy'); });
  }

  var hits = cache.filter(function (r) { return r.toLowerCase().indexOf(q) !== -1; });
  if (!hits.length) {
    return [{
      title: 'No cached excuse matches "' + query + '"',
      subtitle: 'Search covers cached excuses only · open without text to fetch a new one'
    }];
  }
  return hits.map(function (r) { return toItem(r, 'Cached · Enter to copy'); });
}

function copyExcuse(reason) {
  LaunchBar.setClipboardString(reason);
  LaunchBar.hide();
}

// Adapter dispatcher.
// Iterates registered adapters in priority order; first one whose matches()
// returns true gets initialized. Loaded last in the content_scripts array, so
// all adapter files have already called RMP.registerAdapter() by this point.

(function () {
  const RMP = window.RMP;
  if (!RMP) {
    console.error("[RMP] common.js failed to load — extension will not run");
    return;
  }

  for (const adapter of RMP.adapters) {
    try {
      if (adapter.matches(window.location)) {
        adapter.init();
        return;
      }
    } catch (err) {
      console.error(`[RMP] adapter ${adapter.name} failed:`, err);
    }
  }
  // No adapter matched — quietly do nothing (manifest match patterns should
  // already gate this, but URL hash/path changes after load can drift).
})();

// Showroom mode for the hosted gallery: everything works except saving files. Export, Download, SVG and PNG are
// shown as they are in the kit, but clicking one only says so (like a showroom tap with no water behind it).
// Added to every page of preview/dist by scripts/build.mjs; the kit itself and the React test harness keep downloads.
(() => {
  if (window.__ltShowroom) return;
  window.__ltShowroom = true;
  const blocked = (a) => !!a && (a.hasAttribute('download') || /^(blob|data):/i.test(a.getAttribute('href') || ''));
  let el = null, timer = 0;
  const note = () => {
    const doc = document;
    if (!el) {
      el = doc.createElement('div');
      el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;inset-inline:0;bottom:24px;margin-inline:auto;width:max-content;max-width:calc(100vw - 32px);z-index:2147483647;padding:10px 16px;border-radius:999px;background:#1d1b19;color:#fbfaf7;font:500 14px/1.3 system-ui,sans-serif;box-shadow:0 6px 20px rgb(0 0 0 / 0.18);opacity:0;transition:opacity 160ms ease;pointer-events:none';
      doc.body.append(el);
    }
    el.textContent = 'This is a showroom: downloads are switched off here.';
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    clearTimeout(timer); timer = setTimeout(() => { el.style.opacity = '0'; }, 2200);
  };
  document.addEventListener('click', (e) => {
    const a = e.target instanceof Element ? e.target.closest('a') : null;
    if (blocked(a)) { e.preventDefault(); e.stopImmediatePropagation(); note(); }
  }, true);
  // Exports usually click an anchor that is never in the page.
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (blocked(this)) { note(); return; } return click.call(this); };
  const open = window.open;
  window.open = function (url, ...rest) { if (/^(blob|data):/i.test(String(url ?? ''))) { note(); return null; } return open.call(this, url, ...rest); };
})();

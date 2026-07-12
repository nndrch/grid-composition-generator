import { generate } from '../generate.js';
import { render } from '../render.js';
import { randomizeAll } from '../randomize.js';
import { prepareSVGString, exportPNG } from '../export.js';
import state from '../state.js';

export function initMobileNav({ canvasAPI, moduleAPI, gridAPI, genAPI }) {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const menuBtn = document.getElementById('mobile-menu');
  const exportBtn = document.getElementById('mobile-export');
  const diceBtn = document.getElementById('mobile-randomize');
  const genBtn  = document.getElementById('mobile-generate');

  const open  = () => { sidebar.classList.add('is-open');    overlay.hidden = false; };
  const close = () => { sidebar.classList.remove('is-open'); overlay.hidden = true; };

  menuBtn.addEventListener('click', open);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  exportBtn.addEventListener('click', async () => {
    try {
      const xml = prepareSVGString();
      const pngBlob = await exportPNG(xml, 1200, state.aspectWidth, state.aspectHeight);
      const file = new File([pngBlob], 'composition.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Grid Composition' });
      } else {
        // Fallback: trigger direct download
        const url = URL.createObjectURL(pngBlob);
        const a = Object.assign(document.createElement('a'), {
          href: url, download: 'composition.png',
        });
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      /* swallow — user can retry */
    }
  });

  diceBtn.addEventListener('click', () => {
    randomizeAll();
    generate();
    render();
    canvasAPI.refresh();
    moduleAPI.refresh();
    gridAPI.refresh();
    genAPI.refresh();
    genAPI.refreshMatrix();
  });

  genBtn.addEventListener('click', () => { generate(); render(); });
}

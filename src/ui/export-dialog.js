import { prepareSVGString, copySVGToClipboard, exportPNG } from '../export.js';
import { generate } from '../generate.js';
import { render } from '../render.js';
import state from '../state.js';

let _lastCount  = 1;
let _lastFormat = 'svg';
let _lastWidth  = 1200;

function triggerDownloads(blobs, format, count) {
  for (let i = 0; i < blobs.length; i++) {
    const url = URL.createObjectURL(blobs[i]);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: count === 1
        ? `composition.${format}`
        : `composition-${String(i + 1).padStart(2, '0')}.${format}`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }
}

async function runBatchExport(count, format, pngWidth) {
  const blobs = [];
  for (let i = 0; i < count; i++) {
    generate();
    render();
    const xml = prepareSVGString();
    if (format === 'svg') {
      blobs.push(new Blob([xml], { type: 'image/svg+xml' }));
    } else {
      blobs.push(await exportPNG(xml, pngWidth, state.aspectWidth, state.aspectHeight));
    }
  }
  triggerDownloads(blobs, format, count);
}

export function initExportDialog() {
  const dialog     = document.getElementById('export-dialog');
  const form       = dialog.querySelector('.export-form');
  const countSel   = document.getElementById('dialog-count');
  const pngWidthIn = document.getElementById('dialog-png-width');
  const heightOut  = document.getElementById('dialog-height-readout');
  const pngRow     = dialog.querySelector('.png-width-row');
  const cancelBtn  = document.getElementById('dialog-cancel');
  const copyBtn    = document.getElementById('dialog-copy');
  const formatRadios = form.querySelectorAll('input[name="format"]');

  function updateHeightReadout() {
    const w = parseInt(pngWidthIn.value, 10) || 1200;
    const h = Math.round(w * state.aspectHeight / state.aspectWidth);
    heightOut.textContent = `× ${h} px`;
  }

  function syncFormatVisibility() {
    const fmt = form.querySelector('input[name="format"]:checked').value;
    pngRow.classList.toggle('is-hidden', fmt !== 'png');
    updateHeightReadout();
  }

  formatRadios.forEach(r => r.addEventListener('change', syncFormatVisibility));
  pngWidthIn.addEventListener('input', updateHeightReadout);

  cancelBtn.addEventListener('click', () => dialog.close());

  copyBtn.addEventListener('click', async () => {
    const original = copyBtn.textContent;
    try {
      await copySVGToClipboard();
      copyBtn.textContent = '✓ Copied!';
    } catch {
      copyBtn.textContent = '✗ Failed';
    }
    setTimeout(() => { copyBtn.textContent = original; }, 1500);
  });

  form.addEventListener('submit', async () => {
    const count  = parseInt(countSel.value, 10);
    const format = form.querySelector('input[name="format"]:checked').value;
    const width  = Math.max(100, Math.min(8000, parseInt(pngWidthIn.value, 10) || 1200));

    _lastCount  = count;
    _lastFormat = format;
    _lastWidth  = width;

    await runBatchExport(count, format, width);
  });

  function open() {
    countSel.value = String(_lastCount);
    pngWidthIn.value = String(_lastWidth);
    const radio = form.querySelector(`input[name="format"][value="${_lastFormat}"]`);
    if (radio) radio.checked = true;
    syncFormatVisibility();
    dialog.showModal();
  }

  return { open };
}

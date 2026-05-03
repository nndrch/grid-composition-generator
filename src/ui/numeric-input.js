/**
 * Bidirectional slider + number input pair.
 * Returns { el, setValue, setDisabled }
 */
export function createNumericInput({ label, min, max, step = 1, value, onChange, disabled = false }) {
  const wrap = document.createElement('div');
  wrap.className = 'numeric-input';

  if (label) {
    const lbl = document.createElement('span');
    lbl.className = 'numeric-input__label';
    lbl.textContent = label;
    wrap.appendChild(lbl);
  }

  const range = document.createElement('input');
  range.type = 'range';
  range.className = 'numeric-input__range';
  range.min = min; range.max = max; range.step = step; range.value = value;
  range.disabled = disabled;
  if (label) range.setAttribute('aria-label', `${label} slider`);

  const num = document.createElement('input');
  num.type = 'number';
  num.className = 'numeric-input__number';
  num.min = min; num.max = max; num.step = step; num.value = value;
  num.disabled = disabled;
  if (label) num.setAttribute('aria-label', label);

  const clamp = v => Math.min(max, Math.max(min, isNaN(v) ? min : v));

  range.addEventListener('input', () => {
    const v = clamp(parseFloat(range.value));
    num.value = v;
    onChange(v);
  });

  num.addEventListener('change', () => {
    const v = clamp(parseFloat(num.value));
    num.value = v; range.value = v;
    onChange(v);
  });

  wrap.appendChild(range);
  wrap.appendChild(num);

  return {
    el: wrap,
    setValue(v) { range.value = v; num.value = v; },
    setDisabled(d) { range.disabled = d; num.disabled = d; },
  };
}

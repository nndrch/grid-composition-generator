import state from '../state.js';
import { createNumericInput } from './numeric-input.js';
import { initGrammarMatrix } from './grammar-matrix.js';

let _onGenerate = () => {};
let _grammarMatrix = null;
let _noiseInput, _symmetrySel, _rotationCheck, _grammarCheck, _grammarBtn;

export function initGenerationControls(sectionEl, { onGenerate }) {
  _onGenerate = onGenerate;

  const content = document.createElement('div');
  content.className = 'section-content generation-section';

  // Noise scale
  const noiseNI = createNumericInput({
    label: 'Noise scale', min: 0.05, max: 2.0, step: 0.01, value: state.noiseScale,
    onChange: v => { state.noiseScale = v; _onGenerate(); },
  });
  _noiseInput = noiseNI;
  content.appendChild(noiseNI.el);

  // Symmetry
  const symRow = document.createElement('div');
  symRow.className = 'select-row';
  const symLbl = document.createElement('span');
  symLbl.className = 'select-label'; symLbl.textContent = 'Symmetry';
  _symmetrySel = document.createElement('select');
  [['none', 'None'], ['mirrorX', 'Mirror X'], ['mirrorY', 'Mirror Y'], ['fourFold', '4-fold']].forEach(([val, txt]) => {
    const opt = document.createElement('option');
    opt.value = val; opt.textContent = txt;
    if (val === state.symmetry) opt.selected = true;
    _symmetrySel.appendChild(opt);
  });
  _symmetrySel.addEventListener('change', () => {
    state.symmetry = _symmetrySel.value;
    _onGenerate();
  });
  symRow.appendChild(symLbl);
  symRow.appendChild(_symmetrySel);
  content.appendChild(symRow);

  // Rotation toggle
  const rotRow = document.createElement('label');
  rotRow.className = 'checkbox-row';
  _rotationCheck = document.createElement('input');
  _rotationCheck.type = 'checkbox';
  _rotationCheck.checked = state.rotationEnabled;
  _rotationCheck.addEventListener('change', () => { state.rotationEnabled = _rotationCheck.checked; });
  rotRow.appendChild(_rotationCheck);
  rotRow.appendChild(document.createTextNode(' Rotation'));
  content.appendChild(rotRow);

  // Grammar toggle + edit button row
  const grammarRow = document.createElement('div');
  grammarRow.className = 'grammar-toggle-row';

  const grammarCheck = document.createElement('label');
  grammarCheck.className = 'checkbox-row';
  _grammarCheck = document.createElement('input');
  _grammarCheck.type = 'checkbox';
  _grammarCheck.checked = state.grammarEnabled;
  _grammarCheck.addEventListener('change', () => { state.grammarEnabled = _grammarCheck.checked; });
  grammarCheck.appendChild(_grammarCheck);
  grammarCheck.appendChild(document.createTextNode(' Grammar'));

  _grammarBtn = document.createElement('button');
  _grammarBtn.type = 'button';
  _grammarBtn.className = 'edit-grammar-btn';
  _grammarBtn.textContent = 'Edit transitions →';
  _grammarBtn.addEventListener('click', () => { _grammarMatrix.toggle(); });

  grammarRow.appendChild(grammarCheck);
  grammarRow.appendChild(_grammarBtn);
  content.appendChild(grammarRow);

  sectionEl.appendChild(content);

  // Grammar matrix panel (appended inside the section element, after content)
  const matrixContent = document.createElement('div');
  matrixContent.className = 'section-content';
  _grammarMatrix = initGrammarMatrix(matrixContent);
  sectionEl.appendChild(matrixContent);

  return {
    refresh() {
      noiseNI.setValue(state.noiseScale);
      _symmetrySel.value     = state.symmetry;
      _rotationCheck.checked = state.rotationEnabled;
      _grammarCheck.checked  = state.grammarEnabled;
    },
    refreshMatrix() { _grammarMatrix.refresh(); },
  };
}

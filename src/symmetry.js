// Steps: 0=TL, 1=TR, 2=BR, 3=BL
// flipX (mirror across vertical axis):  step ^ 1
// flipY (mirror across horizontal axis): 3 - step
// both:                                  (step + 2) % 4

export function applyFlipStep(step, flipX, flipY) {
  if (flipX && flipY) return (step + 2) % 4;
  if (flipX) return step ^ 1;
  if (flipY) return 3 - step;
  return step;
}

export function resolveSource(col, row, state) {
  const halfCols = Math.ceil(state.cols / 2);
  const halfRows = Math.ceil(state.rows / 2);
  let sourceCol = col, sourceRow = row, flipX = false, flipY = false;

  if ((state.symmetry === 'mirrorX' || state.symmetry === 'fourFold') && col >= halfCols) {
    sourceCol = state.cols - 1 - col;
    flipX = true;
  }
  if ((state.symmetry === 'mirrorY' || state.symmetry === 'fourFold') && row >= halfRows) {
    sourceRow = state.rows - 1 - row;
    flipY = true;
  }
  return { sourceCol, sourceRow, flipX, flipY };
}

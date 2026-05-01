import { generate } from './generate.js';
import { render } from './render.js';

generate();
render();

document.getElementById('generate').addEventListener('click', () => {
  generate();
  render();
});

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PLANTUML_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

function encode6bit(b) {
  if (b < 64) return PLANTUML_ALPHABET[b];
  return '?';
}

function append3bytes(b1, b2, b3) {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3f;
  return encode6bit(c1 & 0x3f) + encode6bit(c2 & 0x3f) + encode6bit(c3 & 0x3f) + encode6bit(c4 & 0x3f);
}

function encodePlantUml(text) {
  const compressed = zlib.deflateRawSync(Buffer.from(text, 'utf8'), { level: 9 });
  let res = '';
  for (let i = 0; i < compressed.length; i += 3) {
    if (i + 2 === compressed.length) {
      res += append3bytes(compressed[i], compressed[i + 1], 0);
    } else if (i + 1 === compressed.length) {
      res += append3bytes(compressed[i], 0, 0);
    } else {
      res += append3bytes(compressed[i], compressed[i + 1], compressed[i + 2]);
    }
  }
  return res;
}

const diagramsDir = path.join(__dirname, '../docs/diagrams');
const files = [
  'activity-end-to-end.puml',
  'sequence-checkout.puml',
  'class-diagram.puml',
  'deployment-diagram.puml'
];

async function render() {
  for (const file of files) {
    const pumlPath = path.join(diagramsDir, file);
    const svgPath = path.join(diagramsDir, file.replace('.puml', '.svg'));
    if (!fs.existsSync(pumlPath)) continue;

    const content = fs.readFileSync(pumlPath, 'utf8');
    const encoded = encodePlantUml(content);
    console.log(`Rendering ${file}...`);
    try {
      const res = await fetch(`https://www.plantuml.com/plantuml/svg/${encoded}`);
      if (res.ok) {
        const svg = await res.text();
        if (!svg.includes('<svg') || svg.includes('bad URL') || svg.includes('Syntax Error')) {
          throw new Error('PlantUML returned an error SVG instead of a valid diagram');
        }
        fs.writeFileSync(svgPath, svg, 'utf8');
        console.log(`✅ Saved SVG: ${svgPath} (${svg.length} bytes)`);
      } else {
        console.error(`❌ Failed to render ${file}: HTTP ${res.status}`);
      }
    } catch (err) {
      console.error(`❌ Error rendering ${file}:`, err.message);
    }
  }
}

render();


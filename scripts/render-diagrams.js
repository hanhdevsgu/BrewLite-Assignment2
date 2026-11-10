const fs = require('fs');
const path = require('path');

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
    const hex = Buffer.from(content, 'utf8').toString('hex');
    console.log(`Rendering ${file}...`);
    try {
      const res = await fetch(`https://www.plantuml.com/plantuml/svg/~h${hex}`);
      if (res.ok) {
        const svg = await res.text();
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

const fs = require('fs');
const crypto = require('crypto');

const p = 'public/extracted_figures/4d702ea1-d284-4f69-9f5f-fc296e80a318/chunks_with_embeddings.json';
const data = JSON.parse(fs.readFileSync(p, 'utf8'));

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let fixed = 0;
data.forEach(c => {
  if (!c.id || !uuidRegex.test(c.id)) {
    c.id = crypto.randomUUID();
    fixed++;
  }
});

fs.writeFileSync(p, JSON.stringify(data), 'utf8');
console.log(`Ensured valid UUIDs across all ${data.length} chunks (assigned ${fixed} new UUIDs).`);
const nonZero = data.filter(c => c.embedding && !c.embedding.every(x => x === 0));
console.log(`Valid embedded chunks in file: ${nonZero.length}`);


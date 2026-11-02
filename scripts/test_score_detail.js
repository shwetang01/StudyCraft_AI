const fs = require('fs');
const chunks = JSON.parse(fs.readFileSync('public/extracted_figures/4d702ea1-d284-4f69-9f5f-fc296e80a318/chunks_with_embeddings.json', 'utf-8'));
const c315 = chunks.find(c => c.chunk_index === 315);
const c316 = chunks.find(c => c.chunk_index === 316);

function testScore(chunk, sem) {
  const contentLower = chunk.content.toLowerCase();
  const rawQuery = "Explain Newton's second law of motion.";
  const queryLower = rawQuery.toLowerCase();
  const queryTerms = ['newton', 'second', 'law', 'motion'];

  let matchedTerms = 0;
  for (const term of queryTerms) {
    if (contentLower.includes(term)) matchedTerms++;
  }
  const termRatio = matchedTerms / queryTerms.length;
  let keywordScore = termRatio * 0.40;

  const phrases = [
    "newton's second law",
    "newtons second law",
    "second law of motion",
    "second law",
    "fnet = ma",
    "f_net = ma",
    "f = ma",
  ];
  let matchedPhrase = null;
  for (const phrase of phrases) {
    if (queryLower.includes(phrase) && contentLower.includes(phrase)) {
      keywordScore += 0.35;
      matchedPhrase = phrase;
      break;
    }
  }

  let hasFormula = false;
  if (/\bfnet\b|\bf_net\b|\bmax\b|\bmay\b|\bmaz\b|\bf\s*=\s*ma\b/i.test(chunk.content)) {
    keywordScore += 0.15;
    hasFormula = true;
  }

  let hasDefTerms = false;
  if (/\bnet force\b/i.test(chunk.content) && /\bacceleration\b/i.test(chunk.content)) {
    keywordScore += 0.10;
    hasDefTerms = true;
  }

  console.log('Chunk', chunk.chunk_index, 'matchedTerms:', matchedTerms, 'matchedPhrase:', matchedPhrase, 'hasFormula:', hasFormula, 'hasDefTerms:', hasDefTerms, 'keywordScore:', keywordScore);
}

testScore(c315, 0.6814);
testScore(c316, 0.6650);


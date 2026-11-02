const badJson = `{
  "answer": "Here is Newton's law: $\\\\vec{F}_{\\\\text{net}} = m\\\\vec{a}$ and component form $\\\\vec{v}$",
  "test": "Illegal escape: \\vec{F} and \\alpha and \\Delta"
}`;

// If Gemini produces \vec (single backslash before v):
const rawGemini = `{
  "answer": "Here is $\\vec{F}_{\\text{net}} = m\\vec{a}$",
  "isInsufficient": true
}`;

function sanitizeJsonEscapes(str) {
  // Replace any backslash that is NOT followed by valid escape chars: ", \, /, b, f, n, r, t, or uXXXX
  return str.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
}

const fixed = sanitizeJsonEscapes(rawGemini);
console.log('Fixed string:');
console.log(fixed);
const parsed = JSON.parse(fixed);
console.log('Parsed successfully:', parsed);


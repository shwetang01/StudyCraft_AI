const rawFromGemini = '{"answer": "equation: $$\\\\vec{F}_{\\\\text{net}} = m\\\\vec{a} \\\\quad (5.1.1)$$, and $F_{\\\\text{net},x} = m a_x, \\\\quad F_{\\\\text{net},y} = m a_y$"}';

// Test 1: already escaped
const replaced1 = rawFromGemini.replace(/(?<!\\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
console.log('Replaced 1:', replaced1);
JSON.parse(replaced1);
console.log('Parse 1 succeeded!');

// Test 2: raw unescaped single backslash before v
const rawUnescaped = '{"answer": "here is \\vec{F} and \\alpha and \\Delta"}';
const replaced2 = rawUnescaped.replace(/(?<!\\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
console.log('Replaced 2:', replaced2);
JSON.parse(replaced2);
console.log('Parse 2 succeeded!');

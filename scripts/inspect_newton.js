const http = require('http');

const data = JSON.stringify({
  question: "Explain Newton's second law of motion."
});

const req = http.request('http://localhost:3000/api/books/4d702ea1-d284-4f69-9f5f-fc296e80a318/ask', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      console.log('Success:', json.success);
      console.log('\n=== ANSWER ===\n', json.data?.answer);
      console.log('\n=== CITATIONS ===\n', JSON.stringify(json.data?.citations, null, 2));
      console.log('\n=== SUPPORTING QUOTES ===\n', JSON.stringify(json.data?.supporting_quotes, null, 2));
      console.log('\n=== RETRIEVED CHUNKS COUNT ===', json.data?.retrieved_chunks?.length);
      if (json.data?.retrieved_chunks) {
        json.data.retrieved_chunks.forEach((c, idx) => {
          console.log(`\n--- CHUNK ${idx + 1} (ID: ${c.id}, Page: ${c.printed_page_number}, PDF: ${c.pdf_page_index}) ---`);
          console.log(c.content);
        });
      }
    } catch (e) {
      console.log('Error parsing response:', e.message, body);
    }
  });
});

req.write(data);
req.end();


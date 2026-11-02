const http = require('http');

const data = JSON.stringify({
  question: "What does Figure 2.5.1 demonstrate about a feather and an apple in free fall?"
});

const req = http.request('http://localhost:3000/api/books/4d702ea1-d284-4f69-9f5f-fc296e80a318/ask', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const json = JSON.parse(body);
    console.log('Success:', json.success);
    console.log('Answer excerpt:', json.data?.answer?.slice(0, 200));
    console.log('Figures returned:', json.data?.figures);
  });
});

req.write(data);
req.end();


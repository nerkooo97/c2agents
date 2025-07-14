// A simple MCP-compatible server that uppercases text.
process.stdin.setEncoding('utf8');

process.stdin.on('data', (data) => {
  try {
    const req = JSON.parse(data);
    // Assuming the tool expects an input object with a 'text' property
    const text = req.text || ''; 
    process.stdout.write(JSON.stringify({ result: text.toUpperCase() }) + '\n');
  } catch (e) {
    process.stdout.write(JSON.stringify({ error: 'Invalid input' }) + '\n');
  }
});

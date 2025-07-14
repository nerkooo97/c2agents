process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
  try {
    const req = JSON.parse(data);
    const text = req.text || '';
    process.stdout.write(JSON.stringify({ result: text.toUpperCase() }) + '\n');
  } catch (e) {
    process.stdout.write(JSON.stringify({ error: 'Invalid input' }) + '\n');
  }
}); 
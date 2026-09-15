const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PLAYWRIGHT_PORT || 4173);
const contentTypes = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript'
};

http.createServer((request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = path.resolve(root, `.${requested}`);

  if (!file.startsWith(root + path.sep)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(file, (error, contents) => {
    if (error) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    response.writeHead(200, { 'Content-Type': contentTypes[path.extname(file)] || 'application/octet-stream' });
    response.end(contents);
  });
}).listen(port, '127.0.0.1');

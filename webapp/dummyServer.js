/**
 * @file dummyServer.js
 * @description
 * Questo server HTTP semplice risponde alle richieste di health check di Render.
 * Serve solo a "ingannare" Render per farlo credere che ci sia una porta aperta,
 * evitando così che il processo worker venga terminato.
 */

const http = require('http');
const port = process.env.PORT || 10000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK\n');
}).listen(port, () => {
  console.log(`Dummy server listening on port ${port}`);
});

#!/usr/bin/env node

const express = require('./node_modules/express');
const cors = require('./node_modules/cors');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./config');

const port = 6767;
const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  const repoName = path.basename(ROOT);
  res.json({ message: 'Bonzai Server', status: 'running', repoName });
});

// Dynamically load handlers based on what exists
const handlersDir = path.join(__dirname, 'handlers');

function tryLoad(name) {
  const filePath = path.join(handlersDir, name + '.js');
  if (fs.existsSync(filePath)) {
    return require(filePath);
  }
  return null;
}

// Visualization loop handlers (legacy, now part of readwrite)

// Readwrite loop handlers
const listHandler = tryLoad('list');
const readHandler = tryLoad('read');
const detectClaudeHandler = tryLoad('detect-claude');
const deleteHandler = tryLoad('delete');
const writeHandler = tryLoad('write');

if (listHandler) app.get('/list', listHandler);
if (readHandler) app.get('/read', readHandler);
if (detectClaudeHandler) app.get('/detect-claude', detectClaudeHandler);
if (deleteHandler) app.post('/delete', deleteHandler);
if (writeHandler) app.post('/write', writeHandler);

// Backend loop handlers
const shutdownHandler = tryLoad('shutdown');
const terminalHandlers = tryLoad('terminal');

if (shutdownHandler) app.post('/shutdown', shutdownHandler);
if (terminalHandlers) {
  const { WebSocketServer } = require('./node_modules/ws');
  const wss = new WebSocketServer({ server, path: '/terminal' });
  terminalHandlers.setupTerminalWebSocket(wss);
  app.get('/terminal', terminalHandlers.terminalHandler);
}

// Catch-all for SPA routing - serve HTML shell for any non-API route
app.get('*', (req, res) => {
  const repoName = path.basename(ROOT);
  const host = req.get('X-Forwarded-Host') || req.get('Host') || `localhost:${port}`;
  const protocol = req.get('X-Forwarded-Proto') || 'http';
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bonzai - ${repoName}</title>
  <link rel="stylesheet" href="https://bonzai.dev/app.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #root { height: 100%; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    window.BONZAI_REPO = "${repoName}";
    window.BONZAI_API = "${protocol}://${host}";
  </script>
  <script src="https://bonzai.dev/app.js"></script>
</body>
</html>`);
});

server.listen(port, () => {
  console.log('File server running on http://localhost:' + port + "/visualize");
});

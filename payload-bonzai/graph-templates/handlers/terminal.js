console.log(`[Terminal] Node version: ${process.version}`);
console.log(`[Terminal] Platform: ${process.platform} ${process.arch}`);

let pty;
try {
  pty = require('node-pty');
  console.log('[Terminal] node-pty loaded successfully');
} catch (err) {
  console.error('[Terminal] Failed to load node-pty:', err.message);
  console.error('[Terminal] This usually means node-pty native binaries failed to install.');
  console.error('[Terminal] Try running: cd bonzai && npm rebuild node-pty');
  pty = null;
}

// Store active terminal sessions
const terminals = new Map();

// Get default shell based on platform
function getDefaultShell() {
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'powershell.exe';
  }
  // Prefer SHELL env var, but always use full path
  const shell = process.env.SHELL || '/bin/bash';
  // Ensure we have a full path
  if (!shell.startsWith('/')) {
    return '/bin/bash';
  }
  return shell;
}

// Create a new terminal session
function createTerminal(sessionId, cols = 80, rows = 24) {
  if (!pty) {
    throw new Error('node-pty is not available. Native binaries may not have installed correctly.');
  }

  const shell = getDefaultShell();
  const cwd = process.env.HOME || process.cwd();

  console.log(`[Terminal] Spawning shell: ${shell}`);
  console.log(`[Terminal] Working directory: ${cwd}`);
  console.log(`[Terminal] PATH: ${process.env.PATH}`);

  let ptyProcess;
  try {
    ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
      }
    });
  } catch (spawnErr) {
    console.error('[Terminal] pty.spawn failed:', spawnErr);
    console.error('[Terminal] Error code:', spawnErr.code);
    console.error('[Terminal] Error errno:', spawnErr.errno);
    // Try with /bin/bash as fallback
    console.log('[Terminal] Retrying with /bin/bash...');
    try {
      ptyProcess = pty.spawn('/bin/bash', [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
        }
      });
    } catch (bashErr) {
      console.error('[Terminal] /bin/bash also failed:', bashErr);
      throw spawnErr; // throw original error
    }
  }

  terminals.set(sessionId, {
    pty: ptyProcess,
    buffer: ''
  });

  return ptyProcess;
}

// HTTP handler for terminal info
function terminalHandler(req, res) {
  res.json({
    message: 'Terminal WebSocket API',
    usage: {
      websocket: 'ws://localhost:3001/terminal',
      events: {
        'input': 'Send terminal input (data: string)',
        'resize': 'Resize terminal (cols: number, rows: number)',
        'output': 'Receive terminal output'
      }
    }
  });
}

// WebSocket handler for terminal sessions
function setupTerminalWebSocket(wss) {
  wss.on('connection', (ws) => {
    const sessionId = Date.now().toString();
    let ptyProcess;

    try {
      ptyProcess = createTerminal(sessionId);
      console.log(`Terminal session ${sessionId} started`);
    } catch (err) {
      console.error('Failed to create terminal:', err.message);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to create terminal: ' + err.message }));
      ws.close();
      return;
    }

    // Send terminal output to WebSocket client
    ptyProcess.onData((data) => {
      try {
        ws.send(JSON.stringify({ type: 'output', data }));
      } catch (e) {
        // Client disconnected
      }
    });

    ptyProcess.onExit(({ exitCode }) => {
      ws.send(JSON.stringify({ type: 'exit', exitCode }));
      ws.close();
    });

    // Handle incoming messages from client
    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message);

        switch (msg.type) {
          case 'input':
            ptyProcess.write(msg.data);
            break;
          case 'resize':
            ptyProcess.resize(msg.cols, msg.rows);
            break;
        }
      } catch (e) {
        console.error('Terminal message error:', e);
      }
    });

    // Cleanup on disconnect
    ws.on('close', () => {
      console.log(`Terminal session ${sessionId} closed`);
      ptyProcess.kill();
      terminals.delete(sessionId);
    });
  });
}

module.exports = { terminalHandler, setupTerminalWebSocket };

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3030;
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.woff': 'application/font-woff',
  '.woff2': 'application/font-woff2',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm',
  '.mjs': 'application/javascript',
};

const server = http.createServer((req, res) => {
  console.log(`\n${req.method} ${req.url}`);
  
  // Parse URL
  const parsedUrl = url.parse(req.url);
  // Extract URL path
  let pathname = parsedUrl.pathname || '/';
  
  // If the path is root, serve index.html
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }
  
  // Remove leading slash for filesystem operations
  let filePath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
  filePath = path.join(__dirname, filePath);
  
  console.log(`Request for: ${pathname}`);
  console.log(`Looking for file at: ${filePath}`);
  
  // Prevent directory traversal attacks
  if (!filePath.startsWith(__dirname + path.sep)) {
    console.error('Blocked path traversal attempt:', filePath);
    res.writeHead(403);
    return res.end('Forbidden');
  }
  
  // Get the file extension
  const extname = String(path.extname(pathname)).toLowerCase();
  
  // Default content type
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  // Read file from file system
  fs.readFile(filePath, (error, content) => {
    if (error) console.error('File read error:', error);
    if (error) {
      if (error.code === 'ENOENT') {
        // Page not found
        fs.readFile('./404.html', (error, content) => {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(content || '404 Not Found', 'utf-8');
        });
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      // Success - serve the file
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Service-Worker-Allowed': '/',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log('\nTo test on mobile devices on the same network:');
  console.log('1. Make sure your phone is connected to the same WiFi network');
  console.log('2. Find your computer\'s local IP address:');
  console.log('   - On Mac: System Preferences > Network > WiFi > Advanced > TCP/IP > IPv4 Address');
  console.log('   - On Windows: ipconfig in Command Prompt > Look for "IPv4 Address" under your WiFi adapter');
  console.log(`3. Open http://YOUR_LOCAL_IP:${PORT} on your mobile device`);
  console.log('\nPress Ctrl+C to stop the server');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  process.exit(0);
});

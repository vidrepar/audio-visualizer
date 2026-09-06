/**
 * Static file server for local development. No dependencies: the site is
 * plain HTML, CSS and ES modules, so it only needs correct content types.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = process.env.PORT || 3010;
const root = __dirname;

const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.mp3': 'audio/mpeg',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.json': 'application/json'
};

http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const requested = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = path.join(root, path.normalize(requested));

    // Refuse anything that escaped the project directory.
    if (!file.startsWith(root)) {
        response.writeHead(403).end('Forbidden');
        return;
    }

    fs.readFile(file, (error, data) => {
        if (error) {
            response.writeHead(404).end('Not found');
            return;
        }

        response.writeHead(200, {
            'Content-Type': contentTypes[path.extname(file)] || 'application/octet-stream'
        });
        response.end(data);
    });
}).listen(port, () => {
    console.log(`Serving http://localhost:${port}`);
});

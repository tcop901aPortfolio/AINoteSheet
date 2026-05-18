if (typeof window === 'undefined') {
    const http = require('http');
    const fs = require('fs');
    const path = require('path');

    const port = 2800;
    const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.txt': 'text/plain; charset=utf-8',
    };

    const server = http.createServer((request, response) => {
        const requestPath = request.url === '/' ? '/index.html' : request.url;
        const safePath = path.normalize(requestPath).replace(/^\/+/, '');
        const filePath = path.join(__dirname, safePath);

        if (!filePath.startsWith(__dirname)) {
            response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
            response.end('Forbidden');
            return;
        }

        fs.readFile(filePath, (error, data) => {
            if (error) {
                response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                response.end('Not found');
                return;
            }

            const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
            response.writeHead(200, { 'Content-Type': contentType });
            response.end(data);
        });
    });

    server.listen(port, () => {
        console.log(`Note Sheet running at http://localhost:${port}`);
    });
}
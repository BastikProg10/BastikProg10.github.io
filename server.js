const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');

const PORT = 3000;
const DATA_FILE = './links.json';

// Читаем JSON из файла или создаём пустой
function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '{}');
  }
  const raw = fs.readFileSync(DATA_FILE);
  return JSON.parse(raw);
}

// Записываем JSON в файл
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Простая генерация кода (8 символов, буквы+цифры)
function generateCode() {
  return Math.random().toString(36).substring(2, 10);
}

// Отдаём статические файлы из папки public
function serveStaticFile(req, res) {
  let filePath = '.' + req.url;
  if (filePath === './') filePath = './public/index.html';

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, function(error, content) {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // API для создания био-ссылки
  if (req.method === 'POST' && parsedUrl.pathname === '/createBio') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { text, color } = JSON.parse(body);
        if (!text || !color) {
          res.writeHead(400);
          return res.end('Missing fields');
        }

        const data = readData();
        const uid = generateCode();
        data[uid] = { text, color };
        writeData(data);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ uid }));
      } catch {
        res.writeHead(400);
        return res.end('Invalid JSON');
      }
    });
  }

  // Страница био по коду: /startapp?startapp=код
  else if (req.method === 'GET' && parsedUrl.pathname === '/startapp') {
    const uid = parsedUrl.query.startapp;
    if (!uid) {
      res.writeHead(400);
      return res.end('Code required');
    }
    const data = readData();
    const bio = data[uid];
    if (!bio) {
      res.writeHead(404);
      return res.end('Bio not found');
    }

    // Отдаём простую HTML с био
    const html = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8" />
      <title>Bio Link</title>
      <style>
        body {
          background-color: ${bio.color};
          color: #fff;
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
        }
        .container {
          background: rgba(0,0,0,0.4);
          padding: 30px;
          border-radius: 10px;
          font-size: 24px;
          text-align: center;
          max-width: 400px;
          word-wrap: break-word;
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${bio.text}
      </div>
    </body>
    </html>
    `;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(html);
  }

  // Отдаём статику из /public
  else {
    serveStaticFile(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

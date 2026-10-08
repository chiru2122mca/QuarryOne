const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve("dist");
http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    let file = path.resolve(root, "." + (url === "/" ? "/index.html" : url));
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      return res.end();
    }
    if (!fs.existsSync(file))
      file = fs.existsSync(file + ".html")
        ? file + ".html"
        : path.join(root, "index.html");
    const types = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".png": "image/png",
      ".css": "text/css",
      ".ico": "image/x-icon",
      ".ttf": "font/ttf",
    };
    res.setHeader(
      "Content-Type",
      types[path.extname(file)] || "application/octet-stream",
    );
    fs.createReadStream(file)
      .on("error", () => {
        res.statusCode = 404;
        res.end("Preview rebuilding. Reload shortly.");
      })
      .pipe(res);
  })
  .listen(8082, "127.0.0.1", () =>
    console.log("Preview: http://127.0.0.1:8082"),
  );

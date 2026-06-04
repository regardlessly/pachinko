FROM python:3.11-slim
WORKDIR /app
COPY index.html .
CMD python -c "import http.server, os; http.server.HTTPServer(('', int(os.environ.get('PORT', 8080))), type('H', (http.server.SimpleHTTPRequestHandler,), {'directory': '/app'})).serve_forever()"

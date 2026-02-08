#!/usr/bin/env python3
"""
Serveur API minimal pour test de déploiement
Sans dépendances externes - Python pur
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
from datetime import datetime
from urllib.parse import urlparse, parse_qs

class TestAPIHandler(BaseHTTPRequestHandler):
    """Handler pour l'API de test"""

    def _send_json_response(self, data, status=200):
        """Envoyer une réponse JSON"""
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode())

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        """Handle GET requests"""
        path = urlparse(self.path).path

        if path == '/':
            self._send_json_response({
                "message": "Dream AI Girl API - Test Server",
                "version": "1.0.0-test",
                "status": "operational",
                "docs": "/docs",
                "endpoints": [
                    "GET /",
                    "GET /health",
                    "GET /ping",
                    "GET /api/v1/test",
                    "POST /api/v1/auth/register (test)"
                ],
                "timestamp": datetime.utcnow().isoformat()
            })

        elif path == '/health':
            self._send_json_response({
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat(),
                "services": {
                    "api": "up",
                    "mode": "test"
                },
                "note": "Test deployment - Python HTTP server"
            })

        elif path == '/ping':
            self._send_json_response({
                "ping": "pong",
                "timestamp": datetime.utcnow().isoformat()
            })

        elif path == '/api/v1/test':
            self._send_json_response({
                "status": "ok",
                "message": "API Gateway fonctionnel! ✓",
                "features": [
                    "✓ API REST basique",
                    "✓ Health checks",
                    "✓ CORS enabled",
                    "✓ JSON responses",
                    "✓ Mode test (sans DB)"
                ],
                "next_steps": [
                    "1. Tester: curl http://localhost:8000/health",
                    "2. Voir docs: http://localhost:8000/docs (si FastAPI)",
                    "3. Déployer production: docker-compose up"
                ]
            })

        elif path == '/docs':
            self._send_json_response({
                "note": "Documentation FastAPI non disponible en mode test",
                "available_endpoints": {
                    "GET /": "Root info",
                    "GET /health": "Health check",
                    "GET /ping": "Ping test",
                    "GET /api/v1/test": "Test endpoint",
                    "POST /api/v1/auth/register": "Register (test mode)"
                },
                "upgrade": "Pour docs complètes, installer FastAPI: pip install fastapi uvicorn"
            })

        else:
            self._send_json_response({
                "error": "Not found",
                "path": path,
                "available_endpoints": ["/", "/health", "/ping", "/api/v1/test"]
            }, status=404)

    def do_POST(self):
        """Handle POST requests"""
        path = urlparse(self.path).path

        if path == '/api/v1/auth/register':
            # Lire body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode() if content_length > 0 else '{}'

            try:
                data = json.loads(body)
                username = data.get('username', 'testuser')

                self._send_json_response({
                    "message": "Registration successful (test mode)",
                    "user_id": 1,
                    "username": username,
                    "access_token": f"test-token-{username}",
                    "token_type": "bearer",
                    "note": "Mode test - pas de vraie authentification"
                })
            except json.JSONDecodeError:
                self._send_json_response({
                    "error": "Invalid JSON"
                }, status=400)

        else:
            self._send_json_response({
                "error": "Endpoint not found",
                "path": path
            }, status=404)

    def log_message(self, format, *args):
        """Override pour log plus propre"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{timestamp}] {self.address_string()} - {format % args}")


def run_server(port=8000):
    """Démarrer le serveur"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, TestAPIHandler)

    print("=" * 60)
    print("🚀 Dream AI Girl - Test Server")
    print("=" * 60)
    print(f"")
    print(f"✓ Server running on: http://localhost:{port}")
    print(f"✓ Health check: http://localhost:{port}/health")
    print(f"✓ Test endpoint: http://localhost:{port}/api/v1/test")
    print(f"")
    print("📝 Logs:")
    print(f"")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped")
        httpd.server_close()


if __name__ == '__main__':
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run_server(port)

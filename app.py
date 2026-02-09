#!/usr/bin/env python3
"""
Dream AI Girl - Simple deployment entry point
Minimal server for Render.com deployment
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
from datetime import datetime

class DreamAPIHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode())

    def do_GET(self):
        if self.path == '/' or self.path == '/health':
            self._send_json({
                "app": "Dream AI Girl 2.0",
                "status": "operational",
                "message": "🎉 Votre app est EN LIGNE !",
                "version": "2.0.0",
                "timestamp": datetime.utcnow().isoformat(),
                "endpoints": {
                    "health": "/health",
                    "api": "/api/test"
                }
            })
        elif self.path == '/api/test':
            self._send_json({
                "status": "success",
                "message": "API fonctionnelle ✓",
                "ready": True
            })
        else:
            self._send_json({"error": "Not found"}, 404)

    def log_message(self, format, *args):
        print(f"{datetime.now()} - {format % args}")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    server = HTTPServer(('0.0.0.0', port), DreamAPIHandler)
    print(f"")
    print(f"{'='*60}")
    print(f"🚀 Dream AI Girl 2.0 - Server Running!")
    print(f"{'='*60}")
    print(f"")
    print(f"✓ Port: {port}")
    print(f"✓ Status: Operational")
    print(f"")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
        server.server_close()

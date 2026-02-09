#!/usr/bin/env python3
"""
Dream AI Girl 2.0 - Unified Server
Single-file server with all features for easy deployment
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import sqlite3
import hashlib
import secrets
from datetime import datetime
from urllib.parse import urlparse, parse_qs
import mimetypes

# Initialize database
def init_db():
    conn = sqlite3.connect('dreamai.db')
    c = conn.cursor()

    # Users table
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  email TEXT UNIQUE,
                  username TEXT UNIQUE,
                  password TEXT,
                  created_at TEXT,
                  premium INTEGER DEFAULT 0)''')

    # AI Girls table
    c.execute('''CREATE TABLE IF NOT EXISTS ai_girls
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT,
                  personality TEXT,
                  avatar TEXT,
                  description TEXT,
                  traits TEXT)''')

    # Chats table
    c.execute('''CREATE TABLE IF NOT EXISTS chats
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER,
                  girl_id INTEGER,
                  message TEXT,
                  response TEXT,
                  timestamp TEXT)''')

    # Insert default AI girls
    girls = [
        ('Sophie', 'Douce et attentionnée', '👧', 'Une compagne virtuelle gentille et à l\'écoute', 'romantic,caring,sweet'),
        ('Luna', 'Mystérieuse et passionnée', '🌙', 'Une âme artistique et profonde', 'mysterious,artistic,deep'),
        ('Emma', 'Énergique et aventurière', '⚡', 'Toujours prête pour l\'aventure', 'energetic,fun,adventurous'),
        ('Aria', 'Intelligente et cultivée', '📚', 'Passionnée de culture et philosophie', 'intelligent,cultured,wise')
    ]

    for girl in girls:
        try:
            c.execute('INSERT INTO ai_girls (name, personality, avatar, description, traits) VALUES (?, ?, ?, ?, ?)', girl)
        except:
            pass

    conn.commit()
    conn.close()

# Initialize on startup
init_db()

class UnifiedAPIHandler(BaseHTTPRequestHandler):

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8'))

    def _send_html(self, html, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(html.encode('utf-8'))

    def _get_post_data(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length:
            return json.loads(self.rfile.read(content_length).decode('utf-8'))
        return {}

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path

        # Root - Web interface
        if path == '/':
            try:
                with open('index.html', 'r', encoding='utf-8') as f:
                    html = f.read()
                self._send_html(html)
            except:
                html = self._get_web_interface()
                self._send_html(html)

        # API Health check
        elif path == '/health' or path == '/api/health':
            self._send_json({
                'status': 'healthy',
                'app': 'Dream AI Girl 2.0',
                'version': '2.0.0-unified',
                'timestamp': datetime.utcnow().isoformat()
            })

        # Get all AI girls
        elif path == '/api/girls':
            conn = sqlite3.connect('dreamai.db')
            c = conn.cursor()
            c.execute('SELECT * FROM ai_girls')
            girls = [{'id': r[0], 'name': r[1], 'personality': r[2], 'avatar': r[3], 'description': r[4], 'traits': r[5]} for r in c.fetchall()]
            conn.close()
            self._send_json({'girls': girls})

        # Get user profile
        elif path.startswith('/api/user/'):
            user_id = path.split('/')[-1]
            conn = sqlite3.connect('dreamai.db')
            c = conn.cursor()
            c.execute('SELECT id, email, username, created_at, premium FROM users WHERE id = ?', (user_id,))
            user = c.fetchone()
            conn.close()
            if user:
                self._send_json({
                    'id': user[0],
                    'email': user[1],
                    'username': user[2],
                    'created_at': user[3],
                    'premium': user[4] == 1
                })
            else:
                self._send_json({'error': 'User not found'}, 404)

        else:
            self._send_json({'error': 'Not found'}, 404)

    def do_POST(self):
        path = urlparse(self.path).path
        data = self._get_post_data()

        # Register
        if path == '/api/auth/register':
            email = data.get('email')
            username = data.get('username')
            password = data.get('password')

            if not all([email, username, password]):
                self._send_json({'error': 'Missing fields'}, 400)
                return

            # Hash password
            password_hash = hashlib.sha256(password.encode()).hexdigest()

            conn = sqlite3.connect('dreamai.db')
            c = conn.cursor()
            try:
                c.execute('INSERT INTO users (email, username, password, created_at) VALUES (?, ?, ?, ?)',
                         (email, username, password_hash, datetime.utcnow().isoformat()))
                conn.commit()
                user_id = c.lastrowid
                conn.close()

                token = secrets.token_urlsafe(32)
                self._send_json({
                    'message': 'User registered successfully',
                    'user_id': user_id,
                    'token': token
                })
            except sqlite3.IntegrityError:
                conn.close()
                self._send_json({'error': 'Email or username already exists'}, 400)

        # Login
        elif path == '/api/auth/login':
            email = data.get('email')
            password = data.get('password')

            if not all([email, password]):
                self._send_json({'error': 'Missing fields'}, 400)
                return

            password_hash = hashlib.sha256(password.encode()).hexdigest()

            conn = sqlite3.connect('dreamai.db')
            c = conn.cursor()
            c.execute('SELECT id, username, premium FROM users WHERE email = ? AND password = ?', (email, password_hash))
            user = c.fetchone()
            conn.close()

            if user:
                token = secrets.token_urlsafe(32)
                self._send_json({
                    'message': 'Login successful',
                    'user_id': user[0],
                    'username': user[1],
                    'premium': user[2] == 1,
                    'token': token
                })
            else:
                self._send_json({'error': 'Invalid credentials'}, 401)

        # Send chat message
        elif path == '/api/chat':
            user_id = data.get('user_id')
            girl_id = data.get('girl_id')
            message = data.get('message')

            if not all([user_id, girl_id, message]):
                self._send_json({'error': 'Missing fields'}, 400)
                return

            # Get girl info
            conn = sqlite3.connect('dreamai.db')
            c = conn.cursor()
            c.execute('SELECT name, personality FROM ai_girls WHERE id = ?', (girl_id,))
            girl = c.fetchone()

            if not girl:
                conn.close()
                self._send_json({'error': 'Girl not found'}, 404)
                return

            # Generate simple response (in real app, use AI)
            response = f"Je suis {girl[0]}. {girl[1]}. Merci pour ton message : '{message}'. Comment puis-je t'aider aujourd'hui ? 💕"

            # Save chat
            c.execute('INSERT INTO chats (user_id, girl_id, message, response, timestamp) VALUES (?, ?, ?, ?, ?)',
                     (user_id, girl_id, message, response, datetime.utcnow().isoformat()))
            conn.commit()
            chat_id = c.lastrowid
            conn.close()

            self._send_json({
                'chat_id': chat_id,
                'response': response,
                'timestamp': datetime.utcnow().isoformat()
            })

        else:
            self._send_json({'error': 'Not found'}, 404)

    def _get_web_interface(self):
        return '''<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dream AI Girl 2.0</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 800px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            text-align: center;
            color: #667eea;
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
        }
        .status {
            background: #10b981;
            color: white;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
            font-weight: bold;
        }
        .girls-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        .girl-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            cursor: pointer;
            transition: transform 0.3s;
        }
        .girl-card:hover {
            transform: translateY(-5px);
        }
        .girl-avatar {
            font-size: 3em;
            margin-bottom: 10px;
        }
        .girl-name {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .girl-personality {
            font-size: 0.9em;
            opacity: 0.9;
        }
        .api-info {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 10px;
            margin-top: 30px;
        }
        .api-info h3 {
            color: #667eea;
            margin-bottom: 15px;
        }
        .endpoint {
            background: white;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 10px;
            font-family: monospace;
            font-size: 0.9em;
        }
        .method {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            font-weight: bold;
            margin-right: 10px;
        }
        .get { background: #10b981; color: white; }
        .post { background: #3b82f6; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <h1>💝 Dream AI Girl 2.0</h1>
        <p class="subtitle">Votre compagne IA est en ligne !</p>

        <div class="status">
            ✅ Serveur opérationnel - API fonctionnelle
        </div>

        <div class="girls-grid" id="girls-grid">
            <div class="girl-card">
                <div class="girl-avatar">⏳</div>
                <div class="girl-name">Chargement...</div>
            </div>
        </div>

        <div class="api-info">
            <h3>📡 API Endpoints</h3>
            <div class="endpoint">
                <span class="method get">GET</span> /api/health - Status
            </div>
            <div class="endpoint">
                <span class="method get">GET</span> /api/girls - Liste des AI Girls
            </div>
            <div class="endpoint">
                <span class="method post">POST</span> /api/auth/register - Inscription
            </div>
            <div class="endpoint">
                <span class="method post">POST</span> /api/auth/login - Connexion
            </div>
            <div class="endpoint">
                <span class="method post">POST</span> /api/chat - Envoyer un message
            </div>
        </div>
    </div>

    <script>
        // Load AI girls
        fetch('/api/girls')
            .then(r => r.json())
            .then(data => {
                const grid = document.getElementById('girls-grid');
                grid.innerHTML = '';
                data.girls.forEach(girl => {
                    grid.innerHTML += `
                        <div class="girl-card" onclick="alert('${girl.name}: ${girl.description}')">
                            <div class="girl-avatar">${girl.avatar}</div>
                            <div class="girl-name">${girl.name}</div>
                            <div class="girl-personality">${girl.personality}</div>
                        </div>
                    `;
                });
            });
    </script>
</body>
</html>'''

    def log_message(self, format, *args):
        print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - {format % args}")

def run_server(port):
    server_address = ('0.0.0.0', port)
    httpd = HTTPServer(server_address, UnifiedAPIHandler)

    print("=" * 70)
    print(f"")
    print(f"     🚀 Dream AI Girl 2.0 - Unified Server")
    print(f"")
    print("=" * 70)
    print(f"")
    print(f"✅ Status: OPERATIONAL")
    print(f"🌐 Port: {port}")
    print(f"📡 API: http://localhost:{port}/api/health")
    print(f"💻 Web: http://localhost:{port}/")
    print(f"")
    print(f"📝 Available endpoints:")
    print(f"   GET  /              - Web interface")
    print(f"   GET  /api/girls     - List AI girls")
    print(f"   POST /api/auth/*    - Authentication")
    print(f"   POST /api/chat      - Send message")
    print(f"")
    print("=" * 70)
    print(f"")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped")
        httpd.server_close()

if __name__ == '__main__':
    import sys
    port = int(os.environ.get('PORT', sys.argv[1] if len(sys.argv) > 1 else 8000))
    run_server(port)

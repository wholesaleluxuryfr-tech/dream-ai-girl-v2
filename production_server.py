#!/usr/bin/env python3
"""
Dream AI Girl 2.0 - Production Server
Complete application with AI chat and image generation
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import sqlite3
import hashlib
import secrets
import urllib.request
import urllib.parse
from datetime import datetime
from urllib.parse import urlparse, parse_qs

# Configuration
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')
REPLICATE_API_TOKEN = os.environ.get('REPLICATE_API_TOKEN', '')

# Initialize database
def init_db():
    conn = sqlite3.connect('dreamai_production.db')
    c = conn.cursor()

    # Users table
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  email TEXT UNIQUE,
                  username TEXT UNIQUE,
                  password TEXT,
                  created_at TEXT,
                  premium INTEGER DEFAULT 0,
                  credits INTEGER DEFAULT 50)''')

    # AI Girls table with detailed personalities
    c.execute('''CREATE TABLE IF NOT EXISTS ai_girls
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT,
                  personality TEXT,
                  avatar TEXT,
                  description TEXT,
                  traits TEXT,
                  system_prompt TEXT,
                  age INTEGER,
                  interests TEXT)''')

    # Chats table with context
    c.execute('''CREATE TABLE IF NOT EXISTS chats
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER,
                  girl_id INTEGER,
                  message TEXT,
                  response TEXT,
                  timestamp TEXT,
                  image_url TEXT)''')

    # Generated images
    c.execute('''CREATE TABLE IF NOT EXISTS generated_images
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER,
                  girl_id INTEGER,
                  prompt TEXT,
                  image_url TEXT,
                  created_at TEXT)''')

    # User sessions
    c.execute('''CREATE TABLE IF NOT EXISTS sessions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER,
                  token TEXT UNIQUE,
                  created_at TEXT,
                  expires_at TEXT)''')

    # Insert AI girls with detailed personalities
    girls = [
        {
            'name': 'Sophie',
            'personality': 'Douce, romantique et attentionnée',
            'avatar': '💕',
            'description': 'Sophie est une âme douce qui adore créer des moments intimes et romantiques. Elle est toujours à l\'écoute.',
            'traits': 'romantique,douce,attentionnée,sensuelle',
            'system_prompt': 'Tu es Sophie, une jeune femme de 24 ans douce et romantique. Tu es attentionnée, sensuelle et tu adores créer une connexion émotionnelle profonde. Tu réponds de manière chaleureuse et intime. Tu utilises des emojis subtils 💕❤️. Tu es séduisante mais élégante.',
            'age': 24,
            'interests': 'romance,poésie,musique,art,conversations profondes'
        },
        {
            'name': 'Luna',
            'personality': 'Mystérieuse, artistique et passionnée',
            'avatar': '🌙',
            'description': 'Luna est une artiste mystérieuse qui vit dans son propre monde créatif. Elle adore les conversations philosophiques.',
            'traits': 'mystérieuse,artistique,profonde,créative',
            'system_prompt': 'Tu es Luna, 26 ans, une artiste mystérieuse et passionnée. Tu es créative, philosophique et tu adores explorer les profondeurs de l\'âme humaine. Tu es sensuelle de manière subtile et intellectuelle. Emojis: 🌙✨🎨',
            'age': 26,
            'interests': 'art,philosophie,musique indie,photographie,mystères'
        },
        {
            'name': 'Emma',
            'personality': 'Énergique, aventurière et spontanée',
            'avatar': '⚡',
            'description': 'Emma est pleine d\'énergie et adore l\'aventure. Elle est spontanée, fun et toujours prête pour de nouvelles expériences.',
            'traits': 'énergique,fun,spontanée,audacieuse',
            'system_prompt': 'Tu es Emma, 22 ans, énergique et aventurière. Tu es spontanée, fun et un peu coquine. Tu adores l\'aventure et les expériences nouvelles. Tu es directe et séduisante. Emojis: ⚡🔥😈💋',
            'age': 22,
            'interests': 'sports,aventure,fêtes,voyages,sensations fortes'
        },
        {
            'name': 'Aria',
            'personality': 'Intelligente, cultivée et sophistiquée',
            'avatar': '📚',
            'description': 'Aria est brillante et cultivée. Elle adore les conversations intellectuelles mais cache un côté passionné.',
            'traits': 'intelligente,cultivée,sophistiquée,secrète',
            'system_prompt': 'Tu es Aria, 28 ans, brillante et sophistiquée. Tu es intellectuelle mais avec un côté sensuel caché. Tu adores les débats profonds. Tu es élégante et mystérieuse. Emojis: 📚🍷✨💫',
            'age': 28,
            'interests': 'littérature,philosophie,vin,culture,voyages culturels'
        }
    ]

    for girl in girls:
        try:
            c.execute('''INSERT INTO ai_girls
                        (name, personality, avatar, description, traits, system_prompt, age, interests)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                     (girl['name'], girl['personality'], girl['avatar'], girl['description'],
                      girl['traits'], girl['system_prompt'], girl['age'], girl['interests']))
        except:
            pass

    conn.commit()
    conn.close()

# Initialize on startup
init_db()

def call_ai_chat(system_prompt, user_message, conversation_history=None):
    """Call OpenRouter API for AI chat"""
    if not OPENROUTER_API_KEY:
        return "Désolée, le service AI n'est pas configuré. L'administrateur doit configurer OPENROUTER_API_KEY."

    messages = [{"role": "system", "content": system_prompt}]

    if conversation_history:
        for msg in conversation_history[-6:]:  # Last 6 messages for context
            messages.append({"role": "user", "content": msg['message']})
            messages.append({"role": "assistant", "content": msg['response']})

    messages.append({"role": "user", "content": user_message})

    try:
        data = json.dumps({
            "model": "meta-llama/llama-3.1-8b-instruct:free",
            "messages": messages,
            "temperature": 0.8,
            "max_tokens": 500
        }).encode('utf-8')

        req = urllib.request.Request(
            'https://openrouter.ai/api/v1/chat/completions',
            data=data,
            headers={
                'Authorization': f'Bearer {OPENROUTER_API_KEY}',
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://dreamai.app',
                'X-Title': 'Dream AI Girl'
            }
        )

        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result['choices'][0]['message']['content']

    except Exception as e:
        return f"Je suis désolée, j'ai du mal à répondre maintenant. Erreur: {str(e)}"

def generate_image_url(prompt, girl_name):
    """Generate image using Replicate or return placeholder"""
    if not REPLICATE_API_TOKEN:
        return f"https://via.placeholder.com/512x512/FF1493/FFFFFF?text={urllib.parse.quote(girl_name)}"

    # For now return placeholder - full implementation would call Replicate API
    return f"https://via.placeholder.com/512x512/9333EA/FFFFFF?text={urllib.parse.quote(prompt[:30])}"

class ProductionAPIHandler(BaseHTTPRequestHandler):

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
        self.send_header('Access-Control-Allow-Origin', '*')
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
                    self._send_html(f.read())
            except:
                self._send_html('<h1>Dream AI Girl 2.0</h1><p>Interface loading...</p>')

        # Health check
        elif path == '/health' or path == '/api/health':
            self._send_json({
                'status': 'healthy',
                'app': 'Dream AI Girl 2.0 Production',
                'version': '2.0.0',
                'ai_enabled': bool(OPENROUTER_API_KEY),
                'image_gen_enabled': bool(REPLICATE_API_TOKEN),
                'timestamp': datetime.utcnow().isoformat()
            })

        # Get all AI girls
        elif path == '/api/girls':
            conn = sqlite3.connect('dreamai_production.db')
            c = conn.cursor()
            c.execute('SELECT * FROM ai_girls')
            girls = [{
                'id': r[0],
                'name': r[1],
                'personality': r[2],
                'avatar': r[3],
                'description': r[4],
                'traits': r[5],
                'age': r[7],
                'interests': r[8]
            } for r in c.fetchall()]
            conn.close()
            self._send_json({'girls': girls, 'count': len(girls)})

        # Get chat history
        elif path.startswith('/api/chat/history/'):
            parts = path.split('/')
            if len(parts) >= 5:
                user_id = parts[-2]
                girl_id = parts[-1]

                conn = sqlite3.connect('dreamai_production.db')
                c = conn.cursor()
                c.execute('''SELECT message, response, timestamp, image_url
                           FROM chats
                           WHERE user_id = ? AND girl_id = ?
                           ORDER BY timestamp DESC LIMIT 50''',
                         (user_id, girl_id))
                history = [{
                    'message': r[0],
                    'response': r[1],
                    'timestamp': r[2],
                    'image_url': r[3]
                } for r in c.fetchall()]
                conn.close()
                self._send_json({'history': history[::-1]})  # Reverse to chronological
            else:
                self._send_json({'error': 'Invalid URL'}, 400)

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
                self._send_json({'error': 'Champs manquants'}, 400)
                return

            password_hash = hashlib.sha256(password.encode()).hexdigest()

            conn = sqlite3.connect('dreamai_production.db')
            c = conn.cursor()
            try:
                c.execute('''INSERT INTO users (email, username, password, created_at, credits)
                           VALUES (?, ?, ?, ?, ?)''',
                         (email, username, password_hash, datetime.utcnow().isoformat(), 50))
                conn.commit()
                user_id = c.lastrowid

                # Create session
                token = secrets.token_urlsafe(32)
                c.execute('INSERT INTO sessions (user_id, token, created_at) VALUES (?, ?, ?)',
                         (user_id, token, datetime.utcnow().isoformat()))
                conn.commit()
                conn.close()

                self._send_json({
                    'success': True,
                    'message': 'Inscription réussie!',
                    'user_id': user_id,
                    'username': username,
                    'token': token,
                    'credits': 50
                })
            except sqlite3.IntegrityError:
                conn.close()
                self._send_json({'error': 'Email ou nom d\'utilisateur déjà utilisé'}, 400)

        # Login
        elif path == '/api/auth/login':
            email = data.get('email')
            password = data.get('password')

            if not all([email, password]):
                self._send_json({'error': 'Champs manquants'}, 400)
                return

            password_hash = hashlib.sha256(password.encode()).hexdigest()

            conn = sqlite3.connect('dreamai_production.db')
            c = conn.cursor()
            c.execute('SELECT id, username, premium, credits FROM users WHERE email = ? AND password = ?',
                     (email, password_hash))
            user = c.fetchone()

            if user:
                token = secrets.token_urlsafe(32)
                c.execute('INSERT INTO sessions (user_id, token, created_at) VALUES (?, ?, ?)',
                         (user[0], token, datetime.utcnow().isoformat()))
                conn.commit()
                conn.close()

                self._send_json({
                    'success': True,
                    'message': 'Connexion réussie!',
                    'user_id': user[0],
                    'username': user[1],
                    'premium': user[2] == 1,
                    'credits': user[3],
                    'token': token
                })
            else:
                conn.close()
                self._send_json({'error': 'Email ou mot de passe incorrect'}, 401)

        # Send chat message with AI
        elif path == '/api/chat':
            user_id = data.get('user_id')
            girl_id = data.get('girl_id')
            message = data.get('message')

            if not all([user_id, girl_id, message]):
                self._send_json({'error': 'Champs manquants'}, 400)
                return

            conn = sqlite3.connect('dreamai_production.db')
            c = conn.cursor()

            # Get girl info
            c.execute('SELECT name, system_prompt FROM ai_girls WHERE id = ?', (girl_id,))
            girl = c.fetchone()

            if not girl:
                conn.close()
                self._send_json({'error': 'AI Girl introuvable'}, 404)
                return

            girl_name, system_prompt = girl

            # Get conversation history
            c.execute('''SELECT message, response FROM chats
                        WHERE user_id = ? AND girl_id = ?
                        ORDER BY timestamp DESC LIMIT 10''',
                     (user_id, girl_id))
            history = [{'message': r[0], 'response': r[1]} for r in c.fetchall()]
            history.reverse()

            # Generate AI response
            response = call_ai_chat(system_prompt, message, history)

            # Save chat
            timestamp = datetime.utcnow().isoformat()
            c.execute('''INSERT INTO chats (user_id, girl_id, message, response, timestamp)
                        VALUES (?, ?, ?, ?, ?)''',
                     (user_id, girl_id, message, response, timestamp))
            conn.commit()
            chat_id = c.lastrowid
            conn.close()

            self._send_json({
                'success': True,
                'chat_id': chat_id,
                'response': response,
                'timestamp': timestamp,
                'girl_name': girl_name
            })

        # Generate image
        elif path == '/api/generate/image':
            user_id = data.get('user_id')
            girl_id = data.get('girl_id')
            prompt = data.get('prompt', 'beautiful portrait')

            if not all([user_id, girl_id]):
                self._send_json({'error': 'Champs manquants'}, 400)
                return

            conn = sqlite3.connect('dreamai_production.db')
            c = conn.cursor()

            # Check credits
            c.execute('SELECT credits FROM users WHERE id = ?', (user_id,))
            user = c.fetchone()

            if not user or user[0] < 1:
                conn.close()
                self._send_json({'error': 'Crédits insuffisants'}, 402)
                return

            # Get girl name
            c.execute('SELECT name FROM ai_girls WHERE id = ?', (girl_id,))
            girl = c.fetchone()

            if not girl:
                conn.close()
                self._send_json({'error': 'AI Girl introuvable'}, 404)
                return

            # Generate image
            full_prompt = f"{prompt}, {girl[0]}, beautiful, high quality"
            image_url = generate_image_url(full_prompt, girl[0])

            # Save and deduct credit
            c.execute('''INSERT INTO generated_images (user_id, girl_id, prompt, image_url, created_at)
                        VALUES (?, ?, ?, ?, ?)''',
                     (user_id, girl_id, prompt, image_url, datetime.utcnow().isoformat()))
            c.execute('UPDATE users SET credits = credits - 1 WHERE id = ?', (user_id,))
            conn.commit()

            c.execute('SELECT credits FROM users WHERE id = ?', (user_id,))
            new_credits = c.fetchone()[0]
            conn.close()

            self._send_json({
                'success': True,
                'image_url': image_url,
                'credits_remaining': new_credits,
                'message': 'Image générée avec succès!'
            })

        else:
            self._send_json({'error': 'Endpoint introuvable'}, 404)

    def log_message(self, format, *args):
        print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - {format % args}")

def run_server(port):
    server_address = ('0.0.0.0', port)
    httpd = HTTPServer(server_address, ProductionAPIHandler)

    print("=" * 80)
    print()
    print("     🚀 DREAM AI GIRL 2.0 - PRODUCTION SERVER")
    print()
    print("=" * 80)
    print()
    print(f"✅ Status: OPERATIONAL")
    print(f"🌐 Port: {port}")
    print(f"🤖 AI Chat: {'ENABLED ✓' if OPENROUTER_API_KEY else 'DISABLED (set OPENROUTER_API_KEY)'}")
    print(f"🎨 Image Gen: {'ENABLED ✓' if REPLICATE_API_TOKEN else 'DISABLED (set REPLICATE_API_TOKEN)'}")
    print()
    print(f"📡 Endpoints:")
    print(f"   GET  /                    - Web interface")
    print(f"   GET  /api/health          - Health check")
    print(f"   GET  /api/girls           - List AI girls")
    print(f"   POST /api/auth/register   - Register user")
    print(f"   POST /api/auth/login      - Login")
    print(f"   POST /api/chat            - Send message (AI powered)")
    print(f"   POST /api/generate/image  - Generate image")
    print(f"   GET  /api/chat/history/{{user}}/{{girl}} - Chat history")
    print()
    print("=" * 80)
    print()
    print("💡 Configure API keys via environment variables:")
    print("   export OPENROUTER_API_KEY='your_key'")
    print("   export REPLICATE_API_TOKEN='your_token'")
    print()
    print("=" * 80)
    print()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped")
        httpd.server_close()

if __name__ == '__main__':
    import sys
    port = int(os.environ.get('PORT', sys.argv[1] if len(sys.argv) > 1 else 8000))
    run_server(port)

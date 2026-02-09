#!/bin/bash
# Start script for Render deployment

echo "🚀 Starting Dream AI Girl Test Server..."
echo "📁 Current directory: $(pwd)"
echo "📂 Files:"
ls -la

cd "$(dirname "$0")"
python3 backend/test_server.py ${PORT:-8000}

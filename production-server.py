#!/usr/bin/env python3
"""
Production Server for Portfolio
Serves optimized files with proper headers and compression
"""

import http.server
import socketserver
import gzip
import os
import mimetypes
from pathlib import Path

class ProductionHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="dist", **kwargs)
        
    def end_headers(self):
        # Add production headers
        self.send_header('Cache-Control', 'public, max-age=31536000')  # 1 year
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        super().end_headers()
        
    def guess_type(self, path):
        """Return content type for path"""
        mimetype, encoding = mimetypes.guess_type(path)
        
        # Set proper mime types for common files
        if path.endswith('.css'):
            mimetype = 'text/css'
        elif path.endswith('.js'):
            mimetype = 'application/javascript'
        elif path.endswith('.webp'):
            mimetype = 'image/webp'
        elif path.endswith('.json'):
            mimetype = 'application/json'
            
        return mimetype, encoding
        
    def do_GET(self):
        """Handle GET requests with compression support"""
        # Check if client accepts gzip
        accept_encoding = self.headers.get('Accept-Encoding', '')
        supports_gzip = 'gzip' in accept_encoding
        
        # Get the requested file path
        if self.path == '/':
            file_path = Path('dist/index.html')
        else:
            file_path = Path('dist' + self.path)
            
        # Try to serve gzipped version if available and supported
        if supports_gzip and file_path.suffix in ['.html', '.css', '.js']:
            gzipped_path = Path(str(file_path) + '.gz')
            if gzipped_path.exists():
                # Serve gzipped version
                self.send_response(200)
                mimetype, _ = self.guess_type(str(file_path))
                if mimetype:
                    self.send_header('Content-Type', mimetype)
                self.send_header('Content-Encoding', 'gzip')
                self.send_header('Vary', 'Accept-Encoding')
                self.end_headers()
                
                with open(gzipped_path, 'rb') as f:
                    self.wfile.write(f.read())
                return
                
        # Fallback to normal serving
        super().do_GET()

def serve_production():
    """Start production server"""
    PORT = 8000
    
    # Check if dist directory exists
    if not Path('dist').exists():
        print("❌ Error: dist directory not found")
        print("   Run 'npm run build' first to create production files")
        return
        
    handler = ProductionHandler
    
    try:
        with socketserver.TCPServer(("", PORT), handler) as httpd:
            print(f"🚀 Production server starting...")
            print(f"📂 Serving files from: dist/")
            print(f"🌐 Server running at: http://localhost:{PORT}")
            print(f"⚡ Serving optimized and compressed assets")
            print(f"🔥 Press Ctrl+C to stop the server")
            print("-" * 50)
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n👋 Production server stopped")
    except OSError as e:
        if e.errno == 48:
            print(f"❌ Error: Port {PORT} is already in use")
        else:
            print(f"❌ Error starting server: {e}")

if __name__ == "__main__":
    serve_production()



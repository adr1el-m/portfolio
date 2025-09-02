#!/usr/bin/env python3
"""
Simple development server for the portfolio
Serves static files from the current directory
"""

import http.server
import socketserver
import webbrowser
import os
import sys
from pathlib import Path

PORT = 8000

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def serve_portfolio():
    """Start the development server"""
    
    # Check if we're in the right directory
    if not Path('index.html').exists():
        print("❌ Error: index.html not found in current directory")
        print("   Make sure you're running this from the portfolio root directory")
        sys.exit(1)
    
    # Create server
    handler = CustomHTTPRequestHandler
    
    try:
        with socketserver.TCPServer(("", PORT), handler) as httpd:
            print(f"🚀 Portfolio development server starting...")
            print(f"📂 Serving files from: {os.getcwd()}")
            print(f"🌐 Server running at: http://localhost:{PORT}")
            print(f"📱 Local network access: http://{get_local_ip()}:{PORT}")
            print("🔥 Press Ctrl+C to stop the server")
            print("-" * 50)
            
            # Try to open browser automatically
            try:
                webbrowser.open(f'http://localhost:{PORT}')
                print("🌐 Opening browser automatically...")
            except:
                print("💡 Open http://localhost:8000 in your browser")
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n👋 Server stopped. Thanks for using the development server!")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Error: Port {PORT} is already in use")
            print("   Try running with a different port or stop other servers")
        else:
            print(f"❌ Error starting server: {e}")

def get_local_ip():
    """Get local IP address for network access"""
    import socket
    try:
        # Connect to a remote address to get local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "localhost"

if __name__ == "__main__":
    serve_portfolio()



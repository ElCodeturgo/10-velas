import http.server
import socketserver
import webbrowser
import threading
import os
import urllib.request

PORT = 8080
DIRECTORY = r"C:\Users\Frank\.gemini\antigravity\scratch\Ten Candles"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
        
    def end_headers(self):
        # Force CORS headers to allow everything, just in case
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        return super().end_headers()

def start_server():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Servidor sirviendo en el puerto {PORT}")
        httpd.serve_forever()

# Iniciar servidor en hilo en segundo plano
server_thread = threading.Thread(target=start_server, daemon=True)
server_thread.start()

# Abrir el navegador
print("Abriendo navegador...")
webbrowser.open(f'http://localhost:{PORT}/index.html')

# Mantener vivo
input("Servidor corriendo. Presiona ENTER para salir...\n")

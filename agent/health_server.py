"""
If you wish to host the LiveKit agent on Google Cloud Run, this file is used to run a minimal HTTP server for mandatory Cloud Run health checks.
"""

import os
from http.server import HTTPServer, BaseHTTPRequestHandler


class HealthHandler(BaseHTTPRequestHandler):
    """
    Minimal HTTP handler for Cloud Run health checks.
    LiveKit agents don't listen on any ports, but Google Cloud Run always tries to perform a TCP health
    check on port $PORT. This handler allows the agent to respond to these health checks.
    """
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'OK')
    
    def log_message(self, format, *args):
        # Suppress request logs
        pass


def run_health_server():
    """
    Run the minimal HTTP server for Cloud Run health checks.
    """
    port = int(os.environ.get('PORT', 8080))
    server = HTTPServer(('', port), HealthHandler)
    print(f"Health check server listening on port {port}")
    server.serve_forever() 
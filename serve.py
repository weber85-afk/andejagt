# Starter spillet på http://localhost:8123 (eller den port man skriver efter).
# Browseren får besked på aldrig at gemme gamle udgaver af filerne,
# så man altid får den nyeste version, når man genindlæser siden.
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
os.chdir(os.path.dirname(os.path.abspath(__file__)))
print(f'Spillet kører på http://localhost:{port}')
http.server.ThreadingHTTPServer(('', port), NoCacheHandler).serve_forever()

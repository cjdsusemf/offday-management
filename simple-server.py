#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

# 현재 디렉토리를 웹 루트로 설정
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

if __name__ == "__main__":
    try:
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            print(f"서버가 http://localhost:{PORT} 에서 실행 중입니다...")
            print("종료하려면 Ctrl+C를 누르세요.")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n서버를 종료합니다.")
        sys.exit(0)
    except Exception as e:
        print(f"오류 발생: {e}")
        sys.exit(1)

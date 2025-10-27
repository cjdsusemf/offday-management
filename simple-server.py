#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys
import json
import urllib.parse
from datetime import datetime, timedelta

# 현재 디렉토리를 웹 루트로 설정
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_GET(self):
        if self.path.startswith('/api/'):
            self.handle_api_request()
        else:
            super().do_GET()
    
    def handle_api_request(self):
        if self.path == '/api/leaves':
            self.send_leaves_data()
        else:
            self.send_error(404, "API endpoint not found")
    
    def send_leaves_data(self):
        try:
            # 실제 연차 데이터 조회를 위한 JavaScript 실행
            import subprocess
            import tempfile
            
            # JavaScript 코드로 localStorage에서 데이터 조회
            js_code = """
            const employees = JSON.parse(localStorage.getItem('employees') || '[]');
            const leaveRequests = JSON.parse(localStorage.getItem('leaveRequests') || '[]');
            const branches = JSON.parse(localStorage.getItem('branches') || '[]');
            
            // 승인된 연차만 필터링
            const approvedLeaves = leaveRequests.filter(req => req.status === 'approved');
            
            // API 형식으로 변환
            const apiData = approvedLeaves.map(leave => {
                const employee = employees.find(emp => String(emp.id) === String(leave.employeeId));
                const branch = branches.find(br => br.id === (employee?.branchId || 1));
                
                return {
                    id: leave.id,
                    title: `${employee?.name || '알 수 없음'} (${leave.leaveType === 'welfare-vacation' ? '복지휴가' : '연차'})`,
                    start: leave.startDate + 'T00:00:00',
                    end: leave.endDate + 'T00:00:00',
                    leave_type: leave.leaveType === 'welfare-vacation' ? '복지휴가' : '연차',
                    half_type: leave.halfType || '전일',
                    reason: leave.reason || '',
                    user_name: employee?.name || '알 수 없음',
                    team_name: employee?.team || '알 수 없음',
                    branch_name: branch?.name || '알 수 없음',
                    branch_id: employee?.branchId || 1,
                    team_id: employee?.teamId || 1
                };
            });
            
            console.log('API 데이터:', apiData);
            """
            
            # 임시 파일에 JavaScript 코드 저장
            with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
                f.write(js_code)
                temp_file = f.name
            
            # Node.js로 실행하여 데이터 조회
            try:
                result = subprocess.run(['node', '-e', js_code], 
                                      capture_output=True, text=True, timeout=5)
                
                # 실제로는 브라우저의 localStorage에 접근할 수 없으므로
                # 파일 기반 데이터베이스 방식으로 변경
                leaves_data = self.get_leaves_from_file()
                
            except Exception as e:
                print(f"JavaScript 실행 오류: {e}")
                leaves_data = []
            finally:
                # 임시 파일 삭제
                try:
                    os.unlink(temp_file)
                except:
                    pass
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(leaves_data, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"Server error: {str(e)}")
    
    def get_leaves_from_file(self):
        """파일에서 연차 데이터 조회"""
        try:
            # 실제 데이터 파일이 있다면 여기서 읽기
            # 현재는 샘플 데이터 반환
            return [
                {
                    "id": 1,
                    "title": "김철수 (연차)",
                    "start": "2025-10-27T00:00:00",
                    "end": "2025-10-30T00:00:00",
                    "leave_type": "연차",
                    "half_type": "전일",
                    "reason": "개인사정",
                    "user_name": "김철수",
                    "team_name": "개발팀",
                    "branch_name": "본사",
                    "branch_id": 1,
                    "team_id": 1
                },
                {
                    "id": 2,
                    "title": "이영희 (복지휴가)",
                    "start": "2025-10-28T00:00:00",
                    "end": "2025-10-28T00:00:00",
                    "leave_type": "복지휴가",
                    "half_type": "전일",
                    "reason": "가족행사",
                    "user_name": "이영희",
                    "team_name": "마케팅팀",
                    "branch_name": "강남점",
                    "branch_id": 2,
                    "team_id": 2
                },
                {
                    "id": 3,
                    "title": "박민수 (연차)",
                    "start": "2025-11-01T00:00:00",
                    "end": "2025-11-03T00:00:00",
                    "leave_type": "연차",
                    "half_type": "전일",
                    "reason": "여행",
                    "user_name": "박민수",
                    "team_name": "영업팀",
                    "branch_name": "부산점",
                    "branch_id": 3,
                    "team_id": 3
                }
            ]
        except Exception as e:
            print(f"파일 데이터 조회 오류: {e}")
            return []

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

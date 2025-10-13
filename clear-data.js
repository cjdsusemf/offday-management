// 데이터 초기화 스크립트
// 브라우저 개발자 도구(F12) → Console에서 실행

console.log('=== 연차관리 시스템 데이터 초기화 ===');

// 1. 직원 데이터 삭제
localStorage.removeItem('employees');
console.log('✅ 직원 데이터 삭제 완료');

// 2. 연차 신청 데이터 삭제
localStorage.removeItem('leaveRequests');
console.log('✅ 연차 신청 데이터 삭제 완료');

// 3. 삭제된 직원 데이터 삭제
localStorage.removeItem('deletedEmployees');
console.log('✅ 삭제된 직원 데이터 삭제 완료');

// 4. 사용자 계정은 admin만 유지
const users = JSON.parse(localStorage.getItem("offday_users") || "[]");
const adminUser = users.find(u => u.role === 'admin');
if (adminUser) {
    localStorage.setItem("offday_users", JSON.stringify([adminUser]));
    console.log('✅ 관리자 계정 유지, 다른 사용자 계정 삭제 완료');
} else {
    console.log('⚠️ 관리자 계정이 없습니다.');
}

// 5. 지점 데이터는 유지 (필요시 삭제)
// localStorage.removeItem('branches');
// console.log('✅ 지점 데이터 삭제 완료');

// 6. 지점별 팀 데이터 유지
// localStorage.removeItem('branchTeams');
// console.log('✅ 지점별 팀 데이터 삭제 완료');

console.log('=== 초기화 완료 ===');
console.log('이제 페이지를 새로고침하면 깨끗한 상태로 시작됩니다.');

# 📘 Users 테이블 통합 가이드

## 🔄 개요

`offday_users` 테이블과 `employees` 테이블을 단일 `users` 테이블로 통합했습니다.

### 통합 이유
- ❌ 중복 데이터 (동일한 정보를 두 곳에 저장)
- ❌ 복잡한 동기화 로직 (500+ 줄)
- ❌ 데이터 불일치 가능성
- ❌ 메모리 낭비

### 통합 효과
- ✅ 단일 데이터 소스로 일관성 보장
- ✅ 500+ 줄의 동기화 코드 제거
- ✅ 유지보수 용이
- ✅ 성능 향상

---

## 📊 새로운 통합 구조

### Users 테이블 (통합됨)

```javascript
{
    // === 인증 정보 ===
    id: String,                    // 사용자 고유 ID
    username: String,              // 로그인 아이디
    password: String,              // 비밀번호
    role: String,                  // 역할 ('admin', 'user')
    
    // === 개인 정보 ===
    name: String,                  // 이름
    email: String,                 // 이메일 (고유값)
    phone: String,                 // 연락처
    birthDate: String,             // 생년월일 (YYYY-MM-DD)
    profileImage: String,          // 프로필 이미지 URL
    
    // === 회사 정보 ===
    branch: String,                // 소속 지점
    branchId: Number,              // 지점 ID
    department: String,            // 부서
    team: String,                  // 팀
    position: String,              // 직급
    hireDate: String,              // 입사일 (YYYY-MM-DD)
    
    // === 연차 정보 ===
    annualLeaveDays: Number,       // 총 연차 일수
    usedLeaveDays: Number,         // 사용한 연차 일수
    remainingLeaveDays: Number,    // 남은 연차 일수
    welfareLeaveDays: Number,      // 복지휴가 일수
    
    // === 상태 정보 ===
    status: String,                // 상태 ('active', 'resigned', 'deleted')
    resignationDate: String,       // 퇴사일
    createdAt: String,             // 계정 생성일 (ISO String)
    updatedAt: String,             // 최종 수정일 (ISO String)
    deletedAt: String              // 삭제일 (소프트 삭제)
}
```

---

## 🚀 마이그레이션 실행

### 1단계: 마이그레이션 스크립트 로드

HTML 파일의 `<head>` 또는 `<body>` 끝에 다음을 추가:

```html
<script src="js/migration.js"></script>
```

### 2단계: 마이그레이션 실행

브라우저 콘솔에서:

```javascript
// 마이그레이션 실행
migrateToUnifiedUsers()
```

### 3단계: 페이지 새로고침

```javascript
location.reload()
```

### 롤백 (문제 발생 시)

```javascript
// 이전 상태로 롤백
rollbackMigration()
```

---

## 🔧 주요 변경사항

### Local Storage Keys

#### 변경된 키
| 이전 | 새로운 |
|------|--------|
| `offday_users` | `users` |
| `employees` | (제거됨, `users`로 통합) |
| `offday_current_user` | `current_user` |
| `deletedEmployees` | (제거됨, `users`의 `status='deleted'`로 처리) |

#### 유지되는 키
- `leaveRequests`
- `branches`
- `branchTeams`
- `settings`
- `deletedUsers`
- `welfareLeaveGrants`

### API 변경사항

#### AuthManager (auth.js)

```javascript
// 이전
localStorage.getItem('offday_users')
localStorage.getItem('offday_current_user')

// 새로운
localStorage.getItem('users')
localStorage.getItem('current_user')
```

#### DataManager (data-manager.js)

```javascript
// 이전
dataManager.employees
dataManager.addEmployee(employeeData)
dataManager.updateEmployee(id, data)
dataManager.deleteEmployee(id)
dataManager.getActiveEmployees()
dataManager.getDeletedEmployees()

// 새로운 (호환성 유지 - 내부적으로 users 사용)
dataManager.employees                  // → getActiveEmployees() getter
dataManager.addEmployee(employeeData)  // → users에 추가
dataManager.updateEmployee(id, data)   // → users 업데이트
dataManager.deleteEmployee(id)         // → 소프트 삭제
dataManager.getActiveEmployees()       // → users에서 status='active'만 반환
dataManager.getDeletedEmployees()      // → users에서 status='deleted'만 반환

// 새로 추가된 메서드
dataManager.getUsers()                 // 모든 사용자 조회
dataManager.saveUsers(users)           // 사용자 저장
```

---

## ✅ 호환성

### 기존 코드와의 호환성

대부분의 기존 코드는 수정 없이 작동합니다:

```javascript
// 여전히 작동하는 코드들
dataManager.employees                   // ✅ 작동
dataManager.addEmployee(data)          // ✅ 작동
dataManager.getActiveEmployees()       // ✅ 작동
window.authManager.getCurrentUser()    // ✅ 작동
```

### 권장 업데이트

새 코드 작성 시 권장 사항:

```javascript
// 이전 방식 (여전히 작동하지만 권장하지 않음)
const employees = dataManager.employees

// 권장 방식
const users = dataManager.getUsers()
const activeUsers = dataManager.getActiveEmployees()
```

---

## 🔍 테스트

### 1. 기본 기능 테스트

```javascript
// 1. 사용자 목록 조회
const users = dataManager.getUsers()
console.log('전체 사용자:', users.length)

// 2. 활성 사용자만 조회
const activeUsers = dataManager.getActiveEmployees()
console.log('활성 사용자:', activeUsers.length)

// 3. 현재 로그인 사용자
const currentUser = window.authManager.getCurrentUser()
console.log('현재 사용자:', currentUser)

// 4. 연차 신청 확인
const leaveRequests = dataManager.leaveRequests
console.log('연차 신청:', leaveRequests.length)
```

### 2. 데이터 일관성 확인

```javascript
// 모든 사용자가 필수 필드를 가지고 있는지 확인
const users = dataManager.getUsers()
users.forEach(user => {
    console.assert(user.id, 'ID 누락:', user)
    console.assert(user.email, 'Email 누락:', user)
    console.assert(user.name, 'Name 누락:', user)
    console.assert(user.status, 'Status 누락:', user)
})
console.log('✅ 데이터 일관성 확인 완료')
```

### 3. 로그인 테스트

1. 로그아웃
2. 다시 로그인 (admin / admin123)
3. 대시보드 확인
4. 연차 신청 테스트

---

## 📝 마이그레이션 체크리스트

### 사전 준비
- [ ] 현재 데이터 백업 확인
- [ ] 브라우저 콘솔에서 경고/오류 없음 확인

### 마이그레이션 실행
- [ ] `migration.js` 로드
- [ ] `migrateToUnifiedUsers()` 실행
- [ ] 성공 메시지 확인
- [ ] 페이지 새로고침

### 사후 확인
- [ ] 로그인/로그아웃 정상 작동
- [ ] 사용자 목록 정상 표시
- [ ] 연차 신청 정상 작동
- [ ] 통계 데이터 정상 표시
- [ ] 기존 연차 신청 내역 유지 확인

---

## ⚠️ 주의사항

### 1. 백업
- 마이그레이션 전 자동으로 백업 생성됨 (`_backup_before_merge`)
- 문제 발생 시 `rollbackMigration()` 사용

### 2. 브라우저별 데이터
- Local Storage는 브라우저별로 독립적
- 각 브라우저에서 마이그레이션 필요

### 3. 비밀번호 보안
- 여전히 평문 저장 (개선 필요)
- Supabase 마이그레이션 시 해시 처리 권장

### 4. 기존 연차 신청
- employeeId는 그대로 유지됨
- users의 id와 매칭됨

---

## 🐛 문제 해결

### 마이그레이션 실패

```javascript
// 백업에서 복원
rollbackMigration()
location.reload()
```

### 데이터 누락

```javascript
// 백업 데이터 확인
const backup = JSON.parse(localStorage.getItem('_backup_before_merge'))
console.log('백업 데이터:', backup)
```

### 로그인 불가

```javascript
// 관리자 계정 복구
dataManager.restoreAdminAccount()
location.reload()
```

---

## 📞 지원

문제가 발생하면 다음을 확인:

1. 브라우저 콘솔 오류 메시지
2. Local Storage 데이터 (`Application` → `Local Storage`)
3. 백업 데이터 (`_backup_before_merge`, `_old_offday_users`, `_old_employees`)

---

## 🎉 완료!

테이블 통합이 완료되었습니다!

- ✅ 데이터 중복 제거
- ✅ 동기화 로직 제거
- ✅ 코드 단순화
- ✅ 유지보수성 향상


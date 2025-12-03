# 역할 기반 접근 제어(RBAC) 가이드

## 📌 개요

이 문서는 OffDay 시스템의 역할 기반 접근 제어(Role-Based Access Control, RBAC) 시스템에 대한 상세 가이드입니다.

## 🎯 RBAC란?

역할 기반 접근 제어(RBAC)는 사용자의 **역할(Role)**에 따라 시스템 리소스에 대한 접근 권한을 부여하는 보안 모델입니다.

### 주요 이점

1. **보안 강화**: 사용자에게 필요한 최소한의 권한만 부여 (최소 권한 원칙)
2. **관리 용이성**: 개별 사용자가 아닌 역할 단위로 권한 관리
3. **확장성**: 새로운 역할 추가가 용이
4. **감사 추적**: 역할별 활동 추적 가능

## 📊 시스템 구조

### 1. Roles 테이블 (역할 정의)

```javascript
{
    id: 1,                          // 역할 ID
    name: 'admin',                  // 역할 이름 (영문)
    displayName: '관리자',          // 표시 이름 (한글)
    description: '시스템 전체 관리 권한',
    priority: 100,                  // 우선순위 (높을수록 강력)
    permissions: ['*'],             // 권한 목록
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
}
```

### 2. Users 테이블 (사용자 역할 매핑)

```javascript
{
    id: 'admin',
    username: 'admin',
    password: 'admin123',
    role: 'admin',      // 역할 이름 (하위 호환성)
    roleId: 1,          // 역할 ID (새로운 방식) ⭐
    name: '관리자',
    email: 'admin@offday.com',
    // ... 기타 사용자 정보
}
```

## 🔑 기본 역할 (Default Roles)

시스템에는 4개의 기본 역할이 미리 정의되어 있습니다:

### 1. 관리자 (Admin)
- **ID**: 1
- **이름**: `admin`
- **권한**: 모든 권한 (`*`)
- **설명**: 시스템 전체를 관리할 수 있는 최고 관리자

### 2. 매니저 (Manager)
- **ID**: 2
- **이름**: `manager`
- **권한**:
  - 연차 승인/거부 (`leave.approve`, `leave.reject`)
  - 모든 연차 조회 (`leave.view_all`)
  - 직원 조회/수정 (`employee.view`, `employee.edit`)
  - 통계 조회 (`statistics.view`)
  - 지점 정보 조회 (`branch.view`)
  - 복지휴가 지급 (`welfare.grant`)

### 3. 팀장 (Team Leader)
- **ID**: 3
- **이름**: `team_leader`
- **권한**:
  - 팀 내 연차 승인/거부 (`leave.approve_team`, `leave.reject_team`)
  - 팀 연차 조회 (`leave.view_team`)
  - 팀원 조회 (`employee.view_team`)
  - 팀 통계 조회 (`statistics.view_team`)

### 4. 일반 사용자 (User)
- **ID**: 4
- **이름**: `user`
- **권한**:
  - 연차 신청 (`leave.request`)
  - 본인 연차 조회 (`leave.view_own`)
  - 본인 프로필 조회/수정 (`profile.view_own`, `profile.edit_own`)

## 🛠️ 주요 API

### RoleManager API

#### 역할 조회

```javascript
// 모든 역할 조회
const roles = window.roleManager.getAllRoles();

// ID로 역할 조회
const role = window.roleManager.getRole(1); // admin

// 이름으로 역할 조회
const role = window.roleManager.getRoleByName('manager');

// 역할 표시 이름 조회
const displayName = window.roleManager.getRoleDisplayName(1); // "관리자"
```

#### 권한 확인

```javascript
const user = window.authManager.getCurrentUser();

// 특정 권한 확인
const canApprove = window.roleManager.hasPermission(user, 'leave.approve');

// 여러 권한 중 하나라도 있는지 확인
const hasAny = window.roleManager.hasAnyPermission(user, ['leave.approve', 'leave.approve_team']);

// 모든 권한을 가지고 있는지 확인
const hasAll = window.roleManager.hasAllPermissions(user, ['leave.approve', 'employee.view']);

// 관리자인지 확인
const isAdmin = window.roleManager.isAdmin(user);

// 매니저 이상인지 확인
const isManagerOrAbove = window.roleManager.isManagerOrAbove(user);
```

#### 역할 관리

```javascript
// 새 역할 추가
const result = window.roleManager.addRole({
    name: 'supervisor',
    displayName: '슈퍼바이저',
    description: '부서 감독 권한',
    priority: 40,
    permissions: ['leave.view_all', 'employee.view', 'statistics.view']
});

// 역할 업데이트 (기본 역할 1-4는 표시 이름과 설명만 수정 가능)
const result = window.roleManager.updateRole(5, {
    displayName: '수정된 이름',
    permissions: ['leave.approve', 'employee.view']
});

// 역할 삭제 (기본 역할 1-4는 삭제 불가)
const result = window.roleManager.deleteRole(5);

// 사용자에게 역할 할당
const result = window.roleManager.assignRole('user123', 2); // Manager로 변경
```

### AuthGuard API

```javascript
// 현재 사용자가 관리자인지 확인
const isAdmin = window.AuthGuard.isAdmin();

// 매니저 이상인지 확인
const isManagerOrAbove = window.AuthGuard.isManagerOrAbove();

// 특정 권한 확인
const canApprove = window.AuthGuard.hasPermission('leave.approve');

// 여러 권한 중 하나라도 있는지 확인
const hasAny = window.AuthGuard.hasAnyPermission(['leave.approve', 'leave.approve_team']);

// 모든 권한을 가지고 있는지 확인
const hasAll = window.AuthGuard.hasAllPermissions(['leave.approve', 'employee.view']);

// 관리자 페이지 접근 체크 (비관리자는 대시보드로 리다이렉트)
window.AuthGuard.checkAdminAccess();

// 특정 권한이 필요한 페이지 접근 체크
window.AuthGuard.checkPermissionAccess('leave.approve');

// 여러 권한 중 하나라도 있어야 하는 페이지 접근 체크
window.AuthGuard.checkAnyPermissionAccess(['leave.approve', 'leave.approve_team']);
```

## 📝 권한 목록

### 연차 관련
- `leave.request`: 연차 신청
- `leave.approve`: 연차 승인 (전체)
- `leave.reject`: 연차 거부 (전체)
- `leave.approve_team`: 팀 내 연차 승인
- `leave.reject_team`: 팀 내 연차 거부
- `leave.view_own`: 본인 연차 조회
- `leave.view_team`: 팀 연차 조회
- `leave.view_all`: 모든 연차 조회

### 직원 관련
- `employee.view`: 직원 조회
- `employee.view_team`: 팀원 조회
- `employee.add`: 직원 추가
- `employee.edit`: 직원 수정
- `employee.delete`: 직원 삭제

### 프로필 관련
- `profile.view_own`: 본인 프로필 조회
- `profile.edit_own`: 본인 프로필 수정

### 통계 관련
- `statistics.view`: 통계 조회
- `statistics.view_team`: 팀 통계 조회

### 지점 관련
- `branch.view`: 지점 조회
- `branch.manage`: 지점 관리

### 복지휴가 관련
- `welfare.grant`: 복지휴가 지급

### 설정 관련
- `settings.view`: 설정 조회
- `settings.edit`: 설정 수정

### 시스템 관리
- `*`: 모든 권한 (관리자 전용)

## 🔄 마이그레이션

기존 사용자 데이터에 `roleId`를 추가하는 마이그레이션이 필요합니다.

### 자동 마이그레이션 실행

```javascript
// 브라우저 콘솔에서 실행
migrateUsersToRoleId();
```

### 마이그레이션 내용

1. 기존 users 데이터 백업 (`_backup_before_role_migration`)
2. `role` 문자열을 `roleId`로 변환
   - `admin` → `roleId: 1`
   - `manager` → `roleId: 2`
   - `team_leader` → `roleId: 3`
   - `user` → `roleId: 4`
3. 기존 `role` 필드는 하위 호환성을 위해 유지
4. 마이그레이션 완료 플래그 설정

### 롤백 (문제 발생 시)

```javascript
// 브라우저 콘솔에서 실행
rollbackRoleMigration();
```

## 💡 사용 예제

### 예제 1: UI 요소 조건부 표시

```javascript
// HTML
<button id="approveBtn" style="display: none;">승인</button>

// JavaScript
const currentUser = window.authManager.getCurrentUser();
if (window.roleManager.hasPermission(currentUser, 'leave.approve')) {
    document.getElementById('approveBtn').style.display = 'block';
}
```

### 예제 2: 페이지 접근 제어

```javascript
// approval.html 페이지 상단
document.addEventListener('DOMContentLoaded', function() {
    // 연차 승인 권한이 있는 사용자만 접근 가능
    window.AuthGuard.checkAnyPermissionAccess(['leave.approve', 'leave.approve_team']);
});
```

### 예제 3: 역할별 다른 UI 표시

```javascript
const user = window.authManager.getCurrentUser();

if (window.roleManager.isAdmin(user)) {
    // 관리자에게만 모든 메뉴 표시
    showAllMenus();
} else if (window.roleManager.isManagerOrAbove(user)) {
    // 매니저에게는 관리 메뉴 표시
    showManagerMenus();
} else {
    // 일반 사용자에게는 기본 메뉴만 표시
    showBasicMenus();
}
```

### 예제 4: 커스텀 역할 생성

```javascript
// 새로운 역할 추가
const result = window.roleManager.addRole({
    name: 'hr_manager',
    displayName: '인사 관리자',
    description: '인사 관련 업무 권한',
    priority: 60,
    permissions: [
        'employee.view',
        'employee.add',
        'employee.edit',
        'employee.delete',
        'leave.view_all',
        'statistics.view',
        'welfare.grant'
    ]
});

if (result.success) {
    console.log('새 역할이 추가되었습니다:', result.role);
    
    // 사용자에게 새 역할 할당
    window.roleManager.assignRole('user123', result.role.id);
}
```

## 🎨 권장 사용 패턴

### 패턴 1: 선언적 권한 체크

```javascript
// Good: 선언적이고 읽기 쉬움
function renderApprovalButton(request) {
    const canApprove = window.AuthGuard.hasPermission('leave.approve');
    
    if (canApprove) {
        return `<button onclick="approveLeave('${request.id}')">승인</button>`;
    }
    return '';
}

// Bad: 하드코딩된 역할 체크
function renderApprovalButton(request) {
    const user = window.authManager.getCurrentUser();
    
    if (user.role === 'admin' || user.role === 'manager') {  // ❌ 하드코딩
        return `<button onclick="approveLeave('${request.id}')">승인</button>`;
    }
    return '';
}
```

### 패턴 2: 최소 권한 원칙

```javascript
// Good: 필요한 최소 권한만 체크
function canEditEmployee(employeeId) {
    return window.AuthGuard.hasPermission('employee.edit');
}

// Bad: 관리자 권한만 체크 (과도한 제약)
function canEditEmployee(employeeId) {
    return window.AuthGuard.isAdmin();  // ❌ 매니저도 수정 가능해야 함
}
```

### 패턴 3: 중앙화된 권한 체크

```javascript
// Good: 권한 체크 로직을 함수로 분리
class LeaveRequestManager {
    canApproveRequest(request) {
        const user = window.authManager.getCurrentUser();
        
        // 관리자는 모든 요청 승인 가능
        if (window.roleManager.isAdmin(user)) {
            return true;
        }
        
        // 매니저는 같은 지점의 요청 승인 가능
        if (window.roleManager.hasPermission(user, 'leave.approve')) {
            return user.branch === request.branch;
        }
        
        // 팀장은 같은 팀의 요청 승인 가능
        if (window.roleManager.hasPermission(user, 'leave.approve_team')) {
            return user.team === request.team;
        }
        
        return false;
    }
    
    approveRequest(requestId) {
        const request = this.getRequest(requestId);
        
        if (!this.canApproveRequest(request)) {
            alert('승인 권한이 없습니다.');
            return;
        }
        
        // 승인 로직 실행
        // ...
    }
}

// Bad: 권한 체크를 여러 곳에 분산
function approveRequest(requestId) {
    const user = window.authManager.getCurrentUser();
    if (user.role !== 'admin' && user.role !== 'manager') {  // ❌ 중복 코드
        alert('권한 없음');
        return;
    }
    // ...
}
```

## 🔐 보안 고려사항

### 1. 클라이언트 사이드 검증의 한계

⚠️ **중요**: 이 시스템은 클라이언트 사이드(브라우저)에서 동작합니다.

- **현재 상태**: LocalStorage 기반, 프론트엔드 전용
- **보안 수준**: 낮음 (브라우저 개발자 도구로 우회 가능)
- **권장 사항**: 
  - 실제 프로덕션 환경에서는 **서버 사이드 검증 필수**
  - 민감한 데이터는 서버에서 관리
  - API 요청 시 서버에서 권한 재확인

### 2. 비밀번호 관리

현재 시스템은 평문 비밀번호를 저장합니다. 실제 환경에서는:

```javascript
// 권장: bcrypt, argon2 등 해시 알고리즘 사용
const hashedPassword = await bcrypt.hash(password, 10);
```

### 3. 토큰 기반 인증

실제 환경에서는 JWT 등을 사용하여 인증:

```javascript
// 권장: JWT 토큰 방식
const token = jwt.sign(
    { userId: user.id, roleId: user.roleId },
    secretKey,
    { expiresIn: '1h' }
);
```

## 🚀 다음 단계

### Phase 1: 현재 구현 (완료)
- ✅ 기본 RBAC 시스템
- ✅ 4가지 기본 역할
- ✅ 권한 기반 접근 제어
- ✅ LocalStorage 저장

### Phase 2: 향후 개선 사항
- [ ] 서버 사이드 통합
- [ ] JWT 토큰 기반 인증
- [ ] 비밀번호 해싱
- [ ] 역할 관리 UI
- [ ] 감사 로그 (Audit Log)
- [ ] 동적 권한 할당
- [ ] 계층적 역할 구조

### Phase 3: 고급 기능
- [ ] 임시 권한 부여
- [ ] 권한 위임
- [ ] 다중 역할 지원
- [ ] 조직 단위 기반 권한
- [ ] 시간 기반 권한

## 📚 참고 자료

- [NIST RBAC 표준](https://csrc.nist.gov/projects/role-based-access-control)
- [OWASP 접근 제어 가이드](https://owasp.org/www-community/Access_Control)
- [최소 권한 원칙](https://en.wikipedia.org/wiki/Principle_of_least_privilege)

## 🤝 기여

새로운 역할이나 권한이 필요하신가요? 다음을 참고하세요:

1. **권한 추가**: `RoleManager.getAllPermissions()`에 새 권한 추가
2. **역할 추가**: `RoleManager.addRole()` 사용
3. **테스트**: 모든 권한 체크 로직 테스트
4. **문서 업데이트**: 이 문서에 새로운 권한/역할 추가

## 📞 문의

시스템 관리자에게 문의하세요.

---

**마지막 업데이트**: 2024년 11월 16일  
**버전**: 1.0.0



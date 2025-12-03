# RBAC 시스템 빠른 시작 가이드

## 🚀 빠른 시작

### 1단계: 파일 추가 확인

다음 파일들이 추가되었는지 확인하세요:
- ✅ `js/role-manager.js` - 역할 관리 시스템
- ✅ `js/migrate-roles.js` - 마이그레이션 스크립트
- ✅ `RBAC_GUIDE.md` - 상세 가이드
- ✅ `RBAC_QUICKSTART.md` - 이 파일

### 2단계: 기존 데이터 마이그레이션

기존 사용자 데이터에 `roleId`를 추가해야 합니다.

#### 방법 1: 브라우저 콘솔에서 마이그레이션 (권장)

1. 브라우저에서 애플리케이션을 열고 **F12** 키를 눌러 개발자 도구를 엽니다
2. **Console** 탭으로 이동합니다
3. 다음 스크립트 태그를 임시로 HTML 파일에 추가하거나 콘솔에 직접 붙여넣습니다:

```html
<!-- index.html 또는 다른 HTML 파일의 </body> 전에 임시 추가 -->
<script src="js/migrate-roles.js"></script>
```

4. 페이지를 새로고침합니다
5. 콘솔에 다음 명령어를 입력합니다:

```javascript
migrateUsersToRoleId()
```

6. 마이그레이션 성공 메시지를 확인합니다:
```
🔄 Users 테이블 roleId 마이그레이션 시작...
📊 기존 사용자: X 명
💾 백업 완료
✅ 장경민 (jang@test.com): user → roleId 4
✅ 관리자 (admin@offday.com): admin → roleId 1
...
✅ 마이그레이션 완료!
```

7. 페이지를 새로고침합니다

#### 방법 2: 자동 체크 활성화

마이그레이션이 필요한 경우 콘솔에 자동으로 경고 메시지가 표시됩니다:

```
⚠️ Role 마이그레이션이 필요합니다.
실행: migrateUsersToRoleId()
```

### 3단계: 마이그레이션 확인

1. 브라우저 콘솔에서 사용자 데이터를 확인합니다:

```javascript
const users = JSON.parse(localStorage.getItem('users'));
console.table(users.map(u => ({
    이름: u.name,
    이메일: u.email,
    역할: u.role,
    역할ID: u.roleId
})));
```

2. 모든 사용자에게 `roleId`가 있는지 확인합니다:
   - admin: roleId = 1
   - manager: roleId = 2
   - team_leader: roleId = 3
   - user: roleId = 4

### 4단계: 역할 시스템 테스트

#### 기본 역할 확인

```javascript
// 모든 역할 조회
const roles = window.roleManager.getAllRoles();
console.table(roles);
```

출력 예시:
```
┌─────────┬────┬──────────────┬────────────┬──────────┬──────────┐
│ (index) │ id │     name     │ displayName│ priority │permissions│
├─────────┼────┼──────────────┼────────────┼──────────┼──────────┤
│    0    │ 1  │  'admin'     │  '관리자'  │   100    │   ['*']  │
│    1    │ 2  │  'manager'   │  '매니저'  │    50    │   [...]  │
│    2    │ 3  │'team_leader' │  '팀장'    │    30    │   [...]  │
│    3    │ 4  │  'user'      │'일반 사용자'│    10    │   [...]  │
└─────────┴────┴──────────────┴────────────┴──────────┴──────────┘
```

#### 권한 테스트

```javascript
// 현재 사용자의 권한 확인
const user = window.authManager.getCurrentUser();
console.log('현재 사용자:', user.name);
console.log('역할:', window.roleManager.getRoleDisplayName(user.roleId));

// 특정 권한 확인
console.log('연차 승인 가능:', window.roleManager.hasPermission(user, 'leave.approve'));
console.log('관리자:', window.roleManager.isAdmin(user));
console.log('매니저 이상:', window.roleManager.isManagerOrAbove(user));
```

### 5단계: UI 업데이트 (선택사항)

기존 코드를 roleManager를 사용하도록 업데이트할 수 있습니다.

#### Before (기존 방식)

```javascript
// ❌ 하드코딩된 역할 체크
if (user.role === 'admin' || user.role === 'manager') {
    showApprovalButton();
}
```

#### After (권장 방식)

```javascript
// ✅ 권한 기반 체크
if (window.roleManager.hasPermission(user, 'leave.approve')) {
    showApprovalButton();
}
```

## 🔧 문제 해결

### 문제 1: 마이그레이션 실패

**증상**: `migrateUsersToRoleId is not defined` 에러

**해결**:
1. `migrate-roles.js`가 HTML에 로드되었는지 확인
2. 페이지를 새로고침
3. 스크립트 로드 순서 확인

### 문제 2: roleId가 추가되지 않음

**증상**: 마이그레이션 후에도 `roleId`가 없음

**해결**:
```javascript
// 강제 마이그레이션
localStorage.removeItem('role_migration_completed');
migrateUsersToRoleId();
```

### 문제 3: 권한이 작동하지 않음

**증상**: `hasPermission()`이 항상 false를 반환

**해결**:
1. roleManager가 초기화되었는지 확인:
```javascript
console.log(window.roleManager);  // undefined가 아니어야 함
```

2. 사용자에게 roleId가 있는지 확인:
```javascript
const user = window.authManager.getCurrentUser();
console.log('User roleId:', user.roleId);  // undefined가 아니어야 함
```

3. role-manager.js가 로드되었는지 확인

### 문제 4: 기존 기능이 작동하지 않음

**증상**: 로그인 또는 일부 기능이 작동하지 않음

**해결**: 롤백 후 재시도

```javascript
// 마이그레이션 롤백
rollbackRoleMigration();

// 페이지 새로고침 후 다시 시도
location.reload();
```

## 🔄 롤백 (문제 발생 시)

마이그레이션에 문제가 있으면 즉시 롤백할 수 있습니다:

```javascript
// 브라우저 콘솔에서 실행
rollbackRoleMigration();
```

롤백 후:
- 기존 users 데이터가 복원됩니다
- `roleId` 필드가 제거됩니다
- role 문자열 기반으로 동작합니다

## 📝 다음 단계

1. ✅ 마이그레이션 완료
2. ✅ 역할 시스템 확인
3. 📖 [RBAC_GUIDE.md](./RBAC_GUIDE.md) 읽기
4. 🎨 UI를 roleManager 기반으로 업데이트 (선택)
5. 🔐 커스텀 역할 추가 (필요시)

## 💡 유용한 콘솔 명령어

```javascript
// 1. 모든 역할 조회
window.roleManager.getAllRoles()

// 2. 모든 사용자 조회
JSON.parse(localStorage.getItem('users'))

// 3. 현재 사용자의 역할 정보
const user = window.authManager.getCurrentUser();
window.roleManager.getUserRole(user)

// 4. 사용자에게 역할 할당
window.roleManager.assignRole('userId', 2)  // Manager로 변경

// 5. 새 역할 추가
window.roleManager.addRole({
    name: 'custom_role',
    displayName: '커스텀 역할',
    priority: 40,
    permissions: ['leave.approve_team', 'employee.view_team']
})

// 6. 모든 권한 목록 조회
window.roleManager.getAllPermissions()

// 7. 마이그레이션 상태 확인
window.checkRoleMigration()

// 8. Roles 테이블 확인
JSON.parse(localStorage.getItem('roles'))
```

## 🎯 빠른 예제

### 예제 1: 관리자만 볼 수 있는 버튼

```javascript
const user = window.authManager.getCurrentUser();
const approveBtn = document.getElementById('approve-btn');

if (window.roleManager.isAdmin(user)) {
    approveBtn.style.display = 'block';
} else {
    approveBtn.style.display = 'none';
}
```

### 예제 2: 역할별 다른 메시지

```javascript
const user = window.authManager.getCurrentUser();
const role = window.roleManager.getUserRole(user);

console.log(`안녕하세요, ${user.name} (${role.displayName})님!`);
```

### 예제 3: 권한 기반 페이지 접근 제어

```html
<script>
document.addEventListener('DOMContentLoaded', function() {
    // 연차 승인 권한이 있는 사용자만 접근 가능
    window.AuthGuard.checkPermissionAccess('leave.approve');
});
</script>
```

## 📚 더 알아보기

- [RBAC_GUIDE.md](./RBAC_GUIDE.md) - 상세 가이드
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - 테이블 통합 가이드
- [README.md](./README.md) - 프로젝트 개요

## ❓ FAQ

**Q: 기존 코드를 모두 수정해야 하나요?**
A: 아니요. 기존 `role` 필드는 하위 호환성을 위해 유지됩니다. 점진적으로 업데이트할 수 있습니다.

**Q: 새로운 역할을 추가할 수 있나요?**
A: 네, `roleManager.addRole()`을 사용하여 커스텀 역할을 추가할 수 있습니다.

**Q: 기본 역할을 수정할 수 있나요?**
A: 기본 역할(1-4)은 표시 이름과 설명만 수정 가능합니다. 권한 변경이 필요하면 새 역할을 생성하세요.

**Q: 마이그레이션은 필수인가요?**
A: 네, roleManager를 사용하려면 `roleId`가 필요합니다.

**Q: 데이터가 손실될까요?**
A: 아니요. 마이그레이션 전에 자동으로 백업이 생성되며, 롤백 기능도 제공됩니다.

---

**도움이 필요하신가요?** 시스템 관리자에게 문의하세요.



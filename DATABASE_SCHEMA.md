# 📊 OffDay 데이터베이스 테이블 구조

## 🗄️ 개요

**저장소**: LocalStorage (브라우저 기반)  
**형식**: JSON  
**총 테이블 수**: 8개  
**최종 업데이트**: 2024년 11월 16일 (RBAC 시스템 추가)

---

## 📋 테이블 목록

| 테이블명 | 키 이름 | 설명 | 관리 주체 |
|---------|---------|------|-----------|
| [Users](#1-users-테이블) | `users` | 사용자/직원 통합 테이블 | AuthManager |
| [Roles](#2-roles-테이블) | `roles` | 역할 정의 테이블 ⭐ 신규 | RoleManager |
| [LeaveRequests](#3-leaverequests-테이블) | `leaveRequests` | 연차 신청 내역 | DataManager |
| [Branches](#4-branches-테이블) | `branches` | 지점 정보 | DataManager |
| [BranchTeams](#5-branchteams-테이블) | `branchTeams` | 지점별 팀 정보 | DataManager |
| [WelfareLeaveGrants](#6-welfareleavegrants-테이블) | `welfareLeaveGrants` | 복지휴가 지급 기록 | DataManager |
| [DeletedUsers](#7-deletedusers-테이블) | `deletedUsers` | 삭제된 사용자 (Soft Delete) | AuthManager |
| [Settings](#8-settings-테이블) | `settings` | 시스템 설정 | DataManager |

---

## 1. Users 테이블

**키 이름**: `users`  
**타입**: Array of Objects  
**설명**: 사용자와 직원 정보를 통합한 메인 테이블

### 구조

```javascript
{
    // 인증 정보
    id: String,                    // 사용자 ID (고유키) - 예: "admin", "1", "1234567890"
    username: String,              // 로그인 아이디
    password: String,              // 비밀번호 (⚠️ 평문 저장 - 프로덕션 환경에서는 해시 필요)
    role: String,                  // 역할 문자열 (하위 호환성) - "admin", "manager", "team_leader", "user"
    roleId: Number,                // 역할 ID ⭐ 신규 - 1(admin), 2(manager), 3(team_leader), 4(user)
    
    // 개인 정보
    name: String,                  // 이름
    email: String,                 // 이메일 (고유)
    phone: String,                 // 전화번호
    birthDate: String,             // 생년월일 (YYYY-MM-DD)
    profileImage: String,          // 프로필 이미지 URL
    
    // 회사 정보
    branch: String,                // 지점명
    branchId: Number,              // 지점 ID (FK → branches.id)
    department: String,            // 부서명
    team: String,                  // 팀명
    position: String,              // 직급
    hireDate: String,              // 입사일 (YYYY-MM-DD)
    
    // 연차 정보
    annualLeaveDays: Number,       // 연간 총 연차 일수 (기본: 15)
    usedLeaveDays: Number,         // 사용한 연차 일수
    remainingLeaveDays: Number,    // 남은 연차 일수
    welfareLeaveDays: Number,      // 복지 휴가 일수
    
    // 상태 정보
    status: String,                // 상태 - "active", "resigned", "deleted"
    resignationDate: String|null,  // 퇴사일 (YYYY-MM-DD)
    createdAt: String,             // 생성일시 (ISO 8601)
    updatedAt: String,             // 수정일시 (ISO 8601)
    deletedAt: String|null         // 삭제일시 (ISO 8601) - Soft Delete
}
```

### 예제

```javascript
{
    id: "admin",
    username: "admin",
    password: "admin123",
    role: "admin",
    roleId: 1,
    name: "관리자",
    email: "admin@offday.com",
    phone: "010-0000-0000",
    birthDate: "1990-01-01",
    profileImage: "",
    branch: "본사",
    branchId: 1,
    department: "경영관리팀",
    team: "경영관리팀",
    position: "관리자",
    hireDate: "2020-01-01",
    annualLeaveDays: 15,
    usedLeaveDays: 0,
    remainingLeaveDays: 15,
    welfareLeaveDays: 0,
    status: "active",
    resignationDate: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    deletedAt: null
}
```

### 인덱스 (검색 키)

- **Primary Key**: `id`
- **Unique Key**: `email`
- **Index**: `status`, `branch`, `department`, `role`, `roleId`

### 제약 조건

- `id`, `username`, `email`, `name`: 필수
- `email`: 중복 불가 (활성 사용자 중)
- `status`: "active", "resigned", "deleted" 중 하나
- `roleId`: 1, 2, 3, 4 (기본 역할) 또는 커스텀 역할 ID

---

## 2. Roles 테이블

**키 이름**: `roles`  
**타입**: Array of Objects  
**설명**: 역할 기반 접근 제어(RBAC)를 위한 역할 정의 테이블 ⭐ 신규 추가

### 구조

```javascript
{
    id: Number,                    // 역할 ID (고유키, 자동 생성)
    name: String,                  // 역할 이름 (영문, 고유) - 예: "admin", "manager"
    displayName: String,           // 표시 이름 (한글) - 예: "관리자", "매니저"
    description: String,           // 역할 설명
    priority: Number,              // 우선순위 (높을수록 강력) - 예: 100(admin), 50(manager)
    permissions: Array<String>,    // 권한 목록 - 예: ["leave.approve", "employee.view"]
    createdAt: String,             // 생성일시 (ISO 8601)
    updatedAt: String              // 수정일시 (ISO 8601)
}
```

### 기본 역할

| ID | name | displayName | priority | permissions |
|----|------|-------------|----------|-------------|
| 1 | admin | 관리자 | 100 | `["*"]` (모든 권한) |
| 2 | manager | 매니저 | 50 | 연차 승인, 직원 관리, 통계 조회 등 8개 |
| 3 | team_leader | 팀장 | 30 | 팀 내 연차 승인, 팀원 조회 등 5개 |
| 4 | user | 일반 사용자 | 10 | 연차 신청, 본인 정보 조회/수정 등 4개 |

### 권한 목록 (총 26개)

#### 연차 (leave)
- `leave.request` - 연차 신청
- `leave.approve` - 연차 승인 (전체)
- `leave.reject` - 연차 거부 (전체)
- `leave.approve_team` - 팀 내 연차 승인
- `leave.reject_team` - 팀 내 연차 거부
- `leave.view_own` - 본인 연차 조회
- `leave.view_team` - 팀 연차 조회
- `leave.view_all` - 모든 연차 조회

#### 직원 (employee)
- `employee.view` - 직원 조회
- `employee.view_team` - 팀원 조회
- `employee.add` - 직원 추가
- `employee.edit` - 직원 수정
- `employee.delete` - 직원 삭제

#### 프로필 (profile)
- `profile.view_own` - 본인 프로필 조회
- `profile.edit_own` - 본인 프로필 수정

#### 통계 (statistics)
- `statistics.view` - 통계 조회
- `statistics.view_team` - 팀 통계 조회

#### 지점 (branch)
- `branch.view` - 지점 조회
- `branch.manage` - 지점 관리

#### 복지휴가 (welfare)
- `welfare.grant` - 복지휴가 지급

#### 설정 (settings)
- `settings.view` - 설정 조회
- `settings.edit` - 설정 수정

#### 시스템 (system)
- `*` - 모든 권한 (관리자 전용)

### 예제

```javascript
{
    id: 2,
    name: "manager",
    displayName: "매니저",
    description: "부서 관리 및 승인 권한",
    priority: 50,
    permissions: [
        "leave.approve",
        "leave.reject",
        "leave.view_all",
        "employee.view",
        "employee.edit",
        "statistics.view",
        "branch.view",
        "welfare.grant"
    ],
    createdAt: "2024-11-16T00:00:00.000Z",
    updatedAt: "2024-11-16T00:00:00.000Z"
}
```

### 제약 조건

- `id`: 1-4는 기본 역할 (수정 제한)
- `name`: 중복 불가
- 기본 역할은 삭제 불가

---

## 3. LeaveRequests 테이블

**키 이름**: `leaveRequests`  
**타입**: Array of Objects  
**설명**: 연차 신청 및 승인 내역

### 구조

```javascript
{
    id: Number,                    // 신청 ID (고유키, 자동 생성)
    employeeId: Number|String,     // 직원 ID (FK → users.id)
    employeeName: String,          // 직원 이름 (중복 저장)
    leaveType: String,             // 연차 유형 - "연차", "반차", "병가", "경조사", "개인사정", "기타"
    startDate: String,             // 시작일 (YYYY-MM-DD)
    endDate: String,               // 종료일 (YYYY-MM-DD)
    days: Number,                  // 사용 일수 (반차: 0.5)
    reason: String,                // 신청 사유
    status: String,                // 상태 - "pending", "approved", "rejected"
    requestDate: String,           // 신청일 (YYYY-MM-DD)
    approvalDate: String,          // 승인/거부일 (YYYY-MM-DD) - 선택
    approver: String,              // 승인자 이름 - 선택
    rejectionReason: String,       // 거부 사유 - 선택
    type: String                   // 구분 - "휴가"
}
```

### 예제

```javascript
{
    id: 1,
    employeeId: 1,
    employeeName: "장경민",
    leaveType: "연차",
    startDate: "2024-12-01",
    endDate: "2024-12-01",
    days: 1,
    reason: "개인사정",
    status: "approved",
    requestDate: "2024-11-20",
    approvalDate: "2024-11-21",
    approver: "관리자",
    rejectionReason: null,
    type: "휴가"
}
```

### 인덱스

- **Primary Key**: `id`
- **Foreign Key**: `employeeId` → `users.id`
- **Index**: `status`, `startDate`, `employeeId`

### 상태 흐름

```
pending (대기) → approved (승인)
                ↓
              rejected (거부)
```

---

## 4. Branches 테이블

**키 이름**: `branches`  
**타입**: Array of Objects  
**설명**: 지점 정보

### 구조

```javascript
{
    id: Number,                    // 지점 ID (고유키)
    name: String,                  // 지점명
    address: String,               // 주소
    phone: String,                 // 전화번호
    manager: String,               // 지점장 이름
    description: String,           // 설명
    createdAt: String,             // 생성일 (YYYY-MM-DD)
    departments: Array<String>,    // 부서 목록
    leaveCalculationStandard: String  // 연차 계산 기준 - "hire_date" 또는 "fiscal_year"
}
```

### 예제

```javascript
{
    id: 1,
    name: "본사",
    address: "서울특별시 강남구 테헤란로 123",
    phone: "02-1234-5678",
    manager: "김대표",
    description: "본사 건물입니다.",
    createdAt: "2024-01-01",
    departments: ["경영관리팀", "개발팀", "마케팅팀", "인사팀"],
    leaveCalculationStandard: "hire_date"
}
```

### 인덱스

- **Primary Key**: `id`
- **Unique Key**: `name`

---

## 5. BranchTeams 테이블

**키 이름**: `branchTeams`  
**타입**: Object (Key-Value)  
**설명**: 지점별 팀 정보 (지점ID를 키로 사용)

### 구조

```javascript
{
    [branchId: Number]: Array<String>  // 지점 ID → 팀 목록
}
```

### 예제

```javascript
{
    "1": ["경영관리팀", "개발팀", "마케팅팀", "인사팀"],
    "2": ["영업팀", "컨설팅팀", "지원팀"],
    "3": ["경영관리팀", "택스팀", "컨설팅팀"]
}
```

---

## 6. WelfareLeaveGrants 테이블

**키 이름**: `welfareLeaveGrants`  
**타입**: Array of Objects  
**설명**: 복지휴가 지급 내역

### 구조

```javascript
{
    id: Number,                    // 지급 ID (고유키, 자동 생성)
    employeeId: Number|String,     // 직원 ID (FK → users.id)
    employeeName: String,          // 직원 이름
    days: Number,                  // 지급 일수
    reason: String,                // 지급 사유
    grantDate: String,             // 지급일 (YYYY-MM-DD)
    grantor: String,               // 지급자 (관리자 이름)
    createdAt: String              // 생성일시 (ISO 8601)
}
```

### 예제

```javascript
{
    id: 1,
    employeeId: "1",
    employeeName: "장경민",
    days: 2,
    reason: "우수 직원 포상",
    grantDate: "2024-11-15",
    grantor: "관리자",
    createdAt: "2024-11-15T09:00:00.000Z"
}
```

### 인덱스

- **Primary Key**: `id`
- **Foreign Key**: `employeeId` → `users.id`
- **Index**: `grantDate`, `employeeId`

---

## 7. DeletedUsers 테이블

**키 이름**: `deletedUsers`  
**타입**: Array of Objects  
**설명**: 삭제된 사용자 추적 (Soft Delete)

### 구조

```javascript
{
    id: String,                    // 사용자 ID (users.id와 동일)
    email: String,                 // 이메일
    name: String,                  // 이름
    deletedAt: String,             // 삭제일시 (ISO 8601)
    deletedBy: String              // 삭제자 (관리자 이름)
}
```

### 예제

```javascript
{
    id: "5",
    email: "user@test.com",
    name: "이대구",
    deletedAt: "2024-11-15T14:30:00.000Z",
    deletedBy: "관리자"
}
```

### 참고

- 실제 사용자 데이터는 `users` 테이블에 남아있으며 `status: "deleted"` 상태로 변경됨
- 이 테이블은 삭제 기록 추적용

---

## 8. Settings 테이블

**키 이름**: `settings`  
**타입**: Object (Key-Value)  
**설명**: 시스템 설정

### 구조

```javascript
{
    [settingKey: String]: Any      // 설정 키 → 설정 값
}
```

### 주요 설정 키

- `leaveCalculationMethod`: 연차 계산 방식
- `defaultAnnualLeaveDays`: 기본 연차 일수
- `maxLeaveRequestDays`: 최대 신청 가능 일수
- `requireApproval`: 승인 필요 여부

### 예제

```javascript
{
    "leaveCalculationMethod": "hire_date",
    "defaultAnnualLeaveDays": 15,
    "maxLeaveRequestDays": 10,
    "requireApproval": true
}
```

---

## 🔄 테이블 간 관계 (ERD)

```
┌─────────────┐
│   Roles     │
│  (역할)     │
└─────────────┘
       ↑ 1
       │
       │ roleId (FK)
       │
       │ N
┌─────────────┐       1         N  ┌──────────────────┐
│    Users    │───────────────────→│ LeaveRequests    │
│ (사용자)    │  employeeId (FK)   │  (연차 신청)     │
└─────────────┘                    └──────────────────┘
       │
       │ branchId (FK)
       │
       ↓ N
┌─────────────┐       1         N  ┌──────────────────┐
│  Branches   │───────────────────→│  BranchTeams     │
│  (지점)     │    branchId (키)   │ (지점별 팀)      │
└─────────────┘                    └──────────────────┘

┌─────────────┐                    ┌──────────────────┐
│    Users    │───────────────────→│WelfareLeaveGrants│
│ (사용자)    │  employeeId (FK)   │(복지휴가 지급)   │
└─────────────┘                    └──────────────────┘

┌─────────────┐                    ┌──────────────────┐
│    Users    │───────────────────→│  DeletedUsers    │
│ (사용자)    │    Soft Delete     │ (삭제된 사용자)  │
└─────────────┘                    └──────────────────┘
```

---

## 📈 데이터 통계

### 기본 생성 데이터

| 테이블 | 기본 레코드 수 |
|--------|---------------|
| Users | 1 (admin) |
| Roles | 4 (기본 역할) |
| Branches | 6 (샘플 지점) |
| BranchTeams | 6 (지점별 팀) |
| LeaveRequests | 0 |
| WelfareLeaveGrants | 0 |
| DeletedUsers | 0 |
| Settings | 0 |

### 샘플 데이터 (테스트용)

`offday_auto_seed === '1'` 설정 시 자동 생성:
- Users: 5명 (admin + 4명의 테스트 사용자)
- LeaveRequests: 5건

---

## 🔐 보안 고려사항

### 현재 상태

1. **저장소**: LocalStorage (클라이언트)
2. **비밀번호**: 평문 저장 ⚠️
3. **인증**: 세션 기반 (LocalStorage)
4. **권한**: RBAC (roleId 기반)

### 프로덕션 환경 권장사항

1. **백엔드 데이터베이스 사용**
   - PostgreSQL, MySQL, MongoDB 등
   - 서버 사이드 데이터 관리

2. **비밀번호 보안**
   ```javascript
   // 권장: bcrypt 등 해시 알고리즘
   const hashedPassword = await bcrypt.hash(password, 10);
   ```

3. **인증 토큰**
   ```javascript
   // 권장: JWT 토큰
   const token = jwt.sign(
       { userId: user.id, roleId: user.roleId },
       secretKey,
       { expiresIn: '1h' }
   );
   ```

4. **서버 사이드 검증**
   - 모든 권한 체크를 서버에서 재검증
   - API 엔드포인트 보호

---

## 🛠️ 데이터 접근 방법

### JavaScript에서 접근

```javascript
// 1. 직접 접근
const users = JSON.parse(localStorage.getItem('users') || '[]');
const roles = JSON.parse(localStorage.getItem('roles') || '[]');

// 2. DataManager 사용 (권장)
const dm = window.dataManager;
const users = dm.getUsers();
const branches = dm.branches;
const leaveRequests = dm.leaveRequests;

// 3. AuthManager 사용
const currentUser = window.authManager.getCurrentUser();

// 4. RoleManager 사용
const roles = window.roleManager.getAllRoles();
const canApprove = window.roleManager.hasPermission(user, 'leave.approve');
```

### 브라우저 개발자 도구

```javascript
// F12 → Application/Storage → Local Storage

// 조회
localStorage.getItem('users')
localStorage.getItem('roles')

// 저장
localStorage.setItem('users', JSON.stringify(usersArray))

// 삭제
localStorage.removeItem('users')

// 전체 삭제
localStorage.clear()
```

---

## 📊 마이그레이션 이력

### v1.0 → v2.0 (테이블 통합)
- `offday_users` + `employees` → `users` (통합)
- `deletedEmployees` → `deletedUsers` 통합
- 중복 데이터 제거
- 필드 표준화

### v2.0 → v3.0 (RBAC 추가)
- `roles` 테이블 신규 추가 ⭐
- `users.roleId` 필드 추가
- 26개 권한 정의
- 4개 기본 역할 생성

---

## 📞 문의

DB 구조에 대한 질문이나 개선 제안은 시스템 관리자에게 문의하세요.

**문서 버전**: 3.0  
**최종 업데이트**: 2024년 11월 16일


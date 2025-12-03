# 📦 데이터 마이그레이션 가이드

## 목차
1. [마이그레이션 개요](#마이그레이션-개요)
2. [사전 준비](#사전-준비)
3. [마이그레이션 실행](#마이그레이션-실행)
4. [검증 및 테스트](#검증-및-테스트)
5. [롤백 절차](#롤백-절차)
6. [문제 해결](#문제-해결)

---

## 마이그레이션 개요

### 마이그레이션 대상

**LocalStorage → Supabase**

| 데이터 | LocalStorage Key | Supabase Table | 우선순위 |
|--------|------------------|----------------|----------|
| 사용자 | `users` | `users` | 🔴 높음 |
| 역할 | `roles` | `roles` | 🔴 높음 |
| 지점 | `branches` | `branches` | 🟡 중간 |
| 팀 | `branchTeams` | `teams` | 🟡 중간 |
| 연차 신청 | `leaveRequests` | `leave_requests` | 🔴 높음 |
| 복지 휴가 | `welfareLeaveGrants` | `welfare_leave_grants` | 🟢 낮음 |
| 설정 | `settings` | `settings` | 🟢 낮음 |

### 마이그레이션 순서

```
1. Groups (기본 그룹) ✓
2. Roles (기본 역할) ✓
3. Branches (지점 정보)
4. Teams (팀 정보)
5. Users (사용자 정보)
6. Users_Roles (역할 매핑)
7. Leave Requests (연차 신청)
8. Welfare Leave Grants (복지 휴가)
9. Settings (설정)
```

⚠️ **주의**: 순서를 변경하면 외래 키(FK) 제약 조건으로 인해 실패할 수 있습니다.

---

## 사전 준비

### 1. 백업

```javascript
// 브라우저 콘솔에서 실행
function backupLocalStorage() {
    const backup = {};
    const keys = [
        'users', 'roles', 'branches', 'branchTeams',
        'leaveRequests', 'welfareLeaveGrants', 'settings'
    ];
    
    keys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
            backup[key] = data;
        }
    });
    
    // JSON 파일로 다운로드
    const blob = new Blob([JSON.stringify(backup, null, 2)], 
                          { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offday-backup-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('백업 완료:', backup);
    return backup;
}

// 실행
backupLocalStorage();
```

### 2. Supabase 설정 확인

```javascript
// 브라우저 콘솔에서 Supabase 연결 확인
if (window.supabaseClient) {
    console.log('✓ Supabase 클라이언트 초기화됨');
    
    // 연결 테스트
    const test = await window.supabaseClient
        .from('groups')
        .select('count');
    
    if (test.error) {
        console.error('✗ Supabase 연결 실패:', test.error);
    } else {
        console.log('✓ Supabase 연결 성공');
    }
} else {
    console.error('✗ Supabase 클라이언트가 초기화되지 않았습니다');
}
```

### 3. 스키마 적용 확인

Supabase Dashboard > SQL Editor에서 확인:

```sql
-- 테이블 존재 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 예상 결과: 
-- branches, deleted_users, groups, leave_requests, 
-- roles, settings, teams, users, users_roles, welfare_leave_grants
```

### 4. 마이그레이션 스크립트 로드

HTML 파일에 스크립트 추가:

```html
<!-- index.html 또는 별도 마이그레이션 페이지 -->
<script src="js/supabase-init.js"></script>
<script src="js/supabase-migration.js"></script>
```

---

## 마이그레이션 실행

### 방법 1: 브라우저 콘솔 (권장)

#### 단계 1: 마이그레이션 객체 생성

```javascript
const migration = new SupabaseMigration();
```

#### 단계 2: 전체 마이그레이션 실행

```javascript
const result = await migration.migrateAll();

if (result.success) {
    console.log('✓ 마이그레이션 성공!');
    console.log('로그:', result.log);
} else {
    console.error('✗ 마이그레이션 실패:', result.error);
    console.log('로그:', result.log);
}
```

#### 단계 3: 검증

```javascript
const validation = await migration.validateMigration();
console.log('검증 결과:', validation);
```

#### 단계 4: 로그 다운로드

```javascript
migration.downloadLog();
```

### 방법 2: 개별 테이블 마이그레이션

```javascript
const migration = new SupabaseMigration();

// 1. Groups
await migration.migrateGroups();

// 2. Branches
await migration.migrateBranches();

// 3. Teams
await migration.migrateTeams();

// 4. Users (가장 중요!)
await migration.migrateUsers();

// 5. Leave Requests
await migration.migrateLeaveRequests();

// 6. Welfare Leave Grants
await migration.migrateWelfareLeaveGrants();

// 7. Settings
await migration.migrateSettings();
```

### 방법 3: 마이그레이션 페이지 생성 (UI)

`migration.html` 파일 생성:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>데이터 마이그레이션</title>
    <link rel="stylesheet" href="styles/main.css">
    <style>
        .migration-container {
            max-width: 800px;
            margin: 50px auto;
            padding: 30px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .progress-item {
            padding: 15px;
            margin: 10px 0;
            border-left: 4px solid #ddd;
            background: #f9f9f9;
        }
        .progress-item.success {
            border-color: #4CAF50;
            background: #e8f5e9;
        }
        .progress-item.error {
            border-color: #f44336;
            background: #ffebee;
        }
        .progress-item.pending {
            border-color: #2196F3;
            background: #e3f2fd;
        }
        .btn-migrate {
            padding: 15px 30px;
            font-size: 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin-right: 10px;
        }
        .btn-migrate:hover {
            opacity: 0.9;
        }
        .btn-migrate:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        #log-container {
            max-height: 400px;
            overflow-y: auto;
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="migration-container">
        <h1>🔄 데이터 마이그레이션</h1>
        <p>LocalStorage 데이터를 Supabase로 마이그레이션합니다.</p>
        
        <div style="margin: 20px 0;">
            <button id="btnBackup" class="btn-migrate">📦 백업 생성</button>
            <button id="btnMigrate" class="btn-migrate">🚀 마이그레이션 시작</button>
            <button id="btnValidate" class="btn-migrate" disabled>✓ 검증</button>
            <button id="btnDownloadLog" class="btn-migrate" disabled>📥 로그 다운로드</button>
        </div>
        
        <h3>진행 상황</h3>
        <div id="progress-container"></div>
        
        <h3>상세 로그</h3>
        <div id="log-container"></div>
    </div>

    <script src="js/supabase-init.js"></script>
    <script src="js/supabase-migration.js"></script>
    <script>
        let migration;
        
        // 백업 버튼
        document.getElementById('btnBackup').addEventListener('click', function() {
            const backup = {};
            const keys = [
                'users', 'roles', 'branches', 'branchTeams',
                'leaveRequests', 'welfareLeaveGrants', 'settings'
            ];
            
            keys.forEach(key => {
                const data = localStorage.getItem(key);
                if (data) backup[key] = data;
            });
            
            const blob = new Blob([JSON.stringify(backup, null, 2)], 
                                { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `offday-backup-${new Date().toISOString()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            addLog('백업 파일 생성 완료', 'success');
        });
        
        // 마이그레이션 시작 버튼
        document.getElementById('btnMigrate').addEventListener('click', async function() {
            this.disabled = true;
            
            migration = new SupabaseMigration();
            
            const progressContainer = document.getElementById('progress-container');
            progressContainer.innerHTML = '';
            
            // 진행 상황 표시
            const steps = [
                'Groups', 'Roles', 'Branches', 'Teams', 
                'Users', 'Leave Requests', 'Welfare Leave Grants', 'Settings'
            ];
            
            steps.forEach(step => {
                const div = document.createElement('div');
                div.className = 'progress-item pending';
                div.id = `step-${step.replace(/\s/g, '')}`;
                div.textContent = `⏳ ${step}`;
                progressContainer.appendChild(div);
            });
            
            try {
                const result = await migration.migrateAll();
                
                if (result.success) {
                    addLog('=== 마이그레이션 완료 ===', 'success');
                    document.getElementById('btnValidate').disabled = false;
                    document.getElementById('btnDownloadLog').disabled = false;
                    
                    // 모든 단계를 성공으로 표시
                    steps.forEach(step => {
                        const div = document.getElementById(`step-${step.replace(/\s/g, '')}`);
                        div.className = 'progress-item success';
                        div.textContent = `✓ ${step}`;
                    });
                } else {
                    addLog(`마이그레이션 실패: ${result.error}`, 'error');
                }
                
                // 로그 표시
                result.log.forEach(log => {
                    addLog(log.message, log.type);
                });
            } catch (error) {
                addLog(`오류 발생: ${error.message}`, 'error');
            }
        });
        
        // 검증 버튼
        document.getElementById('btnValidate').addEventListener('click', async function() {
            try {
                const validation = await migration.validateMigration();
                addLog(`검증 결과: ${JSON.stringify(validation, null, 2)}`, 'info');
            } catch (error) {
                addLog(`검증 실패: ${error.message}`, 'error');
            }
        });
        
        // 로그 다운로드 버튼
        document.getElementById('btnDownloadLog').addEventListener('click', function() {
            migration.downloadLog();
            addLog('로그 파일 다운로드 완료', 'success');
        });
        
        // 로그 추가 함수
        function addLog(message, type = 'info') {
            const logContainer = document.getElementById('log-container');
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = document.createElement('div');
            logEntry.style.color = type === 'error' ? '#f44336' : 
                                  type === 'success' ? '#4CAF50' : '#333';
            logEntry.textContent = `[${timestamp}] ${message}`;
            logContainer.appendChild(logEntry);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    </script>
</body>
</html>
```

---

## 검증 및 테스트

### 1. 데이터 개수 확인

```javascript
// Supabase에서 데이터 개수 확인
async function checkDataCount() {
    const tables = ['users', 'branches', 'teams', 'leave_requests', 
                   'welfare_leave_grants', 'settings'];
    
    for (const table of tables) {
        const { count, error } = await window.supabaseClient
            .from(table)
            .select('*', { count: 'exact', head: true });
        
        console.log(`${table}: ${count}개`);
    }
}

await checkDataCount();
```

### 2. 샘플 데이터 확인

```javascript
// 사용자 데이터 샘플 확인
const { data: users, error } = await window.supabaseClient
    .from('users')
    .select('id, name, email, annual_leave_days, remaining_leave_days')
    .limit(5);

console.table(users);
```

### 3. 외래 키 관계 확인

```sql
-- Supabase SQL Editor에서 실행

-- Users와 Branches 관계 확인
SELECT u.id, u.name, b.name as branch_name
FROM users u
LEFT JOIN branches b ON u.branch_id = b.id
LIMIT 10;

-- Users와 Roles 관계 확인
SELECT u.name, r.display_name as role
FROM users u
JOIN users_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
LIMIT 10;

-- Leave Requests와 Users 관계 확인
SELECT lr.id, u.name as employee, lr.leave_type, lr.status
FROM leave_requests lr
JOIN users u ON lr.employee_id = u.id
LIMIT 10;
```

### 4. 연차 계산 검증

```javascript
// 연차 계산이 올바른지 확인
const { data: users } = await window.supabaseClient
    .from('users')
    .select('name, annual_leave_days, used_leave_days, remaining_leave_days');

users.forEach(user => {
    const expected = user.annual_leave_days - user.used_leave_days;
    if (Math.abs(user.remaining_leave_days - expected) > 0.1) {
        console.warn(`연차 계산 오류: ${user.name}`, {
            annual: user.annual_leave_days,
            used: user.used_leave_days,
            remaining: user.remaining_leave_days,
            expected: expected
        });
    }
});
```

### 5. 비교 테스트

```javascript
// LocalStorage vs Supabase 데이터 비교
async function compareData() {
    const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const { data: supabaseUsers } = await window.supabaseClient
        .from('users')
        .select('*');
    
    console.log('LocalStorage 사용자 수:', localUsers.length);
    console.log('Supabase 사용자 수:', supabaseUsers.length);
    
    if (localUsers.length !== supabaseUsers.length) {
        console.warn('⚠️ 사용자 수가 일치하지 않습니다!');
    }
    
    // 각 사용자별 비교
    localUsers.forEach(localUser => {
        const supabaseUser = supabaseUsers.find(u => u.id === localUser.id);
        if (!supabaseUser) {
            console.error(`❌ 마이그레이션 누락: ${localUser.name} (${localUser.id})`);
        }
    });
}

await compareData();
```

---

## 롤백 절차

### 1. 백업에서 복원

```javascript
// 백업 파일 로드
function restoreFromBackup(backupData) {
    try {
        Object.entries(backupData).forEach(([key, value]) => {
            localStorage.setItem(key, value);
            console.log(`✓ ${key} 복원 완료`);
        });
        
        console.log('✓ 백업 복원 완료');
        location.reload();
    } catch (error) {
        console.error('✗ 복원 실패:', error);
    }
}

// 사용법:
// 1. 백업 파일 내용을 복사
// 2. 브라우저 콘솔에서 실행
const backupData = {
    // 백업 파일의 JSON 내용 붙여넣기
};
restoreFromBackup(backupData);
```

### 2. Supabase 데이터 삭제

⚠️ **주의**: 이 작업은 되돌릴 수 없습니다!

```sql
-- Supabase SQL Editor에서 실행 (신중하게!)

-- 역순으로 삭제 (외래 키 제약 조건 때문)
DELETE FROM welfare_leave_grants;
DELETE FROM leave_requests;
DELETE FROM users_roles;
DELETE FROM users WHERE id != 'admin'; -- 관리자 제외
DELETE FROM teams;
DELETE FROM branches WHERE id > 1; -- 기본 지점 제외
-- roles와 groups는 기본 데이터이므로 삭제하지 않음
```

---

## 문제 해결

### 문제 1: "duplicate key value violates unique constraint"

**원인**: 이미 존재하는 ID로 삽입 시도

**해결**:
```javascript
// upsert 사용 (삽입 또는 업데이트)
const { error } = await window.supabaseClient
    .from('users')
    .upsert(data, { onConflict: 'id' }); // 중복 시 업데이트
```

### 문제 2: "insert or update violates foreign key constraint"

**원인**: 참조하는 레코드가 없음 (예: branch_id가 존재하지 않는 지점)

**해결**:
```javascript
// 1. 참조 테이블 먼저 마이그레이션
await migration.migrateBranches(); // 먼저
await migration.migrateUsers();    // 나중

// 2. 또는 NULL 허용
const { error } = await window.supabaseClient
    .from('users')
    .update({ branch_id: null })
    .eq('branch_id', invalidBranchId);
```

### 문제 3: "row-level security policy"

**원인**: RLS 정책으로 인한 권한 부족

**해결 (임시)**:
```sql
-- Supabase SQL Editor에서 실행
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- 마이그레이션 완료 후
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

**해결 (영구)**:
```javascript
// Service Role Key 사용 (서버 사이드에서만)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ 클라이언트에 노출 금지
);
```

### 문제 4: 대용량 데이터 마이그레이션 시 타임아웃

**해결**: 배치 처리

```javascript
async function migrateLargeData(data, batchSize = 100) {
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        const { error } = await window.supabaseClient
            .from('users')
            .upsert(batch);
        
        if (error) {
            console.error(`Batch ${i / batchSize + 1} failed:`, error);
            throw error;
        }
        
        console.log(`✓ Batch ${i / batchSize + 1} completed (${batch.length} records)`);
        
        // 잠시 대기 (Rate Limit 방지)
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}
```

### 문제 5: UUID 변환 이슈

**해결**:
```javascript
// 정수 ID를 UUID로 변환
function generateUuidFromId(id) {
    // 방법 1: 고정 UUID namespace 사용
    const namespace = '550e8400-e29b-41d4-a716-446655440000';
    return uuidv5(String(id), namespace);
    
    // 방법 2: 간단한 UUID 생성
    return `00000000-0000-0000-0000-${String(id).padStart(12, '0')}`;
}
```

---

## 마이그레이션 체크리스트

### 마이그레이션 전
- [ ] LocalStorage 백업 완료
- [ ] Supabase 프로젝트 생성 완료
- [ ] 스키마 적용 완료
- [ ] 마이그레이션 스크립트 로드 확인
- [ ] 테스트 환경에서 파일럿 테스트 완료

### 마이그레이션 중
- [ ] Groups 마이그레이션
- [ ] Roles 확인 (스키마에 포함)
- [ ] Branches 마이그레이션
- [ ] Teams 마이그레이션
- [ ] Users 마이그레이션
- [ ] Users_Roles 매핑
- [ ] Leave Requests 마이그레이션
- [ ] Welfare Leave Grants 마이그레이션
- [ ] Settings 마이그레이션

### 마이그레이션 후
- [ ] 데이터 개수 검증
- [ ] 샘플 데이터 확인
- [ ] 외래 키 관계 검증
- [ ] 연차 계산 검증
- [ ] 비교 테스트 완료
- [ ] 로그 다운로드 및 보관
- [ ] 사용자 수용 테스트(UAT)
- [ ] 프로덕션 전환

---

## 마이그레이션 타임라인 (예상)

| 데이터 규모 | 예상 시간 | 비고 |
|------------|----------|------|
| 소규모 (< 100명) | 1-2분 | 브라우저에서 즉시 실행 가능 |
| 중규모 (100-1000명) | 5-10분 | 배치 처리 권장 |
| 대규모 (> 1000명) | 30분-1시간 | 서버 사이드 스크립트 권장 |

---

## 다음 단계

마이그레이션 완료 후:

1. ✅ [Vercel 배포](./VERCEL_DEPLOYMENT_GUIDE.md)
2. ✅ [기존 시스템 연동](./LEGACY_SYSTEM_INTEGRATION.md)
3. ✅ 사용자 교육 및 온보딩

---

## 지원

마이그레이션 중 문제가 발생하면:
- 📧 support@your-company.com
- 💬 Slack: #offday-migration
- 📞 긴급 지원: 010-XXXX-XXXX

**문서 버전**: 1.0  
**최종 업데이트**: 2024년 12월


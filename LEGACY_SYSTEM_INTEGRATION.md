# 🔗 기존 시스템 통합 가이드

## 목차
1. [개요](#개요)
2. [데이터베이스 구조 매핑](#데이터베이스-구조-매핑)
3. [통합 시나리오](#통합-시나리오)
4. [API 연동 방법](#api-연동-방법)
5. [데이터 동기화](#데이터-동기화)
6. [인증 통합](#인증-통합)
7. [문제 해결](#문제-해결)

---

## 개요

### 기존 시스템 구조

기존 내부 웹 프로그램의 데이터베이스 구조:

| 테이블 | 주요 필드 | 용도 |
|--------|-----------|------|
| **users** | id, group_id, team_id, login_id, password, name, email, phone | 사용자 정보 |
| **users_roles** | user_id, role_id | 사용자-역할 매핑 |
| **branches** | id, name, group_id, master_client_id, multicase_client_id | 지점 정보 |
| **teams** | id, name, branch_id | 팀 정보 |
| **roles** | id, group_id, name | 역할 정의 |

### Offday 시스템 구조

Supabase 데이터베이스 구조가 기존 시스템과 **완전히 호환**되도록 설계됨:

✅ **동일한 테이블 구조**
- `users` 테이블: 기존 필드 + 연차 관련 필드 추가
- `users_roles` 테이블: 동일한 구조
- `branches` 테이블: 기존 필드 + 연차 계산 설정 추가
- `teams` 테이블: 동일한 구조
- `roles` 테이블: 기존 필드 + 권한 시스템 추가

✅ **추가된 테이블**
- `leave_requests`: 연차 신청 관리
- `welfare_leave_grants`: 복지 휴가 지급
- `settings`: 시스템 설정
- `deleted_users`: 삭제된 사용자 추적

---

## 데이터베이스 구조 매핑

### 1. Users 테이블

#### 기존 시스템 → Offday 매핑

| 기존 필드 | Offday 필드 | 타입 | 비고 |
|----------|-------------|------|------|
| id | id | UUID | 동일 |
| group_id | group_id | INTEGER | 동일 |
| team_id | team_id | INTEGER | 동일 |
| password | password | VARCHAR(255) | 동일 (해시 권장) |
| name | name | VARCHAR(255) | 동일 |
| nickname | nickname | VARCHAR(255) | 동일 |
| email | email | VARCHAR(255) | 동일 |
| phone | phone | VARCHAR(32) | 동일 |
| address | address | VARCHAR(255) | 동일 |
| birthday | birth_date | DATE | 필드명만 변경 |
| profile_message | profile_message | TEXT | 매핑됨 (사용 안함) |
| profile_image | profile_image | VARCHAR(255) | 동일 |
| join_date | join_date | DATE | 동일 |
| preferences | preferences | TEXT | 동일 |
| last_login_at | last_login_at | TIMESTAMP | 동일 |
| last_access | last_access | TIMESTAMP | 동일 |
| login_cnt | login_cnt | INTEGER | 동일 |
| created_at | created_at | TIMESTAMP | 동일 |
| status | status | SMALLINT | 동일 (0=삭제, 1=활성) |
| login_id | login_id | VARCHAR(255) | 동일 |
| point | point | INTEGER | 동일 (사용 안함) |
| idx | idx | INTEGER | 동일 (사용 안함) |

#### Offday 추가 필드

| 추가 필드 | 타입 | 용도 |
|----------|------|------|
| branch_id | INTEGER | 지점 ID (FK) |
| username | VARCHAR(255) | 사용자 이름 (중복) |
| branch | VARCHAR(255) | 지점명 (중복 저장) |
| department | VARCHAR(255) | 부서명 |
| team | VARCHAR(255) | 팀명 (중복 저장) |
| position | VARCHAR(255) | 직급 |
| hire_date | DATE | 입사일 |
| resignation_date | DATE | 퇴사일 |
| annual_leave_days | DECIMAL(4,1) | 연간 총 연차 |
| used_leave_days | DECIMAL(4,1) | 사용 연차 |
| remaining_leave_days | DECIMAL(4,1) | 남은 연차 |
| welfare_leave_days | DECIMAL(4,1) | 복지 휴가 |
| updated_at | TIMESTAMP | 수정일시 |
| deleted_at | TIMESTAMP | 삭제일시 |

### 2. Branches 테이블

#### 기존 시스템 → Offday 매핑

| 기존 필드 | Offday 필드 | 타입 | 비고 |
|----------|-------------|------|------|
| id | id | SERIAL | 동일 |
| name | name | VARCHAR(255) | 동일 |
| group_id | group_id | INTEGER | 동일 |
| master_client_id | master_client_id | INTEGER | 동일 (보존) |
| multicase_client_id | multicase_client_id | INTEGER | 동일 (보존) |

#### Offday 추가 필드

| 추가 필드 | 타입 | 용도 |
|----------|------|------|
| address | VARCHAR(255) | 주소 |
| phone | VARCHAR(32) | 전화번호 |
| manager | VARCHAR(255) | 지점장 |
| description | TEXT | 설명 |
| departments | TEXT[] | 부서 목록 |
| leave_calculation_standard | VARCHAR(50) | 연차 계산 기준 |
| created_at | TIMESTAMP | 생성일시 |
| updated_at | TIMESTAMP | 수정일시 |

### 3. Teams 테이블

완전히 동일한 구조:

| 필드 | 타입 | 용도 |
|------|------|------|
| id | SERIAL | 팀 ID |
| name | VARCHAR(255) | 팀명 |
| branch_id | INTEGER | 지점 ID (FK) |

### 4. Roles 테이블

#### 기존 시스템 → Offday 매핑

| 기존 필드 | Offday 필드 | 타입 | 비고 |
|----------|-------------|------|------|
| id | id | SERIAL | 동일 |
| group_id | group_id | INTEGER | 동일 |
| name | name | VARCHAR(100) | 동일 |

#### Offday 추가 필드

| 추가 필드 | 타입 | 용도 |
|----------|------|------|
| display_name | VARCHAR(100) | 한글 표시명 |
| description | TEXT | 역할 설명 |
| priority | INTEGER | 우선순위 (권한 레벨) |
| permissions | JSONB | 권한 목록 (RBAC) |
| created_at | TIMESTAMP | 생성일시 |
| updated_at | TIMESTAMP | 수정일시 |

### 5. Users_Roles 테이블

완전히 동일한 구조:

| 필드 | 타입 | 용도 |
|------|------|------|
| id | SERIAL | 자동 증가 ID |
| user_id | UUID | 사용자 ID (FK) |
| role_id | INTEGER | 역할 ID (FK) |

---

## 통합 시나리오

### 시나리오 1: 완전 독립형 (권장)

```
┌─────────────────┐         ┌─────────────────┐
│   기존 시스템   │         │ Offday 시스템   │
│  (MySQL/Maria)  │         │   (Supabase)    │
└─────────────────┘         └─────────────────┘
        │                           │
        └───── 사용자 데이터만 ─────┘
              정기 동기화 (1회/일)
```

**장점**:
- 독립적인 운영
- 기존 시스템에 영향 없음
- 성능 분리

**구현**:
1. 초기 데이터 마이그레이션 (1회)
2. 매일 사용자 정보 동기화 (스케줄러)
3. 연차 데이터는 Offday에서만 관리

### 시나리오 2: 부분 통합형

```
┌─────────────────┐         ┌─────────────────┐
│   기존 시스템   │◄───────►│ Offday 시스템   │
│  (Master DB)    │   API   │  (Slave/Read)   │
└─────────────────┘         └─────────────────┘
```

**장점**:
- 실시간 사용자 정보 동기화
- 단일 사용자 DB 관리

**구현**:
1. 기존 시스템의 users, branches, teams 데이터를 API로 읽기
2. Offday는 연차 관련 데이터만 관리
3. 양방향 API 통신

### 시나리오 3: 완전 통합형

```
┌────────────────────────────────┐
│     통합 데이터베이스          │
│  (Supabase 또는 기존 DB)       │
└────────────────────────────────┘
         ▲              ▲
         │              │
    ┌────┘              └────┐
┌────────┐              ┌────────┐
│기존 앱 │              │Offday  │
└────────┘              └────────┘
```

**장점**:
- 단일 데이터베이스
- 데이터 정합성 보장
- 실시간 동기화

**구현**:
1. 기존 시스템을 Supabase로 마이그레이션 (선택 1)
2. Offday 테이블을 기존 DB에 추가 (선택 2)

---

## API 연동 방법

### 1. 기존 시스템 → Offday (데이터 Push)

#### REST API 예시

```javascript
// js/legacy-sync.js

class LegacySystemSync {
    constructor(apiUrl, apiKey) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
    }

    /**
     * 기존 시스템에서 사용자 데이터 가져오기
     */
    async fetchUsersFromLegacy() {
        try {
            const response = await fetch(`${this.apiUrl}/users`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch users');
            
            const users = await response.json();
            return users;
        } catch (error) {
            console.error('Legacy sync error:', error);
            throw error;
        }
    }

    /**
     * Supabase로 사용자 데이터 동기화
     */
    async syncUsersToSupabase() {
        const legacyUsers = await this.fetchUsersFromLegacy();
        
        // Supabase 형식으로 변환
        const supabaseUsers = legacyUsers.map(user => ({
            id: user.id,
            group_id: user.group_id,
            team_id: user.team_id,
            login_id: user.login_id,
            username: user.name,
            password: user.password,
            email: user.email,
            name: user.name,
            nickname: user.nickname,
            phone: user.phone,
            address: user.address,
            birth_date: user.birthday,
            profile_image: user.profile_image,
            status: user.status,
            // 연차 정보는 기존 값 유지
            annual_leave_days: 15,
            used_leave_days: 0,
            remaining_leave_days: 15
        }));
        
        // Supabase에 upsert
        const { error } = await window.supabaseClient
            .from('users')
            .upsert(supabaseUsers, { onConflict: 'id' });
        
        if (error) throw error;
        
        console.log(`Synced ${supabaseUsers.length} users from legacy system`);
    }

    /**
     * 정기 동기화 (매일 실행)
     */
    async scheduledSync() {
        console.log('Starting scheduled sync...');
        
        try {
            // 1. 사용자 동기화
            await this.syncUsersToSupabase();
            
            // 2. 지점 동기화
            await this.syncBranchesToSupabase();
            
            // 3. 팀 동기화
            await this.syncTeamsToSupabase();
            
            console.log('Scheduled sync completed successfully');
        } catch (error) {
            console.error('Scheduled sync failed:', error);
            // 알림 발송 (Slack, Email 등)
        }
    }
}

// 사용 예시
const legacySync = new LegacySystemSync(
    'https://your-legacy-system.com/api',
    'your-api-key'
);

// 매일 오전 2시에 동기화 (서버에서 cron job 설정)
// 0 2 * * * node sync-script.js
```

### 2. Offday → 기존 시스템 (데이터 Pull)

#### 양방향 동기화

```javascript
// 연차 신청 정보를 기존 시스템으로 전송
async function notifyLegacySystem(leaveRequest) {
    try {
        const response = await fetch(`${LEGACY_API_URL}/leave-notifications`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LEGACY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: leaveRequest.employee_id,
                employee_name: leaveRequest.employee_name,
                leave_type: leaveRequest.leave_type,
                start_date: leaveRequest.start_date,
                end_date: leaveRequest.end_date,
                days: leaveRequest.days,
                status: leaveRequest.status
            })
        });
        
        if (!response.ok) {
            console.warn('Failed to notify legacy system');
        }
    } catch (error) {
        console.error('Legacy notification error:', error);
        // 실패해도 Offday 시스템은 정상 작동
    }
}
```

---

## 데이터 동기화

### 방법 1: Node.js 스케줄러 (권장)

```javascript
// sync-scheduler.js
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ 서버 전용
);

// 매일 오전 2시에 실행
cron.schedule('0 2 * * *', async () => {
    console.log('Starting daily sync...');
    
    try {
        // 기존 시스템에서 데이터 가져오기
        const legacyUsers = await fetchFromLegacySystem();
        
        // Supabase에 동기화
        const { error } = await supabase
            .from('users')
            .upsert(legacyUsers, { onConflict: 'id' });
        
        if (error) throw error;
        
        console.log('Daily sync completed');
    } catch (error) {
        console.error('Sync failed:', error);
        // 알림 발송
    }
});
```

**실행**:
```bash
npm install node-cron @supabase/supabase-js
node sync-scheduler.js
```

### 방법 2: Supabase Functions (서버리스)

```typescript
// supabase/functions/sync-legacy/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        // 기존 시스템 API 호출
        const response = await fetch(Deno.env.get('LEGACY_API_URL') + '/users', {
            headers: {
                'Authorization': `Bearer ${Deno.env.get('LEGACY_API_KEY')}`
            }
        });
        
        const legacyUsers = await response.json();
        
        // Supabase에 동기화
        const { error } = await supabase
            .from('users')
            .upsert(legacyUsers);
        
        if (error) throw error;
        
        return new Response(
            JSON.stringify({ success: true, count: legacyUsers.length }),
            { headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});
```

**배포**:
```bash
supabase functions deploy sync-legacy

# Cron 설정 (Supabase Dashboard)
# Schedule: 0 2 * * * (매일 오전 2시)
```

### 방법 3: Database Triggers (고급)

기존 DB에서 변경 발생 시 자동 동기화:

```sql
-- MySQL Trigger 예시 (기존 시스템)
CREATE TRIGGER sync_user_to_supabase
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    -- Webhook으로 Supabase에 알림
    -- (추가 도구 필요: MySQL UDF 또는 외부 스크립트)
END;
```

---

## 인증 통합

### SSO (Single Sign-On) 통합

#### 방법 1: JWT 토큰 공유

```javascript
// 기존 시스템에서 로그인 후 JWT 발급
const legacyToken = await loginToLegacySystem(username, password);

// Offday 시스템에서 JWT 검증
async function verifyLegacyToken(token) {
    try {
        const response = await fetch(`${LEGACY_API_URL}/verify-token`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Invalid token');
        
        const userData = await response.json();
        
        // Supabase 세션 생성
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email: userData.email,
            password: token // 토큰을 임시 비밀번호로 사용
        });
        
        return data;
    } catch (error) {
        console.error('Token verification failed:', error);
        throw error;
    }
}
```

#### 방법 2: SAML/OAuth2

Supabase는 OAuth2를 지원합니다. 기존 시스템이 OAuth2 Provider라면:

1. Supabase Dashboard > **Authentication** > **Providers**
2. **Custom OAuth2** 활성화
3. 기존 시스템의 OAuth2 엔드포인트 설정

---

## 문제 해결

### 1. 사용자 ID 충돌

**문제**: 기존 시스템의 ID가 정수인데 Offday는 UUID 사용

**해결**:
```sql
-- Supabase에서 정수 ID를 문자열로 저장
-- users 테이블의 id를 VARCHAR로 변경 (또는 UUID 생성 규칙 통일)

-- 방법 1: 정수 ID를 UUID로 변환
INSERT INTO users (id, ...) 
VALUES (uuid_generate_v5(uuid_ns_url(), CAST(legacy_id AS TEXT)), ...);

-- 방법 2: legacy_id 컬럼 추가
ALTER TABLE users ADD COLUMN legacy_id INTEGER;
CREATE INDEX idx_users_legacy_id ON users(legacy_id);
```

### 2. 비밀번호 해시 방식 차이

**문제**: 기존 시스템과 Supabase의 해시 알고리즘이 다름

**해결**:
```javascript
// 초기 마이그레이션 시 모든 사용자의 비밀번호 재설정 요청
// 또는 기존 해시를 그대로 저장하고 별도 검증 로직 구현

async function migratePasswordHash(legacyHash, userId) {
    // 옵션 1: 기존 해시 보존
    await supabase.from('users').update({
        password: legacyHash,
        password_legacy: true // 플래그 추가
    }).eq('id', userId);
    
    // 로그인 시 legacy 해시 검증
    if (user.password_legacy) {
        const valid = await verifyLegacyHash(inputPassword, user.password);
        if (valid) {
            // 새로운 해시로 업데이트
            await updateToNewHash(userId, inputPassword);
        }
    }
}
```

### 3. 데이터 동기화 실패

**문제**: 네트워크 오류로 동기화 실패

**해결**:
```javascript
// 재시도 로직 구현
async function syncWithRetry(maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await syncData();
            return true;
        } catch (error) {
            console.warn(`Sync attempt ${i + 1} failed:`, error);
            if (i === maxRetries - 1) throw error;
            await sleep(1000 * Math.pow(2, i)); // 지수 백오프
        }
    }
}
```

### 4. 테이블 스키마 불일치

**문제**: 기존 시스템의 컬럼명이 다름

**해결**:
```javascript
// 매핑 함수 생성
function mapLegacyToSupabase(legacyUser) {
    return {
        id: legacyUser.id,
        group_id: legacyUser.group_id,
        birth_date: legacyUser.birthday, // 필드명 변환
        // ... 기타 매핑
    };
}
```

---

## 체크리스트

### 통합 전

- [ ] 기존 시스템의 DB 스키마 문서화
- [ ] 데이터 백업 완료
- [ ] API 엔드포인트 목록 작성
- [ ] 인증 방식 결정
- [ ] 동기화 주기 결정

### 통합 중

- [ ] 테스트 환경에서 먼저 진행
- [ ] 소규모 데이터로 파일럿 테스트
- [ ] 동기화 로그 모니터링
- [ ] 에러 핸들링 구현
- [ ] 롤백 계획 수립

### 통합 후

- [ ] 데이터 정합성 검증
- [ ] 성능 모니터링
- [ ] 사용자 교육
- [ ] 문서화 완료
- [ ] 정기 점검 일정 수립

---

## 참고 자료

- [Supabase API 문서](https://supabase.com/docs/reference/javascript)
- [데이터베이스 마이그레이션 가이드](./DATA_MIGRATION_GUIDE.md)
- [Vercel 배포 가이드](./VERCEL_DEPLOYMENT_GUIDE.md)

**문서 버전**: 1.0  
**최종 업데이트**: 2024년 12월


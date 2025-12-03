# 🚀 Vercel 배포 가이드

## 목차
1. [사전 준비](#사전-준비)
2. [Supabase 설정](#supabase-설정)
3. [Vercel 배포](#vercel-배포)
4. [환경 변수 설정](#환경-변수-설정)
5. [배포 확인](#배포-확인)
6. [문제 해결](#문제-해결)

---

## 사전 준비

### 필요한 계정
1. **Supabase 계정** - https://supabase.com
2. **Vercel 계정** - https://vercel.com
3. **GitHub 계정** (선택사항, 권장) - https://github.com

### 로컬 환경
```bash
# Node.js 설치 확인 (선택사항)
node --version  # v16 이상 권장

# Git 설치 확인 (GitHub 연동 시)
git --version
```

---

## Supabase 설정

### 1단계: Supabase 프로젝트 생성

1. https://supabase.com 접속 및 로그인
2. **New Project** 클릭
3. 프로젝트 정보 입력:
   - **Name**: `offday-management` (또는 원하는 이름)
   - **Database Password**: 안전한 비밀번호 생성 (저장 필수!)
   - **Region**: `Northeast Asia (Seoul)` 선택 (한국 서버)
   - **Pricing Plan**: Free 또는 Pro 선택

4. **Create new project** 클릭 (1-2분 소요)

### 2단계: 데이터베이스 스키마 적용

1. Supabase 대시보드에서 **SQL Editor** 메뉴 클릭
2. **New Query** 클릭
3. `supabase-schema.sql` 파일의 내용 복사
4. SQL Editor에 붙여넣기
5. **Run** 버튼 클릭하여 실행

✅ 성공 메시지: "Success. No rows returned"

### 3단계: API 키 확인

1. **Project Settings** (왼쪽 하단 톱니바퀴 아이콘) 클릭
2. **API** 메뉴 선택
3. 다음 정보를 복사하여 저장:

```
Project URL: https://xxxxxxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **service_role key는 절대 클라이언트에 노출하지 마세요!**

### 4단계: Row Level Security (RLS) 확인

1. **Authentication** > **Policies** 메뉴에서 정책이 활성화되어 있는지 확인
2. 테이블별로 RLS 정책이 적용되었는지 확인:
   - `users` 테이블
   - `leave_requests` 테이블
   - 기타 테이블들

---

## Vercel 배포

### 방법 1: GitHub 연동 (권장)

#### 1단계: GitHub 저장소 생성

```bash
# 로컬에서 Git 초기화 (아직 안했다면)
cd "offday2 2"
git init
git add .
git commit -m "Initial commit: Offday Management System"

# GitHub에 저장소 생성 후
git remote add origin https://github.com/your-username/offday-management.git
git branch -M main
git push -u origin main
```

#### 2단계: Vercel에서 프로젝트 import

1. https://vercel.com 로그인
2. **Add New** > **Project** 클릭
3. **Import Git Repository** 선택
4. GitHub 저장소 선택: `offday-management`
5. **Import** 클릭

#### 3단계: 프로젝트 설정

- **Framework Preset**: `Other` 선택
- **Root Directory**: `./` (기본값)
- **Build Command**: 비워두기 (정적 사이트)
- **Output Directory**: `./` (기본값)
- **Install Command**: 비워두기

#### 4단계: 환경 변수 추가

**Environment Variables** 섹션에서:

```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://xxxxxxxxx.supabase.co (Supabase Project URL)

Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (Supabase anon key)
```

⚠️ **중요**: 
- `NEXT_PUBLIC_` 접두사는 클라이언트에서 접근 가능하게 만듭니다
- 민감한 Service Role Key는 여기에 추가하지 마세요!

#### 5단계: 배포

1. **Deploy** 버튼 클릭
2. 배포 진행 상황 확인 (1-2분 소요)
3. ✅ 배포 완료 후 URL 확인: `https://your-project.vercel.app`

### 방법 2: Vercel CLI 사용

```bash
# Vercel CLI 설치
npm install -g vercel

# 로그인
vercel login

# 프로젝트 배포
cd "offday2 2"
vercel

# 프로덕션 배포
vercel --prod
```

배포 중 질문에 답변:
```
? Set up and deploy "~/offday2 2"? [Y/n] Y
? Which scope do you want to deploy to? Your Account
? Link to existing project? [y/N] N
? What's your project's name? offday-management
? In which directory is your code located? ./
```

환경 변수 추가:
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## 환경 변수 설정

### 로컬 개발용 (.env.local 파일 생성)

프로젝트 루트에 `.env.local` 파일 생성:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 선택사항: 기존 시스템 연동
LEGACY_SYSTEM_API_URL=https://your-internal-system.com/api
LEGACY_SYSTEM_API_KEY=your-api-key
```

### Vercel 환경 변수 관리

**Vercel Dashboard에서:**
1. 프로젝트 선택
2. **Settings** > **Environment Variables**
3. 추가/수정/삭제 가능

**CLI에서:**
```bash
# 환경 변수 추가
vercel env add VARIABLE_NAME

# 환경 변수 목록 확인
vercel env ls

# 환경 변수 제거
vercel env rm VARIABLE_NAME
```

**환경별 설정:**
- **Production**: 실제 운영 환경
- **Preview**: PR 및 브랜치 미리보기
- **Development**: 로컬 개발 환경

---

## supabase-init.js 업데이트

배포 후 환경 변수를 사용하도록 코드 수정:

```javascript
// js/supabase-init.js 파일 수정
(function initSupabase() {
    try {
        if (!window.supabase) {
            console.warn('[supabase-init] Supabase SDK가 로드되지 않았습니다.');
            return;
        }

        // 환경 변수에서 읽기 (Vercel 배포 시)
        const PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                           'https://aspkdrbcbvqwnpeprtin.supabase.co';
        const ANON_PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                               'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

        const client = window.supabase.createClient(PROJECT_URL, ANON_PUBLIC_KEY, {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
        });

        window.supabaseClient = client;
        console.log('[supabase-init] Supabase client initialized');
        console.log('[supabase-init] Environment:', 
                    process.env.NODE_ENV || 'production');
    } catch (err) {
        console.error('[supabase-init] 초기화 오류:', err);
    }
})();
```

---

## 배포 확인

### 1. 기본 기능 테스트

배포된 URL(`https://your-project.vercel.app`)에서:

1. ✅ 로그인 페이지 접속 확인
2. ✅ 관리자 로그인 테스트
   - ID: `admin`
   - PW: `admin123` (또는 설정한 비밀번호)
3. ✅ 대시보드 로딩 확인
4. ✅ 직원 관리 메뉴 접근
5. ✅ 연차 신청 테스트

### 2. 브라우저 콘솔 확인

F12 (개발자 도구) > Console 탭에서:
```
[supabase-init] Supabase client initialized
[supabase-init] Environment: production
```

### 3. Supabase 연결 확인

```javascript
// 브라우저 콘솔에서 테스트
await window.supabaseClient.from('users').select('count');
// 응답: {count: N, error: null}
```

### 4. 배포 로그 확인

**Vercel Dashboard:**
1. 프로젝트 > **Deployments** 탭
2. 최신 배포 클릭
3. **Build Logs** 확인
4. **Runtime Logs** 확인 (실시간 에러 확인)

---

## 문제 해결

### 1. "Supabase client initialization failed"

**원인**: 환경 변수가 설정되지 않음

**해결**:
```bash
# Vercel 환경 변수 확인
vercel env ls

# 환경 변수 추가
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# 재배포
vercel --prod
```

### 2. "CORS policy" 에러

**원인**: Supabase가 Vercel 도메인을 허용하지 않음

**해결**:
1. Supabase Dashboard > **Authentication** > **URL Configuration**
2. **Site URL** 추가: `https://your-project.vercel.app`
3. **Redirect URLs** 추가: `https://your-project.vercel.app/**`

### 3. "Row Level Security policy violation"

**원인**: RLS 정책이 너무 제한적

**해결**:
1. Supabase Dashboard > **SQL Editor**
2. RLS 정책 확인 및 수정
3. 테스트용으로 임시로 RLS 비활성화 (개발 중에만):
```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

⚠️ **운영 환경에서는 반드시 RLS를 활성화하세요!**

### 4. 배포 후 변경사항이 반영되지 않음

**원인**: 브라우저 캐시

**해결**:
- Ctrl + Shift + R (강력 새로고침)
- 브라우저 캐시 삭제
- Vercel에서 **Redeploy** 클릭

### 5. 환경 변수가 undefined

**원인**: 정적 사이트에서는 `process.env`가 빌드 시에만 작동

**해결**: HTML에서 직접 환경 변수 주입하거나 빌드 스크립트 사용

```html
<!-- index.html -->
<script>
    window.ENV = {
        SUPABASE_URL: '${NEXT_PUBLIC_SUPABASE_URL}',
        SUPABASE_KEY: '${NEXT_PUBLIC_SUPABASE_ANON_KEY}'
    };
</script>
```

---

## 성능 최적화

### 1. Vercel 설정 최적화

```json
// vercel.json
{
  "headers": [
    {
      "source": "/js/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 2. Supabase Connection Pooling

Supabase Dashboard > **Database** > **Connection Pooling** 활성화

### 3. CDN 활용

Vercel은 자동으로 전 세계 CDN에 배포합니다.
- 한국 사용자: Seoul Edge (매우 빠름)
- 글로벌 사용자: 가장 가까운 Edge 사용

---

## 커스텀 도메인 설정 (선택사항)

### 1. 도메인 추가

1. Vercel Dashboard > 프로젝트 > **Settings** > **Domains**
2. **Add** 클릭
3. 도메인 입력: `offday.your-company.com`
4. DNS 레코드 설정 안내 확인

### 2. DNS 설정

도메인 관리 페이지에서 다음 레코드 추가:

```
Type: CNAME
Name: offday (또는 @)
Value: cname.vercel-dns.com
```

### 3. SSL 인증서

Vercel이 자동으로 Let's Encrypt SSL 인증서 발급 (무료)

---

## 자동 배포 설정

### GitHub 연동 시 (권장)

**main 브랜치에 푸시하면 자동 배포:**
```bash
git add .
git commit -m "Update feature"
git push origin main
# → Vercel이 자동으로 배포 시작
```

**PR 생성 시 미리보기 배포:**
```bash
git checkout -b feature/new-feature
git push origin feature/new-feature
# → GitHub에서 PR 생성
# → Vercel이 자동으로 미리보기 URL 생성
```

### Vercel Hooks (선택사항)

**배포 후 Slack 알림:**
1. Vercel Dashboard > **Settings** > **Git** > **Deploy Hooks**
2. Slack Webhook URL 추가
3. 배포 완료 시 자동 알림

---

## 모니터링

### Vercel Analytics

```json
// vercel.json
{
  "analytics": {
    "enabled": true
  }
}
```

### Supabase Monitoring

Supabase Dashboard > **Database** > **Logs**에서:
- 쿼리 성능 확인
- 에러 로그 확인
- 느린 쿼리 최적화

---

## 백업 및 복구

### Supabase 백업

**자동 백업**:
- Free Plan: 일일 백업 (7일 보관)
- Pro Plan: 일일 백업 (30일 보관) + 수동 백업

**수동 백업**:
```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인
supabase login

# 백업
supabase db dump -f backup.sql
```

### Vercel 백업

Git 저장소가 백업 역할을 합니다:
```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## 다음 단계

✅ 배포 완료!

이제 다음을 진행하세요:
1. [기존 시스템 연동 가이드](./LEGACY_SYSTEM_INTEGRATION.md) 확인
2. [데이터 마이그레이션](./DATA_MIGRATION_GUIDE.md) 진행
3. [사용자 교육](./USER_GUIDE.md) 시작

---

## 지원

문제가 있나요?
- 📧 support@your-company.com
- 💬 Slack: #offday-support
- 📚 내부 위키: https://wiki.your-company.com/offday

**문서 버전**: 1.0  
**최종 업데이트**: 2024년 12월


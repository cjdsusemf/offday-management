# ⚡ Offday 시스템 빠른 시작 가이드

## 🎯 5분 만에 시작하기

### 1단계: Supabase 프로젝트 생성 (2분)

1. https://supabase.com 접속 → 로그인/회원가입
2. **New Project** 클릭
3. 입력:
   ```
   Name: offday-management
   Database Password: [안전한 비밀번호 - 저장 필수!]
   Region: Northeast Asia (Seoul)
   Plan: Free
   ```
4. **Create new project** 클릭 → 1-2분 대기

### 2단계: 데이터베이스 설정 (1분)

1. 왼쪽 메뉴 **SQL Editor** 클릭
2. **New Query** 클릭
3. `supabase-schema.sql` 파일 내용 복사/붙여넣기
4. **Run** 클릭
5. ✅ "Success" 메시지 확인

### 3단계: API 키 복사 (30초)

1. 왼쪽 하단 **Settings** (톱니바퀴) 클릭
2. **API** 메뉴 선택
3. 복사하여 저장:
   ```
   Project URL: https://xxx.supabase.co
   anon public key: eyJhbGci...
   ```

### 4단계: 코드 업데이트 (1분)

`js/supabase-init.js` 파일 수정:

```javascript
const PROJECT_URL = 'https://xxx.supabase.co'; // ← 여기에 붙여넣기
const ANON_PUBLIC_KEY = 'eyJhbGci...'; // ← 여기에 붙여넣기
```

### 5단계: 배포 (Vercel) - 옵션 A (2분)

1. https://github.com 에 저장소 생성
2. 코드 푸시:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/사용자명/offday.git
   git push -u origin main
   ```
3. https://vercel.com 접속 → Import Git Repository
4. 저장소 선택 → **Deploy** 클릭
5. 환경 변수 추가:
   ```
   NEXT_PUBLIC_SUPABASE_URL = [Project URL]
   NEXT_PUBLIC_SUPABASE_ANON_KEY = [anon public key]
   ```
6. ✅ 배포 URL 확인: `https://your-project.vercel.app`

### 5단계: 로컬 실행 - 옵션 B (30초)

```bash
# PowerShell 또는 터미널에서
cd "offday2 2"
npx http-server -p 3000 -o
```

브라우저가 자동으로 열립니다!

---

## 🎉 완료!

**로그인 정보**:
- ID: `admin`
- PW: `admin123`

---

## 📚 다음 단계

### 데이터 마이그레이션 (LocalStorage → Supabase)

기존 데이터가 있다면:

```javascript
// 브라우저 F12 콘솔에서 실행
const migration = new SupabaseMigration();
await migration.migrateAll();
```

### 기존 시스템 연동

[LEGACY_SYSTEM_INTEGRATION.md](./LEGACY_SYSTEM_INTEGRATION.md) 참고

---

## ❓ 문제 해결

### "Supabase client initialization failed"
→ `supabase-init.js`의 URL과 Key가 올바른지 확인

### "CORS policy error"
→ Supabase Dashboard → Authentication → URL Configuration에서 사이트 URL 추가

### 배포 후 화면이 안 나옴
→ Ctrl + Shift + R (강력 새로고침)

---

## 📖 전체 문서

- [배포 요약](./DEPLOYMENT_SUMMARY.md) - 전체 개요
- [Vercel 배포](./VERCEL_DEPLOYMENT_GUIDE.md) - 상세 가이드
- [데이터 마이그레이션](./DATA_MIGRATION_GUIDE.md) - 마이그레이션 절차
- [기존 시스템 연동](./LEGACY_SYSTEM_INTEGRATION.md) - 통합 방법

---

**Happy Coding! 🚀**


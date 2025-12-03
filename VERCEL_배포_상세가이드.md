# 🚀 Vercel 배포 초보자용 완전 가이드

## 방법 1: Vercel CLI 사용 (가장 쉬움) ⭐ 권장

### 단계 1: Node.js 설치 확인

PowerShell에서 실행:
```powershell
node --version
```

**"node : 용어가 cmdlet, 함수..." 에러가 나면:**
1. https://nodejs.org 접속
2. LTS 버전 다운로드 (왼쪽 버튼)
3. 설치 후 PowerShell 재시작

### 단계 2: Vercel CLI 설치

```powershell
npm install -g vercel
```

**npm 에러가 나면:**
```powershell
# 관리자 권한으로 PowerShell 실행 후
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
npm install -g vercel
```

### 단계 3: 프로젝트 폴더로 이동

```powershell
cd "C:\Users\ehdrj\OneDrive\Desktop\개발\offday2 2\offday2 2"
```

### 단계 4: Vercel 로그인

```powershell
vercel login
```

브라우저가 열리면 로그인/회원가입

### 단계 5: 배포

```powershell
vercel
```

**나오는 질문들:**

```
? Set up and deploy "C:\Users\ehdrj\OneDrive\Desktop\개발\offday2 2\offday2 2"? 
→ Y 입력 후 엔터

? Which scope do you want to deploy to? 
→ 본인 계정 선택 후 엔터

? Link to existing project? 
→ N 입력 후 엔터

? What's your project's name? 
→ offday-management 입력 후 엔터

? In which directory is your code located? 
→ ./ 입력 후 엔터 (또는 그냥 엔터)
```

**배포 완료!** 🎉

터미널에 나온 URL 클릭: `https://offday-management-xxx.vercel.app`

### 단계 6: 환경 변수 추가

```powershell
vercel env add NEXT_PUBLIC_SUPABASE_URL
```

**값 입력:**
```
https://ojlsrvcrwvdohynjplmw.supabase.co
```

```powershell
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**값 입력:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbHNydmNyd3Zkb2h5bmpwbG13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjI3MjgsImV4cCI6MjA4MDI5ODcyOH0.I9eNNGf5cwpZFbE8vxv75cnv2QQRTckFO7QCE8to0rA
```

### 단계 7: 프로덕션 배포

```powershell
vercel --prod
```

완료! 🚀

---

## 방법 2: GitHub 연동 (중급)

### 단계 1: Git 설치 확인

```powershell
git --version
```

**설치 안 되어 있으면:**
1. https://git-scm.com/download/win 접속
2. 다운로드 및 설치 (기본 옵션으로)

### 단계 2: GitHub 계정 준비

1. https://github.com 접속
2. 로그인 또는 회원가입

### 단계 3: GitHub 저장소 생성

1. 오른쪽 위 **+** 버튼 → **New repository** 클릭
2. 입력:
   ```
   Repository name: offday-management
   Description: 연차 관리 시스템
   Public 선택
   ```
3. **Create repository** 클릭

### 단계 4: 프로젝트 폴더에서 Git 초기화

PowerShell에서:

```powershell
# 프로젝트 폴더로 이동
cd "C:\Users\ehdrj\OneDrive\Desktop\개발\offday2 2\offday2 2"

# Git 초기화
git init

# 모든 파일 추가
git add .

# 커밋
git commit -m "Initial commit: Offday Management System"
```

**"Author identity unknown" 에러가 나면:**
```powershell
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
# 그 다음 다시 커밋
git commit -m "Initial commit"
```

### 단계 5: GitHub에 푸시

GitHub 저장소 페이지에 나온 명령어 복사 후 실행:

```powershell
# 본인의 GitHub 주소로 변경!
git remote add origin https://github.com/본인아이디/offday-management.git
git branch -M main
git push -u origin main
```

**로그인 창이 나오면:** GitHub 계정으로 로그인

### 단계 6: Vercel에서 Import

1. https://vercel.com 접속 → 로그인
2. **Add New...** → **Project** 클릭
3. **Import Git Repository** 선택
4. GitHub 연동 (처음이면 인증 필요)
5. `offday-management` 저장소 찾기 → **Import** 클릭

### 단계 7: 프로젝트 설정

- **Framework Preset**: Other (선택 안 함)
- **Root Directory**: ./ (기본값)
- **Build Command**: 비워두기
- **Output Directory**: ./ (기본값)
- **Install Command**: 비워두기

### 단계 8: 환경 변수 추가

**Environment Variables** 섹션에서 **+ Add** 클릭:

```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://ojlsrvcrwvdohynjplmw.supabase.co

Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbHNydmNyd3Zkb2h5bmpwbG13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjI3MjgsImV4cCI6MjA4MDI5ODcyOH0.I9eNNGf5cwpZFbE8vxv75cnv2QQRTckFO7QCE8to0rA
```

### 단계 9: Deploy 클릭

**Deploy** 버튼 클릭 → 1-2분 대기

✅ **완료!** 배포 URL 확인: `https://your-project.vercel.app`

---

## 방법 3: Vercel Dashboard 직접 업로드 (가장 간단)

### 단계 1: 폴더 압축

1. `offday2 2` 폴더 전체 선택
2. 마우스 우클릭 → **보내기** → **압축(ZIP) 폴더**
3. `offday2-2.zip` 생성됨

### 단계 2: Vercel 업로드

1. https://vercel.com 접속 → 로그인
2. **Add New...** → **Project** 클릭
3. 하단에 **Browse** 버튼 찾기
4. ZIP 파일 업로드
5. **Deploy** 클릭

### 단계 3: 환경 변수 추가

배포 후:
1. 프로젝트 페이지에서 **Settings** 클릭
2. **Environment Variables** 메뉴
3. 추가:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://ojlsrvcrwvdohynjplmw.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbHNydmNyd3Zkb2h5bmpwbG13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjI3MjgsImV4cCI6MjA4MDI5ODcyOH0.I9eNNGf5cwpZFbE8vxv75cnv2QQRTckFO7QCE8to0rA
   ```
4. **Save** 클릭

### 단계 4: 재배포

1. **Deployments** 탭으로 이동
2. 최신 배포 옆 **...** 클릭
3. **Redeploy** 선택

완료! 🎉

---

## 🆘 자주 발생하는 문제

### 1. "git is not recognized"

**해결:**
- Git 설치: https://git-scm.com/download/win
- PowerShell 재시작

### 2. "npm is not recognized"

**해결:**
- Node.js 설치: https://nodejs.org
- PowerShell 재시작

### 3. "Permission denied" (GitHub 푸시 시)

**해결:**
```powershell
# HTTPS 대신 SSH 사용하거나
# GitHub 로그인 창에서 인증
```

### 4. 배포 후 화면이 안 나옴

**해결:**
- Ctrl + Shift + R (강력 새로고침)
- 브라우저 캐시 삭제
- 시크릿 모드로 테스트

### 5. Supabase 연결 안 됨

**해결:**
- F12 콘솔 확인
- 환경 변수가 올바른지 확인
- Vercel에서 **Redeploy** 실행

---

## ✅ 배포 확인 체크리스트

배포 후 확인:

- [ ] URL 접속: `https://your-project.vercel.app`
- [ ] F12 콘솔에서 에러 없음
- [ ] 로그인 페이지 정상 표시
- [ ] Supabase 연결 확인:
  ```javascript
  await window.supabaseClient.from('groups').select('*');
  ```
- [ ] 관리자 로그인 테스트 (admin/admin123)

---

## 🎯 추천 방법

**초보자**: 방법 3 (ZIP 업로드) → 가장 쉬움  
**중급자**: 방법 1 (Vercel CLI) → 빠르고 간편  
**고급자**: 방법 2 (GitHub) → 자동 배포 가능

---

어떤 방법이든 막히는 부분이 있으면 구체적으로 알려주세요! 🙋‍♂️


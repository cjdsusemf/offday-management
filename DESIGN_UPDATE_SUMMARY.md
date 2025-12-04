# 디자인 업데이트 완료 - Blue Hole 스타일

## 변경 사항 요약

### 1. 색상 체계
- **그라데이션 제거**: 모든 그라데이션을 단색으로 변경
- **메인 색상**: #5B7FE8 (Blue Hole 스타일의 파란색)
- **배경**: #F5F7FA (연한 회색 배경)
- **그림자 최소화**: 플랫 디자인 적용

### 2. 레이아웃 변경
- **상단 헤더 → 좌측 사이드바**: Blue Hole 스타일의 좌측 네비게이션
- **사이드바 크기**: 240px 고정
- **메인 컨텐츠**: 사이드바를 제외한 영역 (padding-left: 240px)

### 3. 네비게이션
```
홈 (index.html)
캘린더 (calendar.html)
연차현황 (leave-status.html)
연차승인 (approval.html)
직원관리 (employee-management.html)
지점관리 (branch-management.html)
통계 (statistics.html)
설정 (settings.html)
---
마이페이지 (mypage.html)
로그아웃
```

### 4. 카드 스타일
- **배경**: 흰색 (#ffffff)
- **테두리**: 1px solid #E8EAED
- **그림자**: 최소화 (shadow-sm)
- **호버**: 테두리 색상 변경 (파란색)
- **둥근 모서리**: 0.75rem

### 5. 버튼 스타일
- **Primary 버튼**: 파란색 (#5B7FE8) 단색
- **호버**: 진한 파란색 (#4A6BD4)
- **그라데이션 제거**: 단색만 사용

### 6. 아이콘
- **크기**: 1.15rem
- **정렬**: 왼쪽 정렬, 20px 고정 너비
- **여백**: 0.75rem gap

## 적용된 파일

### CSS
- `styles/main.css` - 메인 스타일, 사이드바, 버튼
- `styles/dashboard.css` - 대시보드 카드, 통계

### HTML
- `index.html` - 사이드바 네비게이션 구조

## 다음 단계

다른 HTML 페이지들도 동일한 구조로 업데이트:
- calendar.html
- leave-status.html
- approval.html
- employee-management.html
- branch-management.html
- statistics.html
- settings.html
- mypage.html

로그인/회원가입 페이지는 별도 스타일 유지 (중앙 카드 형식)


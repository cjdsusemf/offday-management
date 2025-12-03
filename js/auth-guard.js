// 인증 가드 클래스
class AuthGuard {
    // 인증 상태 확인
    static checkAuth() {
        if (!window.authManager) {
            console.error('AuthManager가 로드되지 않았습니다.');
            return false;
        }
        
        const isAuthenticated = window.authManager.checkAuth();
        
        if (!isAuthenticated) {
            // 인증되지 않은 경우 로그인 페이지로 리다이렉트
            window.location.href = 'login.html';
            return false;
        }
        
        return true;
    }
    
    // 로그아웃 처리
    static logout() {
        if (!window.authManager) {
            console.error('AuthManager가 로드되지 않았습니다.');
            return false;
        }
        
        const result = window.authManager.logout();
        
        if (result.success) {
            // 로그아웃 성공 시 로그인 페이지로 리다이렉트
            window.location.href = 'login.html';
            return true;
        }
        
        return false;
    }
    
    // 현재 사용자 정보 가져오기
    static getCurrentUser() {
        if (!window.authManager) {
            console.error('AuthManager가 로드되지 않았습니다.');
            return null;
        }
        
        return window.authManager.getCurrentUser();
    }
    
    // 관리자 권한 체크
    static isAdmin() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;
        
        // roleManager가 있으면 사용
        if (window.roleManager) {
            return window.roleManager.isAdmin(currentUser);
        }
        
        // 폴백: role 문자열로 확인
        return currentUser.role === 'admin';
    }
    
    // 매니저 이상 권한 체크
    static isManagerOrAbove() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;
        
        if (window.roleManager) {
            return window.roleManager.isManagerOrAbove(currentUser);
        }
        
        // 폴백
        return currentUser.role === 'admin' || currentUser.role === 'manager';
    }
    
    // 특정 권한 체크
    static hasPermission(permission) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;
        
        if (window.roleManager) {
            return window.roleManager.hasPermission(currentUser, permission);
        }
        
        // 폴백: 관리자는 모든 권한
        return currentUser.role === 'admin';
    }
    
    // 여러 권한 중 하나라도 있는지 체크
    static hasAnyPermission(permissions) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;
        
        if (window.roleManager) {
            return window.roleManager.hasAnyPermission(currentUser, permissions);
        }
        
        // 폴백
        return currentUser.role === 'admin';
    }
    
    // 모든 권한을 가지고 있는지 체크
    static hasAllPermissions(permissions) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;
        
        if (window.roleManager) {
            return window.roleManager.hasAllPermissions(currentUser, permissions);
        }
        
        // 폴백
        return currentUser.role === 'admin';
    }
    
    // 관리자 페이지 접근 체크 (비관리자 접근 시 대시보드로 리다이렉트)
    static checkAdminAccess() {
        if (!this.checkAuth()) {
            return false;
        }
        
        if (!this.isAdmin()) {
            alert('관리자만 접근할 수 있는 페이지입니다.');
            window.location.href = 'index.html';
            return false;
        }
        
        return true;
    }
    
    // 특정 권한이 필요한 페이지 접근 체크
    static checkPermissionAccess(permission, redirectUrl = 'index.html') {
        if (!this.checkAuth()) {
            return false;
        }
        
        if (!this.hasPermission(permission)) {
            alert('이 페이지에 접근할 권한이 없습니다.');
            window.location.href = redirectUrl;
            return false;
        }
        
        return true;
    }
    
    // 여러 권한 중 하나라도 있어야 하는 페이지 접근 체크
    static checkAnyPermissionAccess(permissions, redirectUrl = 'index.html') {
        if (!this.checkAuth()) {
            return false;
        }
        
        if (!this.hasAnyPermission(permissions)) {
            alert('이 페이지에 접근할 권한이 없습니다.');
            window.location.href = redirectUrl;
            return false;
        }
        
        return true;
    }
}

// 전역 AuthGuard 인스턴스 생성
window.AuthGuard = AuthGuard;

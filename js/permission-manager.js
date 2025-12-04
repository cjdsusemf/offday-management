// 권한 관리 유틸리티
// 지점 관리자 등 역할별 권한 체크 기능 제공

class PermissionManager {
    constructor() {
        this.currentUser = null;
        this.loadCurrentUser();
    }

    // 현재 로그인한 사용자 정보 로드
    loadCurrentUser() {
        try {
            const userStr = sessionStorage.getItem('currentUser');
            if (userStr) {
                this.currentUser = JSON.parse(userStr);
            }
        } catch (error) {
            console.error('사용자 정보 로드 오류:', error);
        }
    }

    // 현재 사용자 역할 가져오기
    getCurrentUserRole() {
        if (!this.currentUser) {
            this.loadCurrentUser();
        }
        return this.currentUser?.role || 'user';
    }

    // 현재 사용자 정보 가져오기
    getCurrentUser() {
        if (!this.currentUser) {
            this.loadCurrentUser();
        }
        return this.currentUser;
    }

    // 현재 사용자의 관리 지점 가져오기
    getManagedBranch() {
        if (!this.currentUser) {
            this.loadCurrentUser();
        }
        return this.currentUser?.managedBranch || this.currentUser?.branch || null;
    }

    // 관리자 권한 체크
    isAdmin() {
        return this.getCurrentUserRole() === 'admin';
    }

    // 매니저 권한 체크
    isManager() {
        return this.getCurrentUserRole() === 'manager';
    }

    // 지점 관리자 권한 체크
    isBranchManager() {
        return this.getCurrentUserRole() === 'branch_manager';
    }

    // 팀장 권한 체크
    isTeamLeader() {
        return this.getCurrentUserRole() === 'team_leader';
    }

    // 지점별 데이터 필터링 (연차 신청 등)
    filterByBranch(items) {
        const role = this.getCurrentUserRole();
        
        // 관리자와 매니저는 모든 데이터 조회 가능
        if (role === 'admin' || role === 'manager') {
            return items;
        }

        // 지점 관리자는 자신의 지점 데이터만 조회
        if (role === 'branch_manager') {
            const managedBranch = this.getManagedBranch();
            if (!managedBranch) {
                console.warn('⚠️ 지점 관리자인데 관리 지점이 설정되지 않았습니다.');
                return [];
            }

            return items.filter(item => {
                // 직원 정보에서 지점 확인
                if (item.branch) {
                    return item.branch === managedBranch;
                }

                // 연차 신청의 경우 직원 정보를 찾아서 지점 확인
                if (item.employeeName && window.dataManager) {
                    const employees = window.dataManager.employees || [];
                    const employee = employees.find(emp => emp.name === item.employeeName);
                    return employee && employee.branch === managedBranch;
                }

                return false;
            });
        }

        // 팀장은 자신의 팀 데이터만 조회
        if (role === 'team_leader') {
            const user = this.getCurrentUser();
            const userTeam = user?.team || user?.department;
            if (!userTeam) {
                return [];
            }

            return items.filter(item => {
                if (item.team) {
                    return item.team === userTeam;
                }
                if (item.department) {
                    return item.department === userTeam;
                }

                // 연차 신청의 경우 직원 정보를 찾아서 팀 확인
                if (item.employeeName && window.dataManager) {
                    const employees = window.dataManager.employees || [];
                    const employee = employees.find(emp => emp.name === item.employeeName);
                    return employee && (employee.team === userTeam || employee.department === userTeam);
                }

                return false;
            });
        }

        // 일반 사용자는 본인 데이터만 조회
        const userName = this.getCurrentUser()?.name;
        return items.filter(item => {
            return item.employeeName === userName || item.name === userName;
        });
    }

    // 특정 직원의 데이터 조회 권한 체크
    canViewEmployee(employeeData) {
        const role = this.getCurrentUserRole();

        // 관리자와 매니저는 모든 직원 조회 가능
        if (role === 'admin' || role === 'manager') {
            return true;
        }

        // 지점 관리자는 자신의 지점 직원만 조회 가능
        if (role === 'branch_manager') {
            const managedBranch = this.getManagedBranch();
            return employeeData.branch === managedBranch;
        }

        // 팀장은 자신의 팀 직원만 조회 가능
        if (role === 'team_leader') {
            const user = this.getCurrentUser();
            const userTeam = user?.team || user?.department;
            return employeeData.team === userTeam || employeeData.department === userTeam;
        }

        // 일반 사용자는 본인만 조회 가능
        const userName = this.getCurrentUser()?.name;
        return employeeData.name === userName;
    }

    // 연차 승인/거절 권한 체크
    canApproveLeave(leaveRequest) {
        const role = this.getCurrentUserRole();

        // 관리자와 매니저는 모든 연차 승인 가능
        if (role === 'admin' || role === 'manager') {
            return true;
        }

        // 지점 관리자는 자신의 지점 연차만 승인 가능
        if (role === 'branch_manager') {
            const managedBranch = this.getManagedBranch();
            
            // 연차 신청자의 지점 확인
            if (window.dataManager) {
                const employees = window.dataManager.employees || [];
                const employee = employees.find(emp => emp.name === leaveRequest.employeeName);
                return employee && employee.branch === managedBranch;
            }
            return false;
        }

        // 팀장은 자신의 팀 연차만 승인 가능
        if (role === 'team_leader') {
            const user = this.getCurrentUser();
            const userTeam = user?.team || user?.department;

            if (window.dataManager) {
                const employees = window.dataManager.employees || [];
                const employee = employees.find(emp => emp.name === leaveRequest.employeeName);
                return employee && (employee.team === userTeam || employee.department === userTeam);
            }
            return false;
        }

        // 일반 사용자는 승인 권한 없음
        return false;
    }

    // 직원 정보 수정 권한 체크
    canEditEmployee(employeeData) {
        const role = this.getCurrentUserRole();

        // 관리자는 모든 직원 수정 가능
        if (role === 'admin') {
            return true;
        }

        // 매니저도 모든 직원 수정 가능
        if (role === 'manager') {
            return true;
        }

        // 지점 관리자는 자신의 지점 직원만 수정 가능 (단, 역할 변경은 불가)
        if (role === 'branch_manager') {
            const managedBranch = this.getManagedBranch();
            return employeeData.branch === managedBranch;
        }

        // 본인 정보는 수정 가능
        const userName = this.getCurrentUser()?.name;
        return employeeData.name === userName;
    }

    // 역할 변경 권한 체크
    canChangeRole(targetEmployeeData) {
        const role = this.getCurrentUserRole();

        // 관리자만 역할 변경 가능
        return role === 'admin';
    }

    // 지점 관리자 지정 권한 체크
    canAssignBranchManager() {
        return this.isAdmin();
    }

    // 통계 조회 권한 체크
    canViewStatistics() {
        const role = this.getCurrentUserRole();
        return ['admin', 'manager', 'branch_manager', 'team_leader'].includes(role);
    }

    // 복지 휴가 지급 권한 체크
    canGrantWelfareLeave(employeeData) {
        const role = this.getCurrentUserRole();

        // 관리자와 매니저는 모든 직원에게 지급 가능
        if (role === 'admin' || role === 'manager') {
            return true;
        }

        // 지점 관리자는 자신의 지점 직원에게만 지급 가능
        if (role === 'branch_manager') {
            const managedBranch = this.getManagedBranch();
            return employeeData.branch === managedBranch;
        }

        return false;
    }

    // 페이지 접근 권한 체크
    canAccessPage(pageName) {
        const role = this.getCurrentUserRole();

        const pagePermissions = {
            'employee-management': ['admin', 'manager'],
            'branch-management': ['admin'],
            'approval': ['admin', 'manager', 'branch_manager', 'team_leader'],
            'statistics': ['admin', 'manager', 'branch_manager', 'team_leader'],
            'settings': ['admin', 'manager'],
            'main-management': ['admin']
        };

        if (!pagePermissions[pageName]) {
            return true; // 권한 설정이 없는 페이지는 모두 접근 가능
        }

        return pagePermissions[pageName].includes(role);
    }

    // 디버깅용: 현재 권한 정보 출력
    debugPermissions() {
        console.log('=== 현재 권한 정보 ===');
        console.log('사용자:', this.getCurrentUser());
        console.log('역할:', this.getCurrentUserRole());
        console.log('관리 지점:', this.getManagedBranch());
        console.log('===================');
    }
}

// 전역 인스턴스 생성
window.permissionManager = new PermissionManager();

console.log('✅ PermissionManager 초기화 완료');


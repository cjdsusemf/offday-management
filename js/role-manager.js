// 역할(Role) 관리 시스템
// 역할 기반 접근 제어(RBAC)를 위한 간단한 구현

class RoleManager {
    constructor() {
        this.roles = this.loadRoles();
        this.initializeDefaultRoles();
    }
    
    // 역할 데이터 로드
    loadRoles() {
        try {
            const data = localStorage.getItem('roles');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('역할 데이터 로드 오류:', error);
            return [];
        }
    }
    
    // 역할 데이터 저장
    saveRoles(roles) {
        try {
            localStorage.setItem('roles', JSON.stringify(roles));
            return true;
        } catch (error) {
            console.error('역할 데이터 저장 오류:', error);
            return false;
        }
    }
    
    // 기본 역할 초기화
    initializeDefaultRoles() {
        if (this.roles.length === 0) {
            this.roles = [
                {
                    id: 1,
                    name: 'admin',
                    displayName: '관리자',
                    description: '시스템 전체 관리 권한',
                    priority: 100,
                    permissions: ['*'], // 모든 권한
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 2,
                    name: 'manager',
                    displayName: '매니저',
                    description: '부서 관리 및 승인 권한',
                    priority: 50,
                    permissions: [
                        'leave.approve',        // 연차 승인
                        'leave.reject',         // 연차 거부
                        'leave.view_all',       // 모든 연차 조회
                        'employee.view',        // 직원 조회
                        'employee.edit',        // 직원 정보 수정
                        'statistics.view',      // 통계 조회
                        'branch.view',          // 지점 정보 조회
                        'welfare.grant'         // 복지휴가 지급
                    ],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 3,
                    name: 'branch_manager',
                    displayName: '지점 관리자',
                    description: '지점 내 승인 및 관리 권한',
                    priority: 40,
                    permissions: [
                        'leave.approve_branch',     // 지점 내 연차 승인
                        'leave.reject_branch',      // 지점 내 연차 거부
                        'leave.view_branch',        // 지점 연차 조회
                        'employee.view_branch',     // 지점 직원 조회
                        'statistics.view_branch',   // 지점 통계 조회
                        'welfare.grant_branch'      // 지점 내 복지휴가 지급
                    ],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 4,
                    name: 'team_leader',
                    displayName: '팀장',
                    description: '팀 내 승인 권한',
                    priority: 30,
                    permissions: [
                        'leave.approve_team',   // 팀 내 연차 승인
                        'leave.reject_team',    // 팀 내 연차 거부
                        'leave.view_team',      // 팀 연차 조회
                        'employee.view_team',   // 팀원 조회
                        'statistics.view_team'  // 팀 통계 조회
                    ],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 5,
                    name: 'user',
                    displayName: '일반 사용자',
                    description: '기본 사용자 권한',
                    priority: 10,
                    permissions: [
                        'leave.request',        // 연차 신청
                        'leave.view_own',       // 본인 연차 조회
                        'profile.view_own',     // 본인 프로필 조회
                        'profile.edit_own'      // 본인 프로필 수정
                    ],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ];
            this.saveRoles(this.roles);
            console.log('✅ 기본 역할이 생성되었습니다.');
        }
    }
    
    // === 역할 조회 ===
    
    // 모든 역할 조회
    getAllRoles() {
        return this.roles;
    }
    
    // ID로 역할 조회
    getRole(roleId) {
        return this.roles.find(r => r.id === roleId);
    }
    
    // 이름으로 역할 조회
    getRoleByName(name) {
        return this.roles.find(r => r.name === name);
    }
    
    // 역할 표시 이름 조회
    getRoleDisplayName(roleId) {
        const role = this.getRole(roleId);
        return role ? role.displayName : '알 수 없음';
    }
    
    // === 권한 확인 ===
    
    // 사용자의 권한 확인
    hasPermission(user, permission) {
        if (!user) return false;
        
        // roleId가 있으면 roleId로, 없으면 role(문자열)로 확인
        let role;
        if (user.roleId) {
            role = this.getRole(user.roleId);
        } else if (user.role) {
            role = this.getRoleByName(user.role);
        }
        
        if (!role) return false;
        
        // 관리자는 모든 권한
        if (role.permissions.includes('*')) return true;
        
        // 특정 권한 확인
        return role.permissions.includes(permission);
    }
    
    // 여러 권한 중 하나라도 있는지 확인
    hasAnyPermission(user, permissions) {
        if (!Array.isArray(permissions)) return false;
        return permissions.some(p => this.hasPermission(user, p));
    }
    
    // 모든 권한을 가지고 있는지 확인
    hasAllPermissions(user, permissions) {
        if (!Array.isArray(permissions)) return false;
        return permissions.every(p => this.hasPermission(user, p));
    }
    
    // 관리자인지 확인
    isAdmin(user) {
        return this.hasPermission(user, '*');
    }
    
    // 매니저 이상인지 확인
    isManagerOrAbove(user) {
        if (!user) return false;
        
        let role;
        if (user.roleId) {
            role = this.getRole(user.roleId);
        } else if (user.role) {
            role = this.getRoleByName(user.role);
        }
        
        return role && role.priority >= 50;
    }
    
    // === 역할 관리 (CRUD) ===
    
    // 역할 추가
    addRole(roleData) {
        // 필수 필드 확인
        if (!roleData.name || !roleData.displayName) {
            return {
                success: false,
                message: '역할 이름과 표시 이름은 필수입니다.'
            };
        }
        
        // 중복 이름 확인
        if (this.getRoleByName(roleData.name)) {
            return {
                success: false,
                message: '이미 존재하는 역할 이름입니다.'
            };
        }
        
        const newRole = {
            id: Date.now(),
            name: roleData.name,
            displayName: roleData.displayName,
            description: roleData.description || '',
            priority: roleData.priority || 10,
            permissions: roleData.permissions || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.roles.push(newRole);
        this.saveRoles(this.roles);
        
        console.log(`✅ 역할 '${newRole.displayName}'이 추가되었습니다.`);
        
        return {
            success: true,
            message: '역할이 추가되었습니다.',
            role: newRole
        };
    }
    
    // 역할 업데이트
    updateRole(roleId, roleData) {
        const index = this.roles.findIndex(r => r.id === roleId);
        
        if (index === -1) {
            return {
                success: false,
                message: '역할을 찾을 수 없습니다.'
            };
        }
        
        // 기본 역할(1-4)은 이름과 권한 변경 제한
        if (roleId <= 4) {
            // 표시 이름과 설명만 변경 가능
            this.roles[index] = {
                ...this.roles[index],
                displayName: roleData.displayName || this.roles[index].displayName,
                description: roleData.description || this.roles[index].description,
                updatedAt: new Date().toISOString()
            };
        } else {
            // 커스텀 역할은 모든 필드 변경 가능
            this.roles[index] = {
                ...this.roles[index],
                ...roleData,
                id: roleId, // ID는 변경 불가
                updatedAt: new Date().toISOString()
            };
        }
        
        this.saveRoles(this.roles);
        
        console.log(`✅ 역할 '${this.roles[index].displayName}'이 업데이트되었습니다.`);
        
        return {
            success: true,
            message: '역할이 업데이트되었습니다.',
            role: this.roles[index]
        };
    }
    
    // 역할 삭제
    deleteRole(roleId) {
        // 기본 역할(1-4)은 삭제 불가
        if (roleId <= 4) {
            return {
                success: false,
                message: '기본 역할은 삭제할 수 없습니다.'
            };
        }
        
        // 사용 중인 역할인지 확인
        if (typeof window.dataManager !== 'undefined') {
            const users = window.dataManager.getUsers();
            const isInUse = users.some(u => u.roleId === roleId);
            
            if (isInUse) {
                return {
                    success: false,
                    message: '사용 중인 역할은 삭제할 수 없습니다. 먼저 사용자의 역할을 변경해주세요.'
                };
            }
        }
        
        const role = this.getRole(roleId);
        this.roles = this.roles.filter(r => r.id !== roleId);
        this.saveRoles(this.roles);
        
        console.log(`✅ 역할 '${role?.displayName}'이 삭제되었습니다.`);
        
        return {
            success: true,
            message: '역할이 삭제되었습니다.'
        };
    }
    
    // === 사용자 역할 관리 ===
    
    // 사용자에게 역할 할당
    assignRole(userId, roleId) {
        const role = this.getRole(roleId);
        if (!role) {
            return {
                success: false,
                message: '존재하지 않는 역할입니다.'
            };
        }
        
        if (typeof window.dataManager === 'undefined') {
            return {
                success: false,
                message: 'DataManager를 찾을 수 없습니다.'
            };
        }
        
        const users = window.dataManager.getUsers();
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            return {
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            };
        }
        
        // 역할 업데이트
        user.roleId = roleId;
        user.role = role.name; // 캐시용 (하위 호환성)
        user.updatedAt = new Date().toISOString();
        
        window.dataManager.saveUsers(users);
        
        console.log(`✅ ${user.name}의 역할이 '${role.displayName}'으로 변경되었습니다.`);
        
        return {
            success: true,
            message: `역할이 '${role.displayName}'으로 변경되었습니다.`,
            user: user
        };
    }
    
    // 사용자의 현재 역할 조회
    getUserRole(user) {
        if (!user) return null;
        
        if (user.roleId) {
            return this.getRole(user.roleId);
        } else if (user.role) {
            return this.getRoleByName(user.role);
        }
        
        return null;
    }
    
    // === 권한 목록 관리 ===
    
    // 사용 가능한 모든 권한 목록
    getAllPermissions() {
        return [
            // 연차 관련
            { name: 'leave.request', displayName: '연차 신청', category: 'leave' },
            { name: 'leave.approve', displayName: '연차 승인', category: 'leave' },
            { name: 'leave.reject', displayName: '연차 거부', category: 'leave' },
            { name: 'leave.approve_team', displayName: '팀 연차 승인', category: 'leave' },
            { name: 'leave.reject_team', displayName: '팀 연차 거부', category: 'leave' },
            { name: 'leave.view_own', displayName: '본인 연차 조회', category: 'leave' },
            { name: 'leave.view_team', displayName: '팀 연차 조회', category: 'leave' },
            { name: 'leave.view_all', displayName: '모든 연차 조회', category: 'leave' },
            
            // 직원 관련
            { name: 'employee.view', displayName: '직원 조회', category: 'employee' },
            { name: 'employee.view_team', displayName: '팀원 조회', category: 'employee' },
            { name: 'employee.add', displayName: '직원 추가', category: 'employee' },
            { name: 'employee.edit', displayName: '직원 수정', category: 'employee' },
            { name: 'employee.delete', displayName: '직원 삭제', category: 'employee' },
            
            // 프로필 관련
            { name: 'profile.view_own', displayName: '본인 프로필 조회', category: 'profile' },
            { name: 'profile.edit_own', displayName: '본인 프로필 수정', category: 'profile' },
            
            // 통계 관련
            { name: 'statistics.view', displayName: '통계 조회', category: 'statistics' },
            { name: 'statistics.view_team', displayName: '팀 통계 조회', category: 'statistics' },
            
            // 지점 관련
            { name: 'branch.view', displayName: '지점 조회', category: 'branch' },
            { name: 'branch.manage', displayName: '지점 관리', category: 'branch' },
            
            // 복지휴가 관련
            { name: 'welfare.grant', displayName: '복지휴가 지급', category: 'welfare' },
            
            // 설정 관련
            { name: 'settings.view', displayName: '설정 조회', category: 'settings' },
            { name: 'settings.edit', displayName: '설정 수정', category: 'settings' },
            
            // 시스템 관리
            { name: '*', displayName: '모든 권한 (관리자)', category: 'system' }
        ];
    }
    
    // 카테고리별 권한 조회
    getPermissionsByCategory() {
        const permissions = this.getAllPermissions();
        const grouped = {};
        
        permissions.forEach(perm => {
            if (!grouped[perm.category]) {
                grouped[perm.category] = [];
            }
            grouped[perm.category].push(perm);
        });
        
        return grouped;
    }
}

// 전역 인스턴스 생성
window.roleManager = new RoleManager();

console.log('✅ RoleManager 초기화 완료');
console.log('📋 역할 목록:', window.roleManager.getAllRoles().map(r => r.displayName));



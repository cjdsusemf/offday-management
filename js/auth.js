class AuthManager {
    constructor() { 
        this.initializeDefaultUsers();
        // 중복 초기화 방지
        this.isInitialized = false;
        this.setupNavbar();
    }
    
    getStoredUsers() { 
        return JSON.parse(localStorage.getItem("users") || "[]"); 
    }
    
    saveUsers(users) { 
        localStorage.setItem("users", JSON.stringify(users)); 
    }
    
    initializeDefaultUsers() { 
        const users = this.getStoredUsers(); 
        if (users.length === 0) { 
            const defaultUsers = [
                { 
                    id: "admin", 
                    username: "admin", 
                    password: "admin123", 
                    name: "관리자", 
                    email: "admin@offday.com", 
                    role: "admin",
                    roleId: 1,  // 관리자 역할
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
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    deletedAt: null
                }
            ]; 
            this.saveUsers(defaultUsers); 
        } 
    }
    
    getCurrentUser() { 
        const id = localStorage.getItem("current_user"); 
        return id ? this.getStoredUsers().find(u => u.id === id) : null; 
    }
    
    updateUserInStorage(updatedUser) { 
        console.log('updateUserInStorage 호출 - 업데이트할 사용자:', updatedUser);
        
        const users = this.getStoredUsers(); 
        console.log('현재 저장된 사용자 목록:', users);
        
        const index = users.findIndex(u => u.id === updatedUser.id); 
        console.log('사용자 인덱스:', index);
        
        if (index !== -1) { 
            console.log('업데이트 전 사용자 데이터:', users[index]);
            users[index] = { ...users[index], ...updatedUser }; 
            console.log('업데이트 후 사용자 데이터:', users[index]);
            
            this.saveUsers(users); 
            console.log('사용자 데이터 저장 완료');
            
            // 메뉴바 아바타 아이콘 업데이트
            this.updateNavAvatarIcon(updatedUser.profileImage);
            
            return true; 
        } 
        console.error('사용자를 찾을 수 없음 - ID:', updatedUser.id);
        return false; 
    }
    
    // 메뉴바 아바타 아이콘 업데이트
    updateNavAvatarIcon(imageUrl) {
        const navAvatarIcon = document.getElementById('navAvatarIcon');
        if (!navAvatarIcon) return;

        if (imageUrl && imageUrl.trim() !== '') {
            // 프로필 이미지가 있는 경우
            navAvatarIcon.className = 'nav-avatar-image';
            navAvatarIcon.style.backgroundImage = `url(${imageUrl})`;
            navAvatarIcon.style.backgroundSize = 'cover';
            navAvatarIcon.style.backgroundPosition = 'center';
            navAvatarIcon.style.borderRadius = '50%';
            navAvatarIcon.style.width = '28px';
            navAvatarIcon.style.height = '28px';
            navAvatarIcon.style.display = 'inline-block';
        } else {
            // 기본 아이콘인 경우
            navAvatarIcon.className = 'fas fa-user';
            navAvatarIcon.style.backgroundImage = '';
            navAvatarIcon.style.backgroundSize = '';
            navAvatarIcon.style.backgroundPosition = '';
            navAvatarIcon.style.borderRadius = '';
            navAvatarIcon.style.width = '';
            navAvatarIcon.style.height = '';
            navAvatarIcon.style.display = '';
        }
    }
    
    checkAuth() { 
        return this.getCurrentUser() !== null; 
    }
    
    /**
     * Supabase 중심 로그인
     * - 가능하면 Supabase Auth로 먼저 로그인
     * - 실패 시 기존 LocalStorage 기반 로그인으로 폴백
     * - username 입력값은 "이메일(아이디)" 라벨이므로 이메일/아이디 둘 다 허용
     */
    async login(username, password) { 
        const loginId = (username || '').trim();
        const pwd = password || '';

        // 1) Supabase Auth 로그인 우선 시도
        if (window.supabaseClient && window.supabaseClient.auth && loginId && pwd) {
            try {
                const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                    email: loginId,
                    password: pwd
                });

                if (!error && data && data.user) {
                    const supaUser = data.user;
                    console.log('[AuthManager] ✅ Supabase 로그인 성공:', supaUser.id, supaUser.email);

                    // LocalStorage 사용자 목록과 동기화
                    const users = this.getStoredUsers();
                    let localUser = users.find(u => u.email === supaUser.email) 
                                  || users.find(u => u.username === supaUser.email);

                    if (!localUser) {
                        // DB 기반 신규 사용자 → 최소 정보로 로컬 사용자 생성
                        localUser = {
                            id: supaUser.id,                       // 🔥 Supabase UID와 일치
                            username: supaUser.email,
                            password: pwd,                         // TODO: 추후 제거/해시
                            name: supaUser.user_metadata?.name || (supaUser.email || '').split('@')[0],
                            email: supaUser.email,
                            role: 'user',
                            roleId: 5,
                            phone: '',
                            birthDate: '',
                            profileImage: '',
                            branch: '',
                            branchId: null,
                            department: '',
                            team: '',
                            position: '',
                            hireDate: '',
                            annualLeaveDays: 15,
                            usedLeaveDays: 0,
                            remainingLeaveDays: 15,
                            welfareLeaveDays: 0,
                            status: 'active',
                            resignationDate: null,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            deletedAt: null
                        };
                        users.push(localUser);
                        this.saveUsers(users);
                    } else {
                        // 기존 로컬 사용자와 Supabase UID 동기화
                        if (localUser.id !== supaUser.id) {
                            console.log('[AuthManager] 로컬 사용자 ID를 Supabase UID로 정렬:', localUser.id, '→', supaUser.id);
                            localUser.id = supaUser.id;
                            this.saveUsers(users);
                        }
                    }

                    // 세션 저장 (기존 코드 호환)
                    localStorage.setItem('current_user', localUser.id);
                    try {
                        sessionStorage.setItem('currentUser', JSON.stringify(localUser));
                    } catch (e) {
                        console.warn('sessionStorage 저장 실패:', e);
                    }

                    return { success: true, message: 'Login success', user: localUser };
                }

                if (error) {
                    console.warn('[AuthManager] Supabase 로그인 실패, 로컬 로그인으로 폴백:', error.message);
                }
            } catch (supErr) {
                console.error('[AuthManager] Supabase 로그인 중 오류:', supErr);
            }
        }

        // 2) Supabase를 사용할 수 없거나 실패한 경우 → 기존 LocalStorage 기반 로그인
        const users = this.getStoredUsers(); 
        const user = users.find(u => 
            (u.username === loginId || u.email === loginId) && 
            u.password === pwd
        ); 

        if (user) { 
            // 삭제된 사용자인지 확인
            if (user.status === 'deleted' || user.deletedAt) {
                return { success: false, message: "삭제된 계정입니다." };
            }
            localStorage.setItem("current_user", user.id); 
            try {
                sessionStorage.setItem('currentUser', JSON.stringify(user));
            } catch (e) {
                console.warn('sessionStorage 저장 실패:', e);
            }
            return { success: true, message: "Login success", user: user }; 
        } else { 
            return { success: false, message: "아이디 또는 비밀번호가 올바르지 않습니다." }; 
        } 
    }
    
    logout() { 
        // Supabase 세션도 함께 종료
        if (window.supabaseClient && window.supabaseClient.auth) {
            window.supabaseClient.auth.signOut().catch(err => {
                console.error('[AuthManager] Supabase 로그아웃 오류:', err);
            });
        }
        localStorage.removeItem("current_user");
        try {
            sessionStorage.removeItem('currentUser');
        } catch (e) {
            // 무시
        }
        return { success: true, message: "Logout success" }; 
    }
    
    // 비밀번호 찾기 기능
    forgotPassword(email) {
        const users = this.getStoredUsers();
        const user = users.find(u => u.email === email);
        
        if (!user) {
            return { 
                success: false, 
                message: "해당 이메일로 등록된 계정을 찾을 수 없습니다." 
            };
        }
        
        // 임시 비밀번호 생성 (8자리 랜덤 문자열)
        const tempPassword = this.generateTempPassword();
        
        // 사용자 비밀번호 업데이트
        user.password = tempPassword;
        this.saveUsers(users);
        
        return { 
            success: true, 
            message: "임시 비밀번호가 발급되었습니다.",
            tempPassword: tempPassword
        };
    }
    
    // 임시 비밀번호 생성
    generateTempPassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let result = '';
        
        // 최소 8자리, 최대 12자리로 생성
        const length = Math.floor(Math.random() * 5) + 8;
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    }
    
    // 사용자 삭제 (이메일로) - 소프트 삭제
    deleteUserByEmail(email) {
        const users = this.getStoredUsers();
        const userIndex = users.findIndex(user => user.email === email);
        
        if (userIndex !== -1) {
            // 소프트 삭제: status를 'deleted'로 변경하고 deletedAt 설정
            users[userIndex].status = 'deleted';
            users[userIndex].deletedAt = new Date().toISOString();
            
            // 삭제된 사용자를 추적 목록에도 추가
            this.addToDeletedUsers(users[userIndex]);
            
            this.saveUsers(users);
            
            return { success: true, message: "사용자 계정이 삭제되었습니다." };
        }
        
        return { success: false, message: "해당 이메일의 사용자를 찾을 수 없습니다." };
    }
    
    // 삭제된 사용자 추적 목록에 추가
    addToDeletedUsers(user) {
        const deletedUsers = this.getDeletedUsers();
        deletedUsers.push({
            email: user.email,
            username: user.username,
            name: user.name,
            deletedAt: new Date().toISOString()
        });
        this.saveDeletedUsers(deletedUsers);
    }
    
    // 삭제된 사용자 목록 조회
    getDeletedUsers() {
        try {
            const data = localStorage.getItem('deletedUsers');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('삭제된 사용자 데이터 로드 오류:', error);
            return [];
        }
    }
    
    // 삭제된 사용자 목록 저장
    saveDeletedUsers(deletedUsers) {
        try {
            localStorage.setItem('deletedUsers', JSON.stringify(deletedUsers));
        } catch (error) {
            console.error('삭제된 사용자 데이터 저장 오류:', error);
        }
    }
    
    // 삭제된 사용자 복원 (이메일로)
    restoreUserByEmail(email) {
        const deletedUsers = this.getDeletedUsers();
        const deletedUserIndex = deletedUsers.findIndex(user => user.email === email);
        
        if (deletedUserIndex !== -1) {
            const deletedUser = deletedUsers[deletedUserIndex];
            
            // 삭제 목록에서 제거
            deletedUsers.splice(deletedUserIndex, 1);
            this.saveDeletedUsers(deletedUsers);
            
            return { success: true, message: "사용자 계정이 복원되었습니다." };
        }
        
        return { success: false, message: "해당 이메일의 삭제된 사용자를 찾을 수 없습니다." };
    }
    
    // 삭제된 사용자 영구 삭제 (이메일로)
    permanentlyDeleteUserByEmail(email) {
        const deletedUsers = this.getDeletedUsers();
        const deletedUserIndex = deletedUsers.findIndex(user => user.email === email);
        
        if (deletedUserIndex !== -1) {
            deletedUsers.splice(deletedUserIndex, 1);
            this.saveDeletedUsers(deletedUsers);
            
            return { success: true, message: "사용자 계정이 영구 삭제되었습니다." };
        }
        
        return { success: false, message: "해당 이메일의 삭제된 사용자를 찾을 수 없습니다." };
    }
    
    // 기존 삭제된 사용자 정리 (일회성)
    cleanupDeletedUsers() {
        if (typeof window.dataManager === 'undefined') return;
        
        const deletedEmployees = window.dataManager.getDeletedEmployees();
        const deletedUsers = this.getDeletedUsers();
        
        // 삭제된 직원의 이메일을 삭제된 사용자 목록에 추가
        deletedEmployees.forEach(deletedEmployee => {
            const alreadyDeleted = deletedUsers.find(user => user.email === deletedEmployee.email);
            if (!alreadyDeleted) {
                deletedUsers.push({
                    email: deletedEmployee.email,
                    username: deletedEmployee.email, // 이메일을 아이디로 사용
                    name: '삭제된 사용자',
                    deletedAt: deletedEmployee.deletedAt
                });
            }
        });
        
        this.saveDeletedUsers(deletedUsers);
        console.log('삭제된 사용자 정리 완료');
    }
    
    // 네비게이션 바 설정
    setupNavbar() {
        // DOM이 로드된 후 실행
        if (!this.isInitialized) {
            this.isInitialized = true;
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.initializeNavAvatar();
                    this.setupLogoutListener();
                });
            } else {
                this.initializeNavAvatar();
                this.setupLogoutListener();
            }
        }
    }
    
    // 메뉴바 아바타 아이콘 초기화
    initializeNavAvatar() {
        const currentUser = this.getCurrentUser();
        if (currentUser) {
            this.updateNavAvatarIcon(currentUser.profileImage);
        }
    }
    
    // 로그아웃 이벤트 리스너 설정
    setupLogoutListener() {
        // 전역 로그아웃 핸들러가 이미 등록되었는지 확인
        if (window.globalLogoutHandler) {
            return;
        }
        
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            // 전역 로그아웃 핸들러 등록
            window.globalLogoutHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                console.log('로그아웃 버튼 클릭됨');
                this.showLogoutConfirmation();
            };
            
            logoutLink.addEventListener('click', window.globalLogoutHandler, true);
            logoutLink.setAttribute('data-logout-listener', 'true');
            console.log('전역 로그아웃 리스너 설정 완료');
        }
    }
    
    
    
    // 로그아웃 확인 팝업 표시
    showLogoutConfirmation() {
        console.log('로그아웃 확인 팝업 표시');
        const confirmed = confirm('정말 로그아웃하시겠습니까?');
        console.log('사용자 선택:', confirmed ? '확인' : '취소');
        if (confirmed) {
            this.logout();
            window.location.href = 'login.html';
        }
        // 취소를 누르면 아무것도 하지 않음 (팝업만 닫힘)
    }

    // 회원가입 메서드
    async register(userData) {
        try {
            console.log('회원가입 시작:', userData);

            // 1. 이메일/아이디 중복 확인 (기존 로컬 사용자 기준)
            const users = this.getStoredUsers();
            const existingUser = users.find(u => 
                u.email === userData.email || 
                u.username === userData.username
            );
            
            if (existingUser) {
                return {
                    success: false,
                    error: '이미 사용 중인 이메일입니다.'
                };
            }

            let supabaseUser = null;

            // 2. Supabase Auth 계정 생성 (가능한 경우)
            if (window.supabaseClient && window.supabaseClient.auth) {
                try {
                    const { data, error } = await window.supabaseClient.auth.signUp({
                        email: userData.email,
                        password: userData.password,
                        options: {
                            data: {
                                name: userData.name
                            }
                        }
                    });

                    if (error) {
                        console.error('[AuthManager] Supabase 회원가입 오류:', error);
                        return {
                            success: false,
                            error: error.message || 'Supabase 회원가입 중 오류가 발생했습니다.'
                        };
                    }

                    supabaseUser = data.user;
                    console.log('[AuthManager] ✅ Supabase 계정 생성 완료:', supabaseUser.id);
                } catch (supErr) {
                    console.error('[AuthManager] Supabase 회원가입 예외:', supErr);
                    return {
                        success: false,
                        error: 'Supabase 회원가입 중 예외가 발생했습니다.'
                    };
                }
            } else {
                console.warn('⚠️ Supabase 클라이언트가 없어, 로컬 계정만 생성합니다.');
            }

            // 3. 새 사용자 ID 결정
            const newUserId = supabaseUser ? supabaseUser.id : `user_${Date.now()}`;

            // 4. 로컬 사용자 데이터 생성 (기존 앱 구조 유지용)
            const newUser = {
                id: newUserId,
                username: userData.username,
                password: userData.password, // TODO: 추후 암호화/제거
                name: userData.name,
                email: userData.email,
                role: 'user',        // 기본 역할
                roleId: 5,           // RoleManager의 user ID
                phone: userData.phone,
                birthDate: userData.birthdate,
                profileImage: '',
                branch: userData.branch,
                department: userData.department,
                team: userData.department, // 부서를 팀으로도 사용
                position: userData.position,
                hireDate: userData.joindate,
                annualLeaveDays: 15,
                usedLeaveDays: 0,
                remainingLeaveDays: 15,
                welfareLeaveDays: 0,
                status: 'active',
                resignationDate: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null
            };

            // 5. LocalStorage에 저장 (기존 화면들과 호환)
            users.push(newUser);
            this.saveUsers(users);
            console.log('✅ LocalStorage에 사용자 저장 완료');

            // 6. Supabase users 테이블에 프로필 저장 (가능한 경우)
            if (supabaseUser && window.supabaseClient) {
                try {
                    const { error } = await window.supabaseClient
                        .from('users')
                        .upsert([{
                            id: supabaseUser.id,           // 🔥 auth.uid() 와 동일
                            login_id: userData.username,
                            username: userData.username,
                            password: userData.password,   // ⚠️ 운영 시 반드시 해시 필요
                            name: userData.name,
                            email: userData.email,
                            phone: userData.phone,
                            birth_date: userData.birthdate,
                            profile_image: '',
                            branch: userData.branch,
                            department: userData.department,
                            team: userData.department,
                            position: userData.position,
                            hire_date: userData.joindate,
                            annual_leave_days: 15,
                            used_leave_days: 0,
                            remaining_leave_days: 15,
                            welfare_leave_days: 0,
                            status: 1,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }], { onConflict: 'id' });

                    if (error) {
                        console.error('❌ Supabase users 저장 오류:', error);
                    } else {
                        console.log('✅ Supabase users 테이블에 사용자 저장 완료');
                    }
                } catch (supabaseError) {
                    console.error('❌ Supabase users 저장 중 예외:', supabaseError);
                }
            }

            return {
                success: true,
                message: '회원가입이 완료되었습니다!'
            };

        } catch (error) {
            console.error('회원가입 오류:', error);
            return {
                success: false,
                error: '회원가입 중 오류가 발생했습니다.'
            };
        }
    }
}

window.authManager = new AuthManager();

function getCurrentUser() { 
    return window.authManager.getCurrentUser(); 
}

function updateUserInStorage(user) { 
    return window.authManager.updateUserInStorage(user); 
}

function checkAuth() { 
    return window.authManager.checkAuth(); 
}

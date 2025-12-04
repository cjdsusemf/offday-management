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
    
    login(username, password) { 
        const users = this.getStoredUsers(); 
        const user = users.find(u => u.username === username && u.password === password); 
        if (user) { 
            // 삭제된 사용자인지 확인
            if (user.status === 'deleted' || user.deletedAt) {
                return { success: false, message: "삭제된 계정입니다." };
            }
            localStorage.setItem("current_user", user.id); 
            return { success: true, message: "Login success", user: user }; 
        } else { 
            return { success: false, message: "Invalid username or password" }; 
        } 
    }
    
    logout() { 
        localStorage.removeItem("current_user");
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
    
    register(userData) {
        const users = this.getStoredUsers();
        const deletedUsers = this.getDeletedUsers();
        
        // 중복 아이디 확인 (활성 사용자만)
        if (users.find(u => u.username === userData.username && u.status === 'active')) {
            return { success: false, error: "이미 사용 중인 아이디입니다." };
        }
        
        // 중복 이메일 확인 (활성 사용자만)
        if (users.find(u => u.email === userData.email && u.status === 'active')) {
            return { success: false, error: "이미 사용 중인 이메일입니다." };
        }
        
        // 새 사용자 생성 (통합된 구조)
        const newUser = {
            // 인증 정보
            id: Date.now().toString(),
            username: userData.username,
            password: userData.password,
            role: "user",
            roleId: 4,  // 일반 사용자 역할
            
            // 개인 정보
            name: userData.name,
            email: userData.email,
            phone: userData.phone || '',
            birthDate: userData.birthdate,
            profileImage: '',
            
            // 회사 정보
            branch: userData.branch,
            branchId: null, // 지점 ID는 나중에 설정
            department: userData.department,
            team: userData.department, // 팀은 부서와 동일하게 설정
            position: userData.position,
            hireDate: userData.joindate,
            
            // 연차 정보
            annualLeaveDays: 15,
            usedLeaveDays: 0,
            remainingLeaveDays: 15,
            welfareLeaveDays: 0,
            
            // 상태 정보
            status: 'active',
            resignationDate: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null
        };
        
        users.push(newUser);
        this.saveUsers(users);
        
        return { success: true, message: "회원가입이 완료되었습니다." };
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

            // 1. 이메일 중복 확인
            const users = this.getStoredUsers();
            const existingUser = users.find(u => u.email === userData.email || u.username === userData.username);
            
            if (existingUser) {
                return {
                    success: false,
                    error: '이미 사용 중인 이메일입니다.'
                };
            }

            // 2. 새 사용자 ID 생성
            const newUserId = `user_${Date.now()}`;

            // 3. 사용자 데이터 생성
            const newUser = {
                id: newUserId,
                username: userData.username,
                password: userData.password, // 실제로는 암호화 필요
                name: userData.name,
                email: userData.email,
                role: 'user', // 기본 역할
                roleId: 5, // user 역할 ID
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

            // 4. LocalStorage에 저장
            users.push(newUser);
            this.saveUsers(users);
            console.log('✅ LocalStorage에 사용자 저장 완료');

            // 5. Supabase에 저장
            if (window.supabaseClient) {
                try {
                    const { data, error} = await window.supabaseClient
                        .from('users')
                        .insert([{
                            id: newUserId,
                            username: userData.username,
                            password: userData.password,
                            name: userData.name,
                            email: userData.email,
                            role: 'user',
                            phone: userData.phone,
                            birth_date: userData.birthdate,
                            profile_image: '',
                            branch: userData.branch,
                            department: userData.department,
                            position: userData.position,
                            hire_date: userData.joindate,
                            annual_leave_days: 15,
                            used_leave_days: 0,
                            remaining_leave_days: 15,
                            welfare_leave_days: 0,
                            status: 'active',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }]);

                    if (error) {
                        console.error('❌ Supabase 저장 오류:', error);
                    } else {
                        console.log('✅ Supabase에 사용자 저장 완료');
                    }
                } catch (supabaseError) {
                    console.error('❌ Supabase 연결 오류:', supabaseError);
                }
            } else {
                console.warn('⚠️ Supabase 클라이언트가 없습니다. LocalStorage만 사용합니다.');
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

class AuthManager {
    constructor() { 
        this.initializeDefaultUsers();
        // dataManager가 로드된 후 자동 동기화 실행
        this.setupAutoSync();
    }
    
    getStoredUsers() { 
        return JSON.parse(localStorage.getItem("offday_users") || "[]"); 
    }
    
    saveUsers(users) { 
        localStorage.setItem("offday_users", JSON.stringify(users)); 
    }
    
    initializeDefaultUsers() { 
        const users = this.getStoredUsers(); 
        if (users.length === 0) { 
            const defaultUsers = [
                { 
                    id: "admin", 
                    username: "admin", 
                    password: "admin123", 
                    name: "admin", 
                    email: "admin@offday.com", 
                    role: "admin", 
                    department: "admin", 
                    joindate: "2020-01-01", 
                    birthdate: "1990-01-01" 
                }
            ]; 
            this.saveUsers(defaultUsers); 
        } 
    }
    
    getCurrentUser() { 
        const id = localStorage.getItem("offday_current_user"); 
        return id ? this.getStoredUsers().find(u => u.id === id) : null; 
    }
    
    updateUserInStorage(updatedUser) { 
        const users = this.getStoredUsers(); 
        const index = users.findIndex(u => u.id === updatedUser.id); 
        if (index !== -1) { 
            users[index] = { ...users[index], ...updatedUser }; 
            this.saveUsers(users); 
            return true; 
        } 
        return false; 
    }
    
    checkAuth() { 
        return this.getCurrentUser() !== null; 
    }
    
    login(username, password) { 
        const users = this.getStoredUsers(); 
        const user = users.find(u => u.username === username && u.password === password); 
        if (user) { 
            localStorage.setItem("offday_current_user", user.id); 
            return { success: true, message: "Login success", user: user }; 
        } else { 
            return { success: false, message: "Invalid username or password" }; 
        } 
    }
    
    logout() { 
        localStorage.removeItem("offday_current_user");
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
    
    // 사용자 삭제 (이메일로)
    deleteUserByEmail(email) {
        const users = this.getStoredUsers();
        const userIndex = users.findIndex(user => user.email === email);
        
        if (userIndex !== -1) {
            const deletedUser = users[userIndex];
            
            // 삭제된 사용자를 추적 목록에 추가
            this.addToDeletedUsers(deletedUser);
            
            // 사용자 목록에서 제거
            users.splice(userIndex, 1);
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
        
        // 중복 아이디 확인
        if (users.find(u => u.username === userData.username)) {
            return { success: false, error: "이미 사용 중인 아이디입니다." };
        }
        
        // 중복 이메일 확인 (활성 사용자)
        if (users.find(u => u.email === userData.email)) {
            return { success: false, error: "이미 사용 중인 이메일입니다." };
        }
        
        // 삭제된 사용자 이메일 확인
        if (deletedUsers.find(u => u.email === userData.email)) {
            return { success: false, error: "이전에 삭제된 계정의 이메일입니다. 다른 이메일을 사용해주세요." };
        }
        
        // 새 사용자 생성
        const newUser = {
            id: Date.now().toString(),
            username: userData.username,
            password: userData.password,
            name: userData.name,
            email: userData.email,
            birthdate: userData.birthdate,
            joindate: userData.joindate,
            branch: userData.branch,
            department: userData.department,
            role: "user"
        };
        
        users.push(newUser);
        this.saveUsers(users);
        
        // 직원 데이터에도 자동 추가
        this.addToEmployeeData(newUser, userData);
        
        return { success: true, message: "회원가입이 완료되었습니다." };
    }
    
    // 직원 데이터에 추가하는 메서드
    addToEmployeeData(user, userData) {
        // dataManager가 로드되었는지 확인
        if (typeof window.dataManager !== 'undefined') {
            const employeeData = {
                name: user.name,
                email: user.email,
                department: user.department,
                branch: user.branch,
                position: userData.position || '매니저', // 회원가입 시 선택한 직급 사용
                phone: userData.phone || '',
                joinDate: user.joindate,
                annualLeaveDays: 15 // 기본 연차 일수
            };
            
            window.dataManager.addEmployee(employeeData);
        }
    }
    
    // 기존 사용자들을 직원 데이터에 동기화하는 메서드
    syncUsersToEmployees() {
        if (typeof window.dataManager === 'undefined') {
            console.error('dataManager가 로드되지 않음');
            return;
        }
        
        const users = this.getStoredUsers();
        const employees = window.dataManager.employees;
        const deletedEmployees = window.dataManager.deletedEmployees || [];
        
        console.log('동기화 시작:', { 
            usersCount: users.length, 
            employeesCount: employees.length,
            users: users.map(u => ({ email: u.email, name: u.name, role: u.role })),
            employees: employees.map(e => ({ email: e.email, name: e.name }))
        });
        
        let addedCount = 0;
        users.forEach(user => {
            // 이미 직원 데이터에 있는지 확인 (이메일로 비교)
            const existingEmployee = employees.find(emp => emp.email === user.email);
            
            // 삭제된 직원인지 확인 (이메일로 비교)
            const isDeleted = deletedEmployees.some(deleted => deleted.email === user.email);
            
            console.log(`사용자 ${user.email} 검사:`, { 
                existingEmployee: !!existingEmployee, 
                isDeleted, 
                role: user.role 
            });
            
            if (!existingEmployee && !isDeleted && user.role !== 'admin') {
                // 직원 데이터에 없고, 삭제되지 않았으며, 관리자가 아닌 사용자라면 추가
                console.log('새 직원 추가:', user.email);
                this.addToEmployeeData(user, user);
                addedCount++;
            }
        });
        
        console.log('동기화 완료:', { 
            addedCount, 
            totalEmployees: window.dataManager.employees.length 
        });
    }
    
    // 자동 동기화 설정
    setupAutoSync() {
        // dataManager가 로드될 때까지 대기
        const checkDataManager = () => {
            if (typeof window.dataManager !== 'undefined') {
                console.log('자동 동기화 실행 중...');
                this.syncUsersToEmployees();
            } else {
                // 100ms 후 다시 확인
                setTimeout(checkDataManager, 100);
            }
        };
        
        // DOM이 로드된 후 동기화 실행
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', checkDataManager);
        } else {
            checkDataManager();
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

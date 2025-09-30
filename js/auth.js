class AuthManager {
    constructor() { 
        this.initializeDefaultUsers(); 
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
    
    register(userData) {
        const users = this.getStoredUsers();
        
        // 중복 아이디 확인
        if (users.find(u => u.username === userData.username)) {
            return { success: false, error: "이미 사용 중인 아이디입니다." };
        }
        
        // 중복 이메일 확인
        if (users.find(u => u.email === userData.email)) {
            return { success: false, error: "이미 사용 중인 이메일입니다." };
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
        
        return { success: true, message: "회원가입이 완료되었습니다." };
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

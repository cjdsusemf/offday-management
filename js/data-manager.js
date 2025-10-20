// 데이터 관리자 클래스
class DataManager {
    constructor() {
        this.employees = this.loadData('employees') || [];
        this.leaveRequests = this.loadData('leaveRequests') || [];
        this.settings = this.loadData('settings') || {};
        this.deletedEmployees = this.loadData('deletedEmployees') || []; // 삭제된 직원 추적
        this.branchTeams = this.loadData('branchTeams') || {}; // 지점별 팀 관리
        this.branches = this.loadData('branches') || []; // 지점 데이터
        
        // 샘플 데이터가 없으면 생성
        if (this.employees.length === 0) {
            this.createSampleData();
        }
        
        // 지점 데이터가 없으면 샘플 지점 데이터 생성
        if (this.branches.length === 0) {
            this.createSampleBranches();
        }
        
        // 지점별 팀 데이터 초기화
        this.initializeBranchTeams();
        
        // 기존 직원 데이터 마이그레이션
        this.migrateEmployeeDataToBranchTeams();
    }
    
    // 모든 직원 관련 데이터 강제 삭제
    clearAllEmployeeData() {
        localStorage.removeItem('employees');
        localStorage.removeItem('leaveRequests');
        localStorage.removeItem('deletedEmployees');
        localStorage.removeItem('deletedUsers'); // 삭제된 사용자 목록도 삭제
        
        // 사용자 계정도 함께 삭제 (admin 제외)
        const users = JSON.parse(localStorage.getItem("offday_users") || "[]");
        const adminUser = users.find(u => u.role === 'admin');
        if (adminUser) {
            localStorage.setItem("offday_users", JSON.stringify([adminUser]));
            console.log('🗑️ 관리자 계정 제외하고 모든 사용자 계정이 삭제되었습니다.');
        }
        
        console.log('🗑️ 모든 직원 데이터와 삭제된 사용자 목록이 삭제되었습니다.');
        console.log('✅ 회원가입 시 자동 직원 데이터 추가 기능은 유지됩니다.');
    }

    // 로컬 스토리지에서 데이터 로드
    loadData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('데이터 로드 오류:', error);
            return null;
        }
    }

    // 로컬 스토리지에 데이터 저장
    saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            // 동일 탭에서도 변화를 감지할 수 있도록 커스텀 이벤트 디스패치
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                try {
                    window.dispatchEvent(new CustomEvent('dm:updated', { detail: { key } }));
                } catch (e) {
                    // 이벤트 디스패치는 실패해도 동작에 영향 없음
                }
            }
            return true;
        } catch (error) {
            console.error('데이터 저장 오류:', error);
            return false;
        }
    }

    // 샘플 데이터 생성 (빈 배열로 시작)
    createSampleData() {
        // 빈 배열로 초기화
        this.employees = [];
        this.leaveRequests = [];
        this.deletedEmployees = [];
        
        // localStorage에 빈 데이터 저장
        this.saveData('employees', []);
        this.saveData('leaveRequests', []);
        this.saveData('deletedEmployees', []);
        
        console.log('✅ 직원 데이터가 빈 상태로 초기화되었습니다.');
    }

    // 샘플 지점 데이터 생성
    createSampleBranches() {
        const sampleBranches = [
            {
                id: 1,
                name: '본사',
                address: '서울특별시 강남구 테헤란로 123',
                phone: '02-1234-5678',
                manager: '김대표',
                description: '본사 건물입니다.',
                createdAt: '2024-01-01',
                departments: ['경영관리팀', '개발팀', '마케팅팀', '인사팀'],
                leaveCalculationStandard: 'hire_date' // 입사일 기준
            },
            {
                id: 2,
                name: '강남점',
                address: '서울특별시 강남구 역삼동 456',
                phone: '02-2345-6789',
                manager: '이지점장',
                description: '강남 지점입니다.',
                createdAt: '2024-01-15',
                departments: ['영업팀', '컨설팅팀', '지원팀'],
                leaveCalculationStandard: 'fiscal_year' // 회계연도 기준
            },
            {
                id: 3,
                name: '영등포점',
                address: '서울특별시 영등포구 영등포동 123',
                phone: '02-3456-7890',
                manager: '최지점장',
                description: '영등포 지점입니다.',
                createdAt: '2024-02-01',
                departments: ['경영관리팀', '택스팀', '컨설팅팀'],
                leaveCalculationStandard: 'hire_date' // 입사일 기준
            },
            {
                id: 4,
                name: '부산점',
                address: '부산광역시 해운대구 우동 789',
                phone: '051-3456-7890',
                manager: '박지점장',
                description: '부산 지점입니다.',
                createdAt: '2024-02-01',
                departments: ['영업팀', '마케팅팀'],
                leaveCalculationStandard: 'fiscal_year' // 회계연도 기준
            },
            {
                id: 5,
                name: '서초점',
                address: '서울특별시 서초구 서초동 101',
                phone: '02-3456-7890',
                manager: '최지점장',
                description: '서초 지점입니다.',
                createdAt: '2024-02-15',
                departments: ['개발팀', '인사팀'],
                leaveCalculationStandard: 'hire_date' // 입사일 기준
            },
            {
                id: 5,
                name: '송파점',
                address: '서울특별시 송파구 잠실동 202',
                phone: '02-4567-8901',
                manager: '정지점장',
                description: '송파 지점입니다.',
                createdAt: '2024-03-01'
            },
            {
                id: 6,
                name: '마포점',
                address: '서울특별시 마포구 홍대입구역 303',
                phone: '02-5678-9012',
                manager: '한지점장',
                description: '마포 지점입니다.',
                createdAt: '2024-03-15'
            },
            {
                id: 7,
                name: '용산점',
                address: '서울특별시 용산구 이태원동 404',
                phone: '02-6789-0123',
                manager: '오지점장',
                description: '용산 지점입니다.',
                createdAt: '2024-04-01'
            },
            {
                id: 8,
                name: '영등포점',
                address: '서울특별시 영등포구 여의도동 505',
                phone: '02-7890-1234',
                manager: '강지점장',
                description: '영등포 지점입니다.',
                createdAt: '2024-04-15'
            },
            {
                id: 9,
                name: '구로점',
                address: '서울특별시 구로구 구로동 606',
                phone: '02-8901-2345',
                manager: '윤지점장',
                description: '구로 지점입니다.',
                createdAt: '2024-05-01'
            },
            {
                id: 10,
                name: '금천점',
                address: '서울특별시 금천구 가산동 707',
                phone: '02-9012-3456',
                manager: '임지점장',
                description: '금천 지점입니다.',
                createdAt: '2024-05-15'
            },
            {
                id: 11,
                name: '관악점',
                address: '서울특별시 관악구 신림동 808',
                phone: '02-0123-4567',
                manager: '조지점장',
                description: '관악 지점입니다.',
                createdAt: '2024-06-01'
            }
        ];
        this.branches = sampleBranches;
        this.saveData('branches', this.branches);
    }

    // 연차 신청 상태 업데이트
    updateLeaveRequestStatus(id, status, approvedBy = '관리자') {
        const index = this.leaveRequests.findIndex(req => req.id === id);
        if (index !== -1) {
            this.leaveRequests[index].status = status;
            this.leaveRequests[index].approvedDate = new Date().toISOString().split('T')[0];
            this.leaveRequests[index].approvedBy = approvedBy;
            
            // 승인된 경우 직원의 사용 연차일 업데이트
            if (status === 'approved') {
                const request = this.leaveRequests[index];
                const employee = this.employees.find(emp => emp.id === request.employeeId);
                if (employee) {
                    employee.usedLeaveDays += request.days;
                    employee.remainingLeaveDays -= request.days;
                }
            }
            
            this.saveData('leaveRequests', this.leaveRequests);
            this.saveData('employees', this.employees);
            return this.leaveRequests[index];
        }
        return null;
    }

    // 직원 추가
    addEmployee(employee) {
        const newEmployee = {
            ...employee,
            id: Date.now(),
            usedLeaveDays: 0,
            remainingLeaveDays: employee.annualLeaveDays || 15
        };
        this.employees.push(newEmployee);
        this.saveData('employees', this.employees);
        return newEmployee;
    }

    // 직원 업데이트
    updateEmployee(id, employeeData) {
        const index = this.employees.findIndex(emp => emp.id === id);
        if (index !== -1) {
            this.employees[index] = { ...this.employees[index], ...employeeData };
            this.saveData('employees', this.employees);
            return this.employees[index];
        }
        return null;
    }

    // 직원 삭제
    deleteEmployee(id) {
        const index = this.employees.findIndex(emp => emp.id === id);
        if (index !== -1) {
            const deletedEmployee = this.employees[index];
            
            // 삭제된 직원을 추적 목록에 추가
            this.deletedEmployees.push({
                email: deletedEmployee.email,
                deletedAt: new Date().toISOString()
            });
            
            // 직원 목록에서 제거
            this.employees.splice(index, 1);
            
            // 사용자 계정도 함께 삭제
            if (typeof window.authManager !== 'undefined') {
                window.authManager.deleteUserByEmail(deletedEmployee.email);
            }
            
            // 데이터 저장
            this.saveData('employees', this.employees);
            this.saveData('deletedEmployees', this.deletedEmployees);
            
            return true;
        }
        return false;
    }

    // 삭제된 직원 목록 조회
    getDeletedEmployees() {
        return this.deletedEmployees;
    }

    // 삭제된 직원 복원
    restoreEmployee(email) {
        const deletedIndex = this.deletedEmployees.findIndex(deleted => deleted.email === email);
        if (deletedIndex !== -1) {
            // 삭제 목록에서 제거
            this.deletedEmployees.splice(deletedIndex, 1);
            this.saveData('deletedEmployees', this.deletedEmployees);
            return true;
        }
        return false;
    }

    // 삭제된 직원 영구 삭제
    permanentlyDeleteEmployee(email) {
        const deletedIndex = this.deletedEmployees.findIndex(deleted => deleted.email === email);
        if (deletedIndex !== -1) {
            this.deletedEmployees.splice(deletedIndex, 1);
            this.saveData('deletedEmployees', this.deletedEmployees);
            return true;
        }
        return false;
    }

    // 퇴사 처리
    resignEmployee(id, resignationDate = null) {
        const employeeIndex = this.employees.findIndex(emp => emp.id === id);
        if (employeeIndex !== -1) {
            this.employees[employeeIndex].status = 'resigned';
            this.employees[employeeIndex].resignationDate = resignationDate || new Date().toISOString().split('T')[0];
            this.saveData('employees', this.employees);
            return true;
        }
        return false;
    }

    // 재직 처리 (퇴사 취소)
    reactivateEmployee(id) {
        const employeeIndex = this.employees.findIndex(emp => emp.id === id);
        if (employeeIndex !== -1) {
            this.employees[employeeIndex].status = 'active';
            delete this.employees[employeeIndex].resignationDate;
            this.saveData('employees', this.employees);
            return true;
        }
        return false;
    }

    // 활성 직원 목록 조회
    getActiveEmployees() {
        return this.employees.filter(emp => emp.status === 'active');
    }

    // 퇴사자 목록 조회
    getResignedEmployees() {
        return this.employees.filter(emp => emp.status === 'resigned');
    }

    // 직원이 연차 신청 내역이 있는지 확인
    hasLeaveRequests(employeeId) {
        return this.leaveRequests.some(request => request.employeeId === employeeId);
    }

    // 지점별 팀 데이터 초기화
    initializeBranchTeams() {
        const defaultTeams = {
            "본사": ["경영지원팀", "인사팀", "총무팀", "재무팀", "개발팀", "디자인팀"],
            "강남점": ["영업팀", "고객서비스팀", "마케팅팀"],
            "부산점": ["영업팀", "물류팀", "구매팀"],
            "대구점": ["영업팀", "마케팅팀", "고객서비스팀"],
            "인천점": ["영업팀", "물류팀"],
            "광주점": ["영업팀", "고객서비스팀"]
        };

        // 기존 데이터가 없으면 기본 팀 구조 생성
        if (Object.keys(this.branchTeams).length === 0) {
            this.branchTeams = defaultTeams;
            this.saveData('branchTeams', this.branchTeams);
        } else {
            // 새로운 지점이 추가된 경우 기본 팀 추가
            let updated = false;
            Object.keys(defaultTeams).forEach(branch => {
                if (!this.branchTeams[branch]) {
                    this.branchTeams[branch] = defaultTeams[branch];
                    updated = true;
                }
            });
            
            if (updated) {
                this.saveData('branchTeams', this.branchTeams);
            }
        }
    }

    // 지점별 팀 목록 조회
    getBranchTeams(branchName) {
        return this.branchTeams[branchName] || [];
    }

    // 지점별 팀 추가
    addBranchTeam(branchName, teamName) {
        if (!this.branchTeams[branchName]) {
            this.branchTeams[branchName] = [];
        }
        
        // 중복 팀명 확인
        if (!this.branchTeams[branchName].includes(teamName)) {
            this.branchTeams[branchName].push(teamName);
            this.saveData('branchTeams', this.branchTeams);
            return true;
        }
        return false;
    }

    // 지점별 팀 삭제
    removeBranchTeam(branchName, teamName) {
        if (this.branchTeams[branchName]) {
            const index = this.branchTeams[branchName].indexOf(teamName);
            if (index > -1) {
                this.branchTeams[branchName].splice(index, 1);
                this.saveData('branchTeams', this.branchTeams);
                return true;
            }
        }
        return false;
    }

    // 지점별 팀 수정
    updateBranchTeam(branchName, oldTeamName, newTeamName) {
        if (this.branchTeams[branchName]) {
            const index = this.branchTeams[branchName].indexOf(oldTeamName);
            if (index > -1) {
                this.branchTeams[branchName][index] = newTeamName;
                this.saveData('branchTeams', this.branchTeams);
                return true;
            }
        }
        return false;
    }

    // 모든 지점의 팀 목록 조회
    getAllBranchTeams() {
        return this.branchTeams;
    }

    // 지점 삭제 시 팀 데이터도 삭제
    deleteBranchTeams(branchName) {
        if (this.branchTeams[branchName]) {
            delete this.branchTeams[branchName];
            this.saveData('branchTeams', this.branchTeams);
            return true;
        }
        return false;
    }

    // 기존 직원 데이터 마이그레이션 (지점별 팀 구조에 맞게)
    migrateEmployeeDataToBranchTeams() {
        let migrated = false;
        
        this.employees.forEach(employee => {
            const branchName = employee.branch;
            const departmentName = employee.department;
            
            // 해당 지점에 팀이 없으면 추가
            if (branchName && departmentName) {
                if (!this.branchTeams[branchName]) {
                    this.branchTeams[branchName] = [];
                }
                
                // 해당 팀이 지점의 팀 목록에 없으면 추가
                if (!this.branchTeams[branchName].includes(departmentName)) {
                    this.branchTeams[branchName].push(departmentName);
                    migrated = true;
                }
            }
        });
        
        if (migrated) {
            this.saveData('branchTeams', this.branchTeams);
            console.log('직원 데이터가 지점별 팀 구조로 마이그레이션되었습니다.');
        }
    }

    // 연차 신청 추가
    addLeaveRequest(request) {
        const newRequest = {
            ...request,
            id: Date.now(),
            status: 'pending',
            requestDate: new Date().toISOString().split('T')[0]
        };
        this.leaveRequests.push(newRequest);
        this.saveData('leaveRequests', this.leaveRequests);
        return newRequest;
    }

    // 통계 데이터 가져오기
    getStatistics() {
        const totalEmployees = this.employees.length;
        const totalLeaveRequests = this.leaveRequests.length;
        const pendingRequests = this.leaveRequests.filter(req => req.status === 'pending').length;
        const approvedRequests = this.leaveRequests.filter(req => req.status === 'approved').length;
        const rejectedRequests = this.leaveRequests.filter(req => req.status === 'rejected').length;
        
        const totalUsedDays = this.leaveRequests
            .filter(req => req.status === 'approved')
            .reduce((sum, req) => sum + req.days, 0);
        
        const averageRemainingDays = this.employees.length > 0 
            ? this.employees.reduce((sum, emp) => sum + emp.remainingLeaveDays, 0) / this.employees.length 
            : 0;

        return {
            totalEmployees,
            totalLeaveRequests,
            pendingRequests,
            approvedRequests,
            rejectedRequests,
            totalUsedDays,
            averageRemainingDays
        };
    }
}

// 전역 인스턴스 생성
window.dataManager = new DataManager();

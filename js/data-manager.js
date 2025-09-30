// 데이터 관리자 클래스
class DataManager {
    constructor() {
        this.employees = this.loadData('employees') || [];
        this.leaveRequests = this.loadData('leaveRequests') || [];
        this.settings = this.loadData('settings') || {};
        
        // 샘플 데이터가 없으면 생성
        if (this.employees.length === 0) {
            this.createSampleData();
        }
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
            return true;
        } catch (error) {
            console.error('데이터 저장 오류:', error);
            return false;
        }
    }

    // 샘플 데이터 생성
    createSampleData() {
        const sampleEmployees = [
            {
                id: 1,
                name: '김철수',
                department: '개발팀',
                branch: '본사',
                position: '대리',
                email: 'kim@company.com',
                phone: '010-1234-5678',
                hireDate: '2022-01-15',
                annualLeaveDays: 15,
                usedLeaveDays: 0,
                remainingLeaveDays: 15
            },
            {
                id: 2,
                name: '이영희',
                department: '마케팅팀',
                branch: '강남점',
                position: '과장',
                email: 'lee@company.com',
                phone: '010-2345-6789',
                hireDate: '2021-03-20',
                annualLeaveDays: 20,
                usedLeaveDays: 0,
                remainingLeaveDays: 20
            },
            {
                id: 3,
                name: '박민수',
                department: '영업팀',
                branch: '부산점',
                position: '부장',
                email: 'park@company.com',
                phone: '010-3456-7890',
                hireDate: '2020-06-10',
                annualLeaveDays: 25,
                usedLeaveDays: 0,
                remainingLeaveDays: 25
            }
        ];

        const sampleRequests = [
            {
                id: 1,
                employeeId: 1,
                employeeName: '김철수',
                startDate: '2024-02-01',
                endDate: '2024-02-03',
                days: 3,
                reason: '개인 휴가',
                status: 'pending',
                requestDate: '2024-01-28'
            },
            {
                id: 2,
                employeeId: 2,
                employeeName: '이영희',
                startDate: '2024-02-05',
                endDate: '2024-02-05',
                days: 1,
                reason: '의료진료',
                status: 'pending',
                requestDate: '2024-01-30'
            },
            {
                id: 3,
                employeeId: 3,
                employeeName: '박민수',
                startDate: '2024-02-10',
                endDate: '2024-02-12',
                days: 3,
                reason: '가족 행사',
                status: 'pending',
                requestDate: '2024-02-01'
            },
            {
                id: 4,
                employeeId: 1,
                employeeName: '김철수',
                startDate: '2024-02-15',
                endDate: '2024-02-16',
                days: 2,
                reason: '개인 사정',
                status: 'pending',
                requestDate: '2024-02-05'
            },
            {
                id: 5,
                employeeId: 2,
                employeeName: '이영희',
                startDate: '2024-02-20',
                endDate: '2024-02-22',
                days: 3,
                reason: '여행',
                status: 'pending',
                requestDate: '2024-02-10'
            }
        ];

        this.employees = sampleEmployees;
        this.leaveRequests = sampleRequests;
        this.saveData('employees', this.employees);
        this.saveData('leaveRequests', this.leaveRequests);
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
            this.employees.splice(index, 1);
            this.saveData('employees', this.employees);
            return true;
        }
        return false;
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

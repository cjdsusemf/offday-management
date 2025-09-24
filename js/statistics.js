// 통계 페이지 기능
class Statistics {
    constructor() {
        this.dataManager = window.dataManager;
        this.init();
    }

    init() {
        this.loadOverviewStats();
        this.loadMonthlyChart();
        this.loadDepartmentStats();
        this.loadLeavePatterns();
        this.setupEventListeners();
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        const yearFilter = document.getElementById('year-filter');
        yearFilter.addEventListener('change', () => {
            this.loadMonthlyChart();
        });
    }

    // 전체 통계 개요 로드
    loadOverviewStats() {
        const employees = this.dataManager.employees;
        const leaveRequests = this.dataManager.leaveRequests;

        const totalEmployees = employees.length;
        const totalLeaveDays = employees.reduce((sum, emp) => sum + emp.annualLeaveDays, 0);
        const usedLeaveDays = employees.reduce((sum, emp) => sum + emp.usedLeaveDays, 0);
        const usageRate = totalLeaveDays > 0 ? Math.round((usedLeaveDays / totalLeaveDays) * 100) : 0;

        document.getElementById('total-employees').textContent = totalEmployees;
        document.getElementById('total-leave-days').textContent = totalLeaveDays;
        document.getElementById('used-leave-days').textContent = usedLeaveDays;
        document.getElementById('usage-rate').textContent = usageRate + '%';
    }

    // 월별 차트 로드
    loadMonthlyChart() {
        const year = document.getElementById('year-filter').value;
        const leaveRequests = this.dataManager.leaveRequests;
        const container = document.getElementById('monthly-chart');

        // 해당 연도의 월별 데이터 계산
        const monthlyData = this.calculateMonthlyData(leaveRequests, year);
        
        // 차트 생성
        container.innerHTML = monthlyData.map((data, index) => {
            const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', 
                              '7월', '8월', '9월', '10월', '11월', '12월'];
            const height = Math.max((data.days / Math.max(...monthlyData.map(d => d.days))) * 200, 20);
            
            return `
                <div class="month-bar" style="height: ${height}px;">
                    <div class="month-value">${data.days}일</div>
                    <div class="month-label">${monthNames[index]}</div>
                </div>
            `;
        }).join('');
    }

    // 월별 데이터 계산
    calculateMonthlyData(leaveRequests, year) {
        const monthlyData = Array(12).fill(0).map(() => ({ days: 0, count: 0 }));
        
        leaveRequests.forEach(request => {
            if (request.status === 'approved') {
                const requestDate = new Date(request.startDate);
                if (requestDate.getFullYear() == year) {
                    const month = requestDate.getMonth();
                    monthlyData[month].days += request.days;
                    monthlyData[month].count += 1;
                }
            }
        });
        
        return monthlyData;
    }

    // 부서별 통계 로드
    loadDepartmentStats() {
        const employees = this.dataManager.employees;
        const leaveRequests = this.dataManager.leaveRequests;
        const container = document.getElementById('department-stats');

        // 부서별 데이터 그룹화
        const departmentData = {};
        
        employees.forEach(employee => {
            if (!departmentData[employee.department]) {
                departmentData[employee.department] = {
                    employees: [],
                    totalLeaveDays: 0,
                    usedLeaveDays: 0,
                    pendingRequests: 0
                };
            }
            departmentData[employee.department].employees.push(employee);
            departmentData[employee.department].totalLeaveDays += employee.annualLeaveDays;
            departmentData[employee.department].usedLeaveDays += employee.usedLeaveDays;
        });

        // 부서별 대기 중인 신청 수 계산
        leaveRequests.forEach(request => {
            if (request.status === 'pending') {
                const employee = employees.find(emp => emp.id === request.employeeId);
                if (employee && departmentData[employee.department]) {
                    departmentData[employee.department].pendingRequests++;
                }
            }
        });

        // 부서별 카드 생성
        container.innerHTML = Object.entries(departmentData).map(([department, data]) => {
            const remainingDays = data.totalLeaveDays - data.usedLeaveDays;
            const usageRate = data.totalLeaveDays > 0 ? Math.round((data.usedLeaveDays / data.totalLeaveDays) * 100) : 0;
            
            return `
                <div class="department-card">
                    <div class="department-header">
                        <div class="department-name">${department}</div>
                        <div class="department-count">${data.employees.length}명</div>
                    </div>
                    <div class="department-stats-grid">
                        <div class="department-stat">
                            <div class="value">${data.totalLeaveDays}</div>
                            <div class="label">총 연차</div>
                        </div>
                        <div class="department-stat">
                            <div class="value">${data.usedLeaveDays}</div>
                            <div class="label">사용 연차</div>
                        </div>
                        <div class="department-stat">
                            <div class="value">${remainingDays}</div>
                            <div class="label">잔여 연차</div>
                        </div>
                    </div>
                    <div style="margin-top: 1rem; text-align: center;">
                        <div style="font-size: 0.9rem; color: #7f8c8d;">사용률: ${usageRate}%</div>
                        <div style="font-size: 0.8rem; color: #95a5a6; margin-top: 0.5rem;">
                            대기 중인 신청: ${data.pendingRequests}건
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 연차 사용 패턴 로드
    loadLeavePatterns() {
        const leaveRequests = this.dataManager.leaveRequests;
        
        const singleDayLeaves = leaveRequests.filter(req => req.days === 1 && req.status === 'approved').length;
        const multiDayLeaves = leaveRequests.filter(req => req.days > 1 && req.status === 'approved').length;
        const pendingLeaves = leaveRequests.filter(req => req.status === 'pending').length;
        const approvedLeaves = leaveRequests.filter(req => req.status === 'approved').length;

        document.getElementById('single-day-leaves').textContent = singleDayLeaves;
        document.getElementById('multi-day-leaves').textContent = multiDayLeaves;
        document.getElementById('pending-leaves').textContent = pendingLeaves;
        document.getElementById('approved-leaves').textContent = approvedLeaves;
    }

    // 데이터 새로고침
    refresh() {
        this.loadOverviewStats();
        this.loadMonthlyChart();
        this.loadDepartmentStats();
        this.loadLeavePatterns();
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.statistics = new Statistics();
});

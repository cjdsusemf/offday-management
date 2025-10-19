// 통계 페이지 기능
class Statistics {
    constructor() {
        this.dataManager = window.dataManager;
        this.init();
    }

    init() {
        this.loadFilterOptions();
        this.loadOverviewStats();
        this.loadMonthlyChart();
        this.loadDepartmentStats();
        this.loadLeavePatterns();
        this.setupEventListeners();
    }

    // 필터 옵션 로드
    loadFilterOptions() {
        const employees = this.dataManager.employees;
        const branches = [...new Set(employees.map(emp => emp.branch).filter(Boolean))];
        const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))];

        console.log('필터 옵션 로드:', { branches, departments });

        // 지점 필터 옵션 로드
        const branchFilter = document.getElementById('branch-filter');
        if (branchFilter) {
            branchFilter.innerHTML = '<option value="all">전체 지점</option>' + 
                branches.map(branch => `<option value="${branch}">${branch}</option>`).join('');
        }

        // 부서 필터 옵션 로드
        const departmentFilter = document.getElementById('department-filter');
        if (departmentFilter) {
            departmentFilter.innerHTML = '<option value="all">전체 부서</option>' + 
                departments.map(dept => `<option value="${dept}">${dept}</option>`).join('');
        }

        // 연도 필터 기본값 설정
        const yearFilter = document.getElementById('year-filter');
        if (yearFilter && !yearFilter.value) {
            yearFilter.value = new Date().getFullYear().toString();
        }
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        const yearFilter = document.getElementById('year-filter');
        const branchFilter = document.getElementById('branch-filter');
        const departmentFilter = document.getElementById('department-filter');
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');
        const exportBtn = document.getElementById('exportCsvBtn');
        
        const onChange = () => this.loadMonthlyChart();
        if (yearFilter) yearFilter.addEventListener('change', onChange);
        if (branchFilter) branchFilter.addEventListener('change', onChange);
        if (departmentFilter) departmentFilter.addEventListener('change', onChange);
        if (startDate) startDate.addEventListener('change', onChange);
        if (endDate) endDate.addEventListener('change', onChange);
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportMonthlyCsv());
        }

        // 부서 카드 클릭 이벤트
        document.addEventListener('click', (e) => {
            const deptCard = e.target.closest('.department-card');
            if (deptCard) {
                const deptName = deptCard.querySelector('.department-name').textContent;
                this.showDepartmentDetail(deptName);
            }
        });
    }

    // 전체 통계 개요 로드
    loadOverviewStats() {
        const employees = this.dataManager.employees;
        const leaveRequests = this.dataManager.leaveRequests;

        console.log('통계 데이터 로드:', {
            employeesCount: employees.length,
            leaveRequestsCount: leaveRequests.length,
            employees: employees.map(emp => ({ name: emp.name, annualLeaveDays: emp.annualLeaveDays })),
            leaveRequests: leaveRequests.map(req => ({ employeeId: req.employeeId, days: req.days, status: req.status }))
        });

        const totalEmployees = employees.length;
        
        // 총 연차 일수 계산 (각 직원의 연차 일수 합계)
        const totalLeaveDays = employees.reduce((sum, emp) => sum + (emp.annualLeaveDays || 0), 0);
        
        // 실제 사용된 연차 일수 계산 (승인된 연차 신청의 일수 합계)
        const usedLeaveDays = leaveRequests
            .filter(request => request.status === 'approved')
            .reduce((sum, request) => sum + request.days, 0);
        
        const usageRate = totalLeaveDays > 0 ? Math.round((usedLeaveDays / totalLeaveDays) * 100) : 0;

        console.log('통계 계산 결과:', {
            totalEmployees,
            totalLeaveDays,
            usedLeaveDays,
            usageRate
        });

        // DOM 업데이트
        const totalEmployeesEl = document.getElementById('total-employees');
        const totalLeaveDaysEl = document.getElementById('total-leave-days');
        const usedLeaveDaysEl = document.getElementById('used-leave-days');
        const usageRateEl = document.getElementById('usage-rate');

        if (totalEmployeesEl) totalEmployeesEl.textContent = totalEmployees;
        if (totalLeaveDaysEl) totalLeaveDaysEl.textContent = totalLeaveDays;
        if (usedLeaveDaysEl) usedLeaveDaysEl.textContent = usedLeaveDays;
        if (usageRateEl) usageRateEl.textContent = usageRate + '%';
    }

    // 월별 차트 로드
    loadMonthlyChart() {
        const year = document.getElementById('year-filter')?.value || new Date().getFullYear().toString();
        const branch = document.getElementById('branch-filter')?.value || 'all';
        const department = document.getElementById('department-filter')?.value || 'all';
        const startDate = document.getElementById('start-date')?.value || '';
        const endDate = document.getElementById('end-date')?.value || '';
        const leaveRequests = this.dataManager.leaveRequests;
        const container = document.getElementById('monthly-chart');

        console.log('월별 차트 로드:', {
            year,
            branch,
            department,
            startDate,
            endDate,
            leaveRequestsCount: leaveRequests.length
        });

        const monthlyData = this.calculateMonthlyData(leaveRequests, year, branch, department, startDate, endDate);
        
        console.log('월별 데이터:', monthlyData);
        
        const maxVal = Math.max(1, ...monthlyData.map(d => d.days));
        
        if (container) {
            container.innerHTML = monthlyData.map((data, index) => {
                const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
                const height = Math.max((data.days / maxVal) * 200, 4);
                return `
                    <div class="month-bar" style="height: ${height}px;">
                        <div class="month-value">${data.days}일</div>
                        <div class="month-label">${monthNames[index]}</div>
                    </div>
                `;
            }).join('');
        }
    }

    // 월별 데이터 계산 (기간 필터 추가)
    calculateMonthlyData(leaveRequests, year, branch='all', department='all', startDate='', endDate='') {
        const monthlyData = Array(12).fill(0).map(() => ({ days: 0, count: 0 }));
        const employees = this.dataManager.employees || [];

        console.log('월별 데이터 계산 시작:', {
            leaveRequestsCount: leaveRequests.length,
            employeesCount: employees.length,
            year,
            branch,
            department
        });

        let processedRequests = 0;
        let approvedRequests = 0;

        leaveRequests.forEach(request => {
            processedRequests++;
            
            if (request.status !== 'approved') {
                console.log(`요청 ${processedRequests}: 승인되지 않음 - ${request.status}`);
                return;
            }
            approvedRequests++;

            const employee = employees.find(emp => emp.id === request.employeeId);
            if (!employee) {
                console.log(`요청 ${processedRequests}: 직원을 찾을 수 없음 - employeeId: ${request.employeeId}`);
                return;
            }

            if (branch !== 'all' && employee.branch !== branch) {
                console.log(`요청 ${processedRequests}: 지점 필터 불일치 - ${employee.branch} vs ${branch}`);
                return;
            }
            if (department !== 'all' && employee.department !== department) {
                console.log(`요청 ${processedRequests}: 부서 필터 불일치 - ${employee.department} vs ${department}`);
                return;
            }

            const requestDate = new Date(request.startDate);
            if (requestDate.getFullYear() != year) {
                console.log(`요청 ${processedRequests}: 연도 불일치 - ${requestDate.getFullYear()} vs ${year}`);
                return;
            }

            // 기간 필터 적용
            if (startDate && requestDate < new Date(startDate)) {
                console.log(`요청 ${processedRequests}: 시작일 필터 불일치`);
                return;
            }
            if (endDate && requestDate > new Date(endDate)) {
                console.log(`요청 ${processedRequests}: 종료일 필터 불일치`);
                return;
            }

            const month = requestDate.getMonth();
            monthlyData[month].days += request.days;
            monthlyData[month].count += 1;
            
            console.log(`요청 ${processedRequests}: 처리됨 - ${requestDate.getMonth() + 1}월, ${request.days}일`);
        });

        console.log('월별 데이터 계산 완료:', {
            processedRequests,
            approvedRequests,
            monthlyData: monthlyData.map((data, index) => ({ month: index + 1, days: data.days, count: data.count }))
        });

        return monthlyData;
    }

    // 부서별 통계 로드
    loadDepartmentStats() {
        const employees = this.dataManager.employees;
        const leaveRequests = this.dataManager.leaveRequests;
        const container = document.getElementById('department-stats');

        console.log('부서별 통계 로드:', {
            employeesCount: employees.length,
            leaveRequestsCount: leaveRequests.length
        });

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
            departmentData[employee.department].totalLeaveDays += (employee.annualLeaveDays || 0);
        });

        // 실제 연차 신청 데이터로 사용된 연차 일수 계산
        leaveRequests.forEach(request => {
            const employee = employees.find(emp => emp.id === request.employeeId);
            if (employee && departmentData[employee.department]) {
                if (request.status === 'approved') {
                    departmentData[employee.department].usedLeaveDays += request.days;
                } else if (request.status === 'pending') {
                    departmentData[employee.department].pendingRequests++;
                }
            }
        });

        console.log('부서별 데이터:', departmentData);

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

    // CSV 내보내기
    exportMonthlyCsv(){
        const year = document.getElementById('year-filter').value;
        const branch = document.getElementById('branch-filter').value;
        const department = document.getElementById('department-filter').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const monthlyData = this.calculateMonthlyData(this.dataManager.leaveRequests, year, branch, department, startDate, endDate);
        const header = ['월','연차일수','건수'];
        const rows = monthlyData.map((d, i) => [`${i+1}` , d.days, d.count]);
        const csv = [header, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `연차_월별통계_${year}_${branch}_${department}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 부서 상세 모달 표시
    showDepartmentDetail(departmentName) {
        const employees = this.dataManager.employees.filter(emp => emp.department === departmentName);
        const leaveRequests = this.dataManager.leaveRequests;
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${departmentName} 직원 상세</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="employee-detail-list">
                        ${employees.map(emp => {
                            const empRequests = leaveRequests.filter(req => req.employeeId === emp.id);
                            const pendingCount = empRequests.filter(req => req.status === 'pending').length;
                            return `
                                <div class="employee-detail-item">
                                    <div class="emp-info">
                                        <strong>${emp.name}</strong> (${emp.position})
                                        <span class="emp-branch">${emp.branch}</span>
                                    </div>
                                    <div class="emp-stats">
                                        <span>총: ${emp.annualLeaveDays}일</span>
                                        <span>사용: ${emp.usedLeaveDays}일</span>
                                        <span>잔여: ${emp.remainingLeaveDays}일</span>
                                        <span class="pending-count">대기: ${pendingCount}건</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 모달 닫기 이벤트
        modal.querySelector('.close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
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

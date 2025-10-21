// 개인 연차현황 기능
class LeaveStatus {
    constructor() {
        this.dataManager = window.dataManager;
        this.currentUser = null;
        this.init();
    }

    init() {
        this.getCurrentUser();
        this.updateCurrentYear();
        this.updateCalculationCriteria();
        this.loadPersonalLeaveStats();
        this.loadMyRequests();
        this.loadMonthlyChart();
        this.loadPlanningStats();
        this.loadUsagePattern();
        this.setupEventListeners();
    }

    // 현재 연도 표시 업데이트
    updateCurrentYear() {
        const currentYear = new Date().getFullYear();
        const yearDisplay = document.getElementById('current-year-display');
        if (yearDisplay) {
            yearDisplay.textContent = `${currentYear}년 기준`;
        }
    }

    // 계산 기준 정보 업데이트
    updateCalculationCriteria() {
        if (!this.currentUser) return;

        const employee = this.dataManager.employees.find(emp => emp.email === this.currentUser.email);
        if (!employee) return;

        // 지점의 연차 계산 기준 확인
        const branch = this.dataManager.branches.find(b => b.name === employee.branch);
        const calculationStandard = branch?.leaveCalculationStandard || 'hire_date';
        
        // 간단한 계산 기준 정보 생성
        let criteriaText = '';
        
        if (calculationStandard === 'hire_date') {
            criteriaText = '입사일 기준';
        } else if (calculationStandard === 'fiscal_year') {
            criteriaText = '회계연도 기준';
        } else {
            criteriaText = '입사일 기준';
        }
        
        // 앞에 "연차계산 : " 접두사 추가
        criteriaText = `연차계산 : ${criteriaText}`;

        // 계산 기준 정보 표시
        const criteriaElement = document.getElementById('calculation-criteria');
        if (criteriaElement) {
            criteriaElement.textContent = criteriaText;
        }

        console.log('연차 계산 기준 정보 업데이트:', {
            employee: employee.name,
            branch: employee.branch,
            calculationStandard,
            criteriaText
        });
    }

    // 현재 사용자 정보 가져오기
    getCurrentUser() {
        if (window.AuthGuard) {
            this.currentUser = window.AuthGuard.getCurrentUser();
        }
        return this.currentUser;
    }

    // 개인 연차 통계 로드
    loadPersonalLeaveStats() {
        if (!this.currentUser) return;

        const userLeaveData = this.getUserLeaveData(this.currentUser.id);
        
        // 개인 연차 현황 업데이트
        document.getElementById('earned-days').textContent = userLeaveData.earned;
        document.getElementById('used-days').textContent = userLeaveData.used;
        document.getElementById('remaining-days').textContent = userLeaveData.remaining;
        document.getElementById('pending-days').textContent = userLeaveData.pending;

        // 연차 사용률 계산 및 업데이트
        const usagePercentage = userLeaveData.earned > 0 ? 
            Math.round((userLeaveData.used / userLeaveData.earned) * 100) : 0;
        
        document.getElementById('usage-percentage').textContent = `${usagePercentage}%`;
        document.getElementById('progress-fill').style.width = `${usagePercentage}%`;
    }

    // 사용자별 연차 데이터 계산
    getUserLeaveData(userId) {
        const currentYear = new Date().getFullYear();
        
        // 사용자 정보로 직원 ID와 사용자 ID 모두 허용 (혼재된 데이터 호환)
        const employee = this.dataManager.employees.find(emp => emp.email === this.currentUser.email);
        const employeeId = employee ? employee.id : null;
        const userIdForRequests = this.currentUser.id;
        
        const userRequests = this.dataManager.leaveRequests.filter(request => {
            const belongsToUser = (request.employeeId === userIdForRequests) || (employeeId !== null && request.employeeId === employeeId);
            const sameYear = new Date(request.startDate).getFullYear() === currentYear;
            return belongsToUser && sameYear;
        });

        // 발생 연차 (지점별 계산 기준 적용)
        const earned = this.calculateEarnedDays(employeeId);
        
        // 사용한 연차 (승인된 연차)
        const used = userRequests
            .filter(request => request.status === 'approved')
            .reduce((total, request) => total + request.days, 0);
        
        // 대기 중인 연차
        const pending = userRequests
            .filter(request => request.status === 'pending')
            .reduce((total, request) => total + request.days, 0);
        
        // 남은 연차
        const remaining = earned - used - pending;

        console.log(`연차 현황 - 발생: ${earned}, 사용: ${used}, 대기: ${pending}, 남은: ${remaining}`);

        return { earned, used, pending, remaining };
    }

    // 발생 연차 계산 - 지점별 연차 계산 기준 적용
    calculateEarnedDays(userId) {
        if (window.LeaveCalculation) {
            // 새로운 연차 계산 시스템 사용
            const earnedDays = window.LeaveCalculation.calculateLeaveByBranchStandard(userId);
            return earnedDays;
        } else {
            // 기존 계산 방식 (폴백)
            console.log('LeaveCalculation이 로드되지 않음, 기존 방식 사용');
            return 15; // 기본 15일
        }
    }

    // 나의 연차 신청 목록 로드
    loadMyRequests() {
        if (!this.currentUser) return;

        // 혼재된 employeeId 값(사용자 id 또는 직원 id) 모두 수용
        const employee = this.dataManager.employees.find(emp => emp.email === this.currentUser.email);
        const employeeId = employee ? employee.id : null;
        const myRequests = this.dataManager.leaveRequests
            .filter(request => request.employeeId === this.currentUser.id || (employeeId !== null && request.employeeId === employeeId))
            .sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate))
            .slice(0, 5);

        const container = document.getElementById('my-requests');
        
        if (myRequests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-plus"></i>
                    <p>연차 신청 내역이 없습니다.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = myRequests.map(request => `
            <div class="my-request-item">
                <div class="request-period">${request.startDate} ~ ${request.endDate}</div>
                <div class="request-details">
                    <span>${request.days}일 | ${request.reason}</span>
                    <span class="request-status ${request.status}">${this.getStatusText(request.status)}</span>
                </div>
            </div>
        `).join('');
    }

    // 월별 연차 사용 차트 로드
    loadMonthlyChart() {
        if (!this.currentUser) return;

        const currentYear = new Date().getFullYear();
        const monthlyData = this.getMonthlyLeaveData(this.currentUser.id, currentYear);
        
        const container = document.getElementById('monthly-chart');
        const months = ['1월', '2월', '3월', '4월', '5월', '6월', 
                       '7월', '8월', '9월', '10월', '11월', '12월'];
        
        const maxDays = Math.max(...monthlyData, 1); // 최대값 계산 (0으로 나누기 방지)
        
        container.innerHTML = monthlyData.map((days, index) => {
            const height = (days / maxDays) * 100;
            return `
                <div class="month-bar" style="height: ${height}%" data-month="${index + 1}" data-year="${currentYear}">
                    <div class="month-value">${days}일</div>
                    <div class="month-label">${months[index]}</div>
                </div>
            `;
        }).join('');

        // 월별 차트 클릭 이벤트 추가
        container.querySelectorAll('.month-bar').forEach(bar => {
            bar.addEventListener('click', () => {
                const month = parseInt(bar.getAttribute('data-month'));
                const year = parseInt(bar.getAttribute('data-year'));
                this.showMonthlyDetail(month, year);
            });
        });
    }

    // 월별 연차 사용 데이터 계산
    getMonthlyLeaveData(userId, year) {
        const monthlyData = new Array(12).fill(0);
        
        this.dataManager.leaveRequests
            .filter(request => {
                const requestYear = new Date(request.startDate).getFullYear();
                return request.employeeId === userId && 
                       requestYear === year && 
                       request.status === 'approved';
            })
            .forEach(request => {
                const startDate = new Date(request.startDate);
                const endDate = new Date(request.endDate);
                
                // 연차 기간이 여러 월에 걸치는 경우 처리
                let currentDate = new Date(startDate);
                while (currentDate <= endDate) {
                    const month = currentDate.getMonth();
                    monthlyData[month]++;
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            });
        
        return monthlyData;
    }

    // 월별 상세 모달 표시
    showMonthlyDetail(month, year) {
        if (!this.currentUser) return;
        const employee = this.dataManager.employees.find(emp => emp.email === this.currentUser.email);
        const employeeId = employee ? employee.id : null;

        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);

        const list = (this.dataManager.leaveRequests || [])
            .filter(r => {
                const belongs = (r.employeeId === this.currentUser.id) || (employeeId !== null && r.employeeId === employeeId);
                if (!belongs) return false;
                const rs = new Date(r.startDate); const re = new Date(r.endDate);
                return rs <= end && re >= start;
            })
            .map(r => {
                const rs = new Date(r.startDate); const re = new Date(r.endDate);
                const s = rs < start ? start : rs; const e = re > end ? end : re;
                const daysInMonth = Math.floor((e - s) / (1000*60*60*24)) + 1;
                return { ...r, daysInMonth };
            })
            .sort((a,b) => new Date(a.startDate) - new Date(b.startDate));

        const body = document.getElementById('month-modal-body');
        const title = document.getElementById('month-modal-title');
        const modal = document.getElementById('month-modal');
        const closeBtn = document.getElementById('month-modal-close');

        if (!body || !title || !modal) return;

        title.textContent = `${year}년 ${month}월 상세 내역`;

        if (list.length === 0) {
            body.innerHTML = `<div class="empty-state">해당 월의 연차 내역이 없습니다.</div>`;
        } else {
            const used = list.filter(r=>r.status==='approved').reduce((s,r)=>s+(r.daysInMonth||0),0);
            const pending = list.filter(r=>r.status==='pending').reduce((s,r)=>s+(r.daysInMonth||0),0);
            const rejected = list.filter(r=>r.status==='rejected').reduce((s,r)=>s+(r.daysInMonth||0),0);
            const summary = `<div class="lm-summary">승인 ${used}일 · 대기 ${pending}일 · 거부 ${rejected}일</div>`;
            const items = list.map(r => `
                <div class="lm-item">
                    <div class="period">${r.startDate} ~ ${r.endDate}</div>
                    <div class="detail">${r.daysInMonth}일(해당월) · 총 ${r.days}일 · ${r.reason || ''} · <span class="request-status ${r.status}">${this.getStatusText(r.status)}</span></div>
                </div>
            `).join('');
            body.innerHTML = summary + `<div class="lm-list">${items}</div>`;
        }

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        if (closeBtn) closeBtn.onclick = () => this.closeMonthModal();
        window.addEventListener('keydown', this._escMonthlyHandler = (e)=>{ if(e.key==='Escape') this.closeMonthModal(); });
    }

    closeMonthModal() {
        const modal = document.getElementById('month-modal');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        if (this._escMonthlyHandler) {
            window.removeEventListener('keydown', this._escMonthlyHandler);
            this._escMonthlyHandler = null;
        }
    }

    // 연차 계획 통계 로드
    loadPlanningStats() {
        if (!this.currentUser) return;

        const userLeaveData = this.getUserLeaveData(this.currentUser.id);
        const currentMonth = new Date().getMonth();
        const monthsLeft = 12 - currentMonth;
        
        // 계획된 연차 (대기 중인 연차)
        document.getElementById('planned-days').textContent = `${userLeaveData.pending}일`;
        
        // 만료 예정 연차 (12월까지 사용하지 않으면 만료)
        const expiringDays = Math.max(0, userLeaveData.remaining);
        document.getElementById('expiring-days').textContent = `${expiringDays}일`;
        
        // 연차 사용 팁 업데이트
        this.updatePlanningTips(userLeaveData, monthsLeft);
    }

    // 연차 사용 패턴: 유형별 집계(승인된 건 기준)
    loadUsagePattern() {
        if (!this.currentUser) return;
        const user = this.currentUser;
        const employee = this.dataManager.employees.find(emp => emp.email === user.email);
        const employeeId = employee ? employee.id : null;
        const currentYear = new Date().getFullYear();

        const requests = (this.dataManager.leaveRequests || [])
            .filter(r => {
                const belongs = (r.employeeId === user.id) || (employeeId !== null && r.employeeId === employeeId);
                return belongs && r.status === 'approved' && new Date(r.startDate).getFullYear() === currentYear;
            });

        const byType = { vacation: 0, personal: 0, sick: 0, other: 0 };
        let totalDays = 0;
        requests.forEach(r => { byType[r.type] = (byType[r.type] || 0) + (r.days || 0); totalDays += (r.days || 0); });
        if (totalDays === 0) totalDays = 1; // 0 나누기 방지

        const percent = type => Math.round((byType[type] / totalDays) * 100);
        const setBar = (id, value) => { const el = document.getElementById(id); if (el) el.style.width = `${value}%`; const txt = document.getElementById(`${id}-val`); if (txt) txt.textContent = `${value}%`; };

        setBar('bar-vacation', percent('vacation'));
        setBar('bar-personal', percent('personal'));
        setBar('bar-other', percent('other'));
        // 병가는 필요 시 추가: setBar('bar-sick', percent('sick'));
    }

    // 연차 사용 팁 업데이트
    updatePlanningTips(userLeaveData, monthsLeft) {
        const tipsContainer = document.querySelector('.planning-tips ul');
        if (!tipsContainer) return;

        const avgDaysPerMonth = monthsLeft > 0 ? 
            Math.round((userLeaveData.remaining / monthsLeft) * 10) / 10 : 0;

        tipsContainer.innerHTML = `
            <li>연말까지 <strong>${userLeaveData.remaining}일</strong>의 연차가 남아있습니다</li>
            <li>월 평균 <strong>${avgDaysPerMonth}일</strong>씩 사용하시면 됩니다</li>
            <li>연차는 <strong>12월 31일</strong>까지 사용하셔야 합니다</li>
        `;
    }

    // 이번 달 통계 로드
    loadMonthlyStatistics() {
        const monthlyStats = this.dataManager.getMonthlyStatistics();
        
        document.getElementById('used-this-month').textContent = `${monthlyStats.usedThisMonth}일`;
        document.getElementById('scheduled-this-month').textContent = `${monthlyStats.scheduledThisMonth}일`;
        document.getElementById('pending-this-month').textContent = `${monthlyStats.pendingThisMonth}일`;
    }

    // 상태 텍스트 변환
    getStatusText(status) {
        const statusMap = {
            'pending': '대기중',
            'approved': '승인됨',
            'rejected': '거부됨'
        };
        return statusMap[status] || status;
    }

    // 연차 유형 텍스트 변환
    getLeaveTypeText(leaveType) {
        const typeMap = {
            'vacation': '휴가',
            'personal': '개인사정',
            'sick': '병가',
            'other': '기타'
        };
        return typeMap[leaveType] || leaveType;
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 탭 네비게이션 이벤트
        this.setupTabNavigation();
        
        // 연도 선택기 이벤트
        const yearSelector = document.getElementById('year-selector');
        if (yearSelector) {
            yearSelector.addEventListener('change', (e) => {
                this.loadMonthlyChartForYear(parseInt(e.target.value));
            });
        }

        // 모달 외부 클릭 시 닫기
        const pendingModal = document.getElementById('pending-modal');
        if (pendingModal) {
            pendingModal.addEventListener('click', (e) => {
                if (e.target.id === 'pending-modal') {
                    this.closeModal();
                }
            });
        }

        // 월별 상세 모달 외부 클릭 시 닫기
        const monthlyDetailModal = document.getElementById('monthly-detail-modal');
        if (monthlyDetailModal) {
            monthlyDetailModal.addEventListener('click', (e) => {
                if (e.target.id === 'monthly-detail-modal') {
                    this.closeMonthlyDetailModal();
                }
            });
        }

        // 연차 신청 폼 이벤트
        this.setupRequestFormEvents();

        // DataManager 데이터가 바뀌면 현황을 즉시 갱신
        if (typeof window !== 'undefined') {
            window.addEventListener('dm:updated', (e) => {
                if (!this.currentUser) this.getCurrentUser();
                this.updateCalculationCriteria();
                this.loadPersonalLeaveStats();
                this.loadMyRequests();
                this.loadMonthlyChart();
            });
        }
    }

    // 탭 네비게이션 설정
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // 모든 탭 버튼에서 active 클래스 제거
                tabButtons.forEach(btn => btn.classList.remove('active'));
                // 클릭된 버튼에 active 클래스 추가
                button.classList.add('active');
                
                // 모든 탭 콘텐츠에서 active 클래스 제거
                tabContents.forEach(content => content.classList.remove('active'));
                // 해당 탭 콘텐츠에 active 클래스 추가
                const targetContent = document.getElementById(`${targetTab}-tab`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }

    // 연차 신청 폼 이벤트 설정
    setupRequestFormEvents() {
        const form = document.getElementById('leave-request-form');
        if (!form) return;

        // 폼 제출 이벤트
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitLeaveRequest();
        });

        // 날짜 변경 시 일수 자동 계산
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        const totalDaysInput = document.getElementById('total-days');
        const leaveTypeSelect = document.getElementById('leave-type');
        const reasonTextarea = document.getElementById('reason');
        const reasonGroup = reasonTextarea ? reasonTextarea.closest('.form-group') : null;

        if (startDateInput && endDateInput && totalDaysInput) {
            const calculateDays = () => {
                const startDate = new Date(startDateInput.value);
                const endDate = new Date(endDateInput.value);
                
                if (startDate && endDate && startDate <= endDate) {
                    const timeDiff = endDate.getTime() - startDate.getTime();
                    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
                    totalDaysInput.value = daysDiff;
                } else {
                    totalDaysInput.value = '';
                }
            };

            startDateInput.addEventListener('change', calculateDays);
            endDateInput.addEventListener('change', calculateDays);
        }

        // 오늘 날짜를 기본값으로 설정
        const today = new Date().toISOString().split('T')[0];
        if (startDateInput) {
            startDateInput.min = today;
        }
        if (endDateInput) {
            endDateInput.min = today;
        }

        // 연차 유형이 '기타'일 때만 사유 입력 가능(사유 입력창 표시/숨김)
        const toggleReason = () => {
            if (!leaveTypeSelect || !reasonTextarea || !reasonGroup) return;
            const isOther = leaveTypeSelect.value === 'other';
            reasonGroup.style.display = isOther ? '' : 'none';
            reasonTextarea.disabled = !isOther;
            reasonTextarea.required = isOther;
            if (!isOther) {
                // 기타가 아닌 경우 해당 유형을 사유에 자동 입력
                const typeMap = {
                    'vacation': '휴가',
                    'personal': '개인사정', 
                    'sick': '병가'
                };
                reasonTextarea.value = typeMap[leaveTypeSelect.value] || '';
            }
        };
        if (leaveTypeSelect && reasonTextarea && reasonGroup) {
            toggleReason();
            leaveTypeSelect.addEventListener('change', toggleReason);
        }
    }

    // 특정 연도의 월별 차트 로드
    loadMonthlyChartForYear(year) {
        if (!this.currentUser) return;

        const monthlyData = this.getMonthlyLeaveData(this.currentUser.id, year);
        
        const container = document.getElementById('monthly-chart');
        const months = ['1월', '2월', '3월', '4월', '5월', '6월', 
                       '7월', '8월', '9월', '10월', '11월', '12월'];
        
        const maxDays = Math.max(...monthlyData, 1);
        
        container.innerHTML = monthlyData.map((days, index) => {
            const height = (days / maxDays) * 100;
            return `
                <div class="month-bar" style="height: ${height}%" data-month="${index + 1}" data-year="${year}">
                    <div class="month-value">${days}일</div>
                    <div class="month-label">${months[index]}</div>
                </div>
            `;
        }).join('');

        // 클릭 이벤트 다시 바인딩
        container.querySelectorAll('.month-bar').forEach(bar => {
            bar.addEventListener('click', () => {
                const month = parseInt(bar.getAttribute('data-month'));
                const yr = parseInt(bar.getAttribute('data-year')) || year;
                this.showMonthlyDetail(month, yr);
            });
        });
    }

    // 승인 대기 목록 표시
    showPendingRequests() {
        const pendingRequests = this.dataManager.getPendingRequests();
        const container = document.getElementById('pending-list');
        
        if (pendingRequests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <p>승인 대기 중인 연차 신청이 없습니다.</p>
                </div>
            `;
        } else {
            container.innerHTML = pendingRequests.map(request => `
                <div class="pending-item">
                    <div class="pending-item-header">
                        <div class="employee-name">${request.employeeName}</div>
                        <div class="request-date">신청일: ${request.requestDate}</div>
                    </div>
                    <div class="pending-item-details">
                        <div>
                            <strong>기간:</strong> ${request.startDate} ~ ${request.endDate}
                        </div>
                        <div>
                            <strong>일수:</strong> ${request.days}일
                        </div>
                        <div>
                            <strong>사유:</strong> ${request.reason}
                        </div>
                        <div>
                            <strong>부서:</strong> ${this.getEmployeeDepartment(request.employeeId)}
                        </div>
                    </div>
                    <div class="pending-item-actions">
                        <button class="btn-approve" onclick="dashboard.approveRequest(${request.id})">
                            <i class="fas fa-check"></i> 승인
                        </button>
                        <button class="btn-reject" onclick="dashboard.rejectRequest(${request.id})">
                            <i class="fas fa-times"></i> 거부
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        document.getElementById('pending-modal').style.display = 'block';
    }

    // 직원 부서 정보 가져오기
    getEmployeeDepartment(employeeId) {
        const employee = this.dataManager.employees.find(emp => emp.id === employeeId);
        return employee ? employee.department : '알 수 없음';
    }

    // 연차 신청 승인
    approveRequest(requestId) {
        if (confirm('이 연차 신청을 승인하시겠습니까?')) {
            this.dataManager.updateLeaveRequestStatus(requestId, 'approved');
            this.refreshDashboard();
            this.showPendingRequests(); // 목록 새로고침
            this.showNotification('연차 신청이 승인되었습니다.', 'success');
        }
    }

    // 연차 신청 거부
    rejectRequest(requestId) {
        if (confirm('이 연차 신청을 거부하시겠습니까?')) {
            this.dataManager.updateLeaveRequestStatus(requestId, 'rejected');
            this.refreshDashboard();
            this.showPendingRequests(); // 목록 새로고침
            this.showNotification('연차 신청이 거부되었습니다.', 'error');
        }
    }

    // 대시보드 새로고침
    refreshDashboard() {
        this.loadStatistics();
        this.loadRecentRequests();
        this.loadMonthlyStatistics();
    }

    // 모달 닫기
    closeModal() {
        document.getElementById('pending-modal').style.display = 'none';
    }

    // 데이터 내보내기
    exportData() {
        this.dataManager.exportData();
        this.showNotification('데이터가 성공적으로 내보내졌습니다.', 'success');
    }

    // 연차 신청 섹션으로 스크롤
    scrollToRequestForm() {
        const section = document.querySelector('.leave-request-section');
        if (!section) return;

        section.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        // 섹션에 포커스 효과 추가
        section.style.transform = 'scale(1.02)';
        setTimeout(() => {
            section.style.transform = 'scale(1)';
        }, 300);
    }

    // 연차 활동 섹션으로 스크롤 (탭 포함)
    scrollToActivitySection() {
        const section = document.querySelector('.leave-activity-section');
        if (!section) return;

        section.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        // 섹션에 포커스 효과 추가
        section.style.transform = 'scale(1.02)';
        setTimeout(() => {
            section.style.transform = 'scale(1)';
        }, 300);
    }

    // 월별 상세 모달 표시
    showMonthlyDetail(month, year) {
        if (!this.currentUser) return;

        const modal = document.getElementById('monthly-detail-modal');
        const title = document.getElementById('monthly-detail-title');
        const totalDaysEl = document.getElementById('monthly-total-days');
        const requestCountEl = document.getElementById('monthly-request-count');
        const requestsList = document.getElementById('monthly-requests-list');

        // 해당 월의 연차 신청 내역 가져오기
        const monthlyRequests = this.getMonthlyRequests(month, year);
        const totalDays = monthlyRequests.reduce((sum, request) => sum + request.days, 0);

        // 모달 제목 설정
        title.textContent = `${year}년 ${month}월 연차 사용 내역`;

        // 요약 정보 설정
        totalDaysEl.textContent = `${totalDays}일`;
        requestCountEl.textContent = `${monthlyRequests.length}건`;

        // 연차 신청 내역 표시
        if (monthlyRequests.length === 0) {
            requestsList.innerHTML = `
                <div class="no-requests">
                    <i class="fas fa-calendar-times"></i>
                    <p>${month}월에는 연차를 사용하지 않았습니다.</p>
                </div>
            `;
        } else {
            requestsList.innerHTML = monthlyRequests.map(request => {
                const startDate = new Date(request.startDate);
                const endDate = new Date(request.endDate);
                const period = startDate.toLocaleDateString() + (startDate.getTime() !== endDate.getTime() ? ` ~ ${endDate.toLocaleDateString()}` : '');
                
                return `
                    <div class="monthly-request-item">
                        <div class="monthly-request-header">
                            <div class="monthly-request-period">${period}</div>
                            <div class="monthly-request-status ${request.status}">${this.getStatusText(request.status)}</div>
                        </div>
                        <div class="monthly-request-details">
                            <div class="monthly-request-type">${this.getLeaveTypeText(request.leaveType)}</div>
                            <div class="monthly-request-days">${request.days}일</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 모달 표시
        modal.style.display = 'block';
    }

    // 해당 월의 연차 신청 내역 가져오기
    getMonthlyRequests(month, year) {
        return this.dataManager.leaveRequests.filter(request => {
            const employee = this.dataManager.employees.find(emp => emp.email === this.currentUser.email);
            const employeeId = employee ? employee.id : null;
            if (!(request.employeeId === this.currentUser.id || (employeeId !== null && request.employeeId === employeeId))) return false;
            
            const requestDate = new Date(request.startDate);
            return requestDate.getMonth() + 1 === month && requestDate.getFullYear() === year;
        });
    }

    // 월별 상세 모달 닫기
    closeMonthlyDetailModal() {
        const modal = document.getElementById('monthly-detail-modal');
        modal.style.display = 'none';
    }

    // 연차 신청 제출
    submitLeaveRequest() {
        if (!this.currentUser) {
            this.showNotification('로그인이 필요합니다.', 'error');
            return;
        }

        const form = document.getElementById('leave-request-form');
        const formData = new FormData(form);
        
        // 폼 데이터 검증
        const startDate = formData.get('startDate');
        const endDate = formData.get('endDate');
        const leaveType = formData.get('leaveType');
        const reason = formData.get('reason');
        const totalDays = parseInt(formData.get('totalDays'));

        if (!startDate || !endDate || !leaveType || !reason || !totalDays) {
            this.showNotification('모든 필드를 입력해주세요.', 'error');
            return;
        }

        // 날짜 유효성 검사
        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (start < today) {
            this.showNotification('시작일은 오늘 이후여야 합니다.', 'error');
            return;
        }

        if (end < start) {
            this.showNotification('종료일은 시작일 이후여야 합니다.', 'error');
            return;
        }

        // 연차 일수 제한 검사
        const userLeaveData = this.getUserLeaveData(this.currentUser.id);
        if (totalDays > userLeaveData.remaining) {
            this.showNotification(`남은 연차(${userLeaveData.remaining}일)보다 많은 일수를 신청할 수 없습니다.`, 'error');
            return;
        }

        // 연차 신청 데이터 생성
        const leaveRequest = {
            id: Date.now(), // 임시 ID
            employeeId: this.currentUser.id,
            employeeName: this.currentUser.name,
            startDate: startDate,
            endDate: endDate,
            days: totalDays,
            leaveType: leaveType,
            reason: reason,
            status: 'pending',
            requestDate: new Date().toISOString().split('T')[0],
            department: this.getEmployeeDepartment(this.currentUser.id)
        };

        // 데이터 매니저에 연차 신청 추가
        this.dataManager.addLeaveRequest(leaveRequest);

        // 폼 초기화
        form.reset();

        // 대시보드 새로고침
        this.refreshDashboard();

        // 성공 알림
        this.showNotification('연차 신청이 완료되었습니다.', 'success');
    }

    // 대시보드 새로고침
    refreshDashboard() {
        this.loadPersonalLeaveStats();
        this.loadMyRequests();
        this.loadMonthlyChart();
        this.loadPlanningStats();
    }

    // 알림 표시
    showNotification(message, type = 'info') {
        // 간단한 알림 구현
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 2rem;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// 전역 함수들
function showPendingRequests() {
    if (window.leaveStatus) {
        window.leaveStatus.showPendingRequests();
    }
}

function closeModal() {
    if (window.leaveStatus) {
        window.leaveStatus.closeModal();
    }
}

function exportData() {
    if (window.leaveStatus) {
        window.leaveStatus.exportData();
    }
}

function scrollToRequestForm() {
    if (window.leaveStatus) {
        window.leaveStatus.scrollToRequestForm();
    }
}

function scrollToActivitySection() {
    if (window.leaveStatus) {
        window.leaveStatus.scrollToActivitySection();
    }
}

function closeMonthlyDetailModal() {
    if (window.leaveStatus) {
        window.leaveStatus.closeMonthlyDetailModal();
    }
}

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// LeaveStatus 인스턴스 생성 (한 번만)
window.addEventListener('DOMContentLoaded', () => {
    window.leaveStatus = new LeaveStatus();
});

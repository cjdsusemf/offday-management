// 캘린더 기능 - DataManager 연동 버전
class Calendar {
    constructor() {
        this.currentDate = new Date();
        this.dataManager = window.dataManager;
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
        this.selectedBranch = '';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderCalendar();
        this.loadLeaveData();
    }

    setupEventListeners() {
        // 이전/다음 달 버튼
        document.getElementById('prev-month').addEventListener('click', () => {
            this.currentMonth--;
            if (this.currentMonth < 0) {
                this.currentMonth = 11;
                this.currentYear--;
            }
            this.renderCalendar();
            this.loadLeaveData();
        });

        document.getElementById('next-month').addEventListener('click', () => {
            this.currentMonth++;
            if (this.currentMonth > 11) {
                this.currentMonth = 0;
                this.currentYear++;
            }
            this.renderCalendar();
            this.loadLeaveData();
        });

        // 지점 필터
        document.getElementById('branch-filter').addEventListener('change', (e) => {
            this.selectedBranch = e.target.value;
            this.loadLeaveData();
        });
    }

    renderCalendar() {
        const monthNames = [
            '1월', '2월', '3월', '4월', '5월', '6월',
            '7월', '8월', '9월', '10월', '11월', '12월'
        ];

        // 현재 월 표시
        document.getElementById('current-month').textContent = 
            `${this.currentYear}년 ${monthNames[this.currentMonth]}`;

        // 캘린더 그리드 생성
        const calendarGrid = document.getElementById('calendar-grid');
        calendarGrid.innerHTML = '';

        // 이번 달 첫째 날과 마지막 날
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const firstDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        // 이전 달의 마지막 날들
        const prevMonth = new Date(this.currentYear, this.currentMonth, 0);
        const daysInPrevMonth = prevMonth.getDate();

        // 캘린더 날짜 생성
        for (let i = 0; i < 42; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';

            let dayNumber, isCurrentMonth, date;

            if (i < firstDayOfWeek) {
                // 이전 달
                dayNumber = daysInPrevMonth - firstDayOfWeek + i + 1;
                dayElement.classList.add('other-month');
                isCurrentMonth = false;
                date = new Date(this.currentYear, this.currentMonth - 1, dayNumber);
            } else if (i < firstDayOfWeek + daysInMonth) {
                // 이번 달
                dayNumber = i - firstDayOfWeek + 1;
                isCurrentMonth = true;
                date = new Date(this.currentYear, this.currentMonth, dayNumber);
            } else {
                // 다음 달
                dayNumber = i - firstDayOfWeek - daysInMonth + 1;
                dayElement.classList.add('other-month');
                isCurrentMonth = false;
                date = new Date(this.currentYear, this.currentMonth + 1, dayNumber);
            }

            // 오늘 날짜 표시
            const today = new Date();
            if (isCurrentMonth && 
                date.getDate() === today.getDate() && 
                date.getMonth() === today.getMonth() && 
                date.getFullYear() === today.getFullYear()) {
                dayElement.classList.add('today');
            }

            dayElement.innerHTML = `
                <div class="day-number">${dayNumber}</div>
                <div class="leave-indicator" id="leave-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}"></div>
            `;

            // 날짜 클릭 이벤트
            dayElement.addEventListener('click', () => {
                this.showLeaveDetails(date);
            });

            calendarGrid.appendChild(dayElement);
        }
    }

    loadLeaveData() {
        // DataManager에서 실제 연차 데이터 가져오기
        const leaveRequests = this.dataManager.leaveRequests || [];
        const employees = this.dataManager.employees || [];
        
        // 각 날짜에 연차 정보 표시
        leaveRequests.forEach(request => {
            const startDate = new Date(request.startDate);
            const endDate = new Date(request.endDate);
            const employee = employees.find(emp => emp.id === request.employeeId);
            
            if (!employee) return;
            
            // 해당 연차가 현재 표시 중인 월에 포함되는지 확인
            if (this.isDateInCurrentMonth(startDate) || this.isDateInCurrentMonth(endDate)) {
                // 연차 기간의 모든 날짜에 표시
                const currentDate = new Date(startDate);
                while (currentDate <= endDate) {
                    const dateStr = this.formatDate(currentDate);
                    const indicator = document.getElementById(`leave-${dateStr}`);
                    
                    if (indicator && this.shouldShowLeave(request, employee)) {
                        const leaveItem = document.createElement('div');
                        leaveItem.className = `leave-item ${request.status}`;
                        leaveItem.textContent = employee.name;
                        leaveItem.title = `${employee.name} - ${request.reason || '연차'}`;
                        
                        leaveItem.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.showLeaveDetailModal(request, employee);
                        });
                        
                        indicator.appendChild(leaveItem);
                        
                        // 해당 날짜에 연차가 있음을 표시
                        const dayElement = indicator.closest('.calendar-day');
                        if (request.status === 'approved') {
                            dayElement.classList.add('has-leave');
                        } else if (request.status === 'pending') {
                            dayElement.classList.add('has-pending');
                        }
                    }
                    
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }
        });
    }

    isDateInCurrentMonth(date) {
        return date.getMonth() === this.currentMonth && date.getFullYear() === this.currentYear;
    }

    shouldShowLeave(request, employee) {
        // 지점 필터 적용
        if (this.selectedBranch && employee.branch !== this.selectedBranch) {
            return false;
        }
        return true;
    }

    showLeaveDetails(date) {
        const dateStr = this.formatDate(date);
        const leaveRequests = this.dataManager.leaveRequests || [];
        const employees = this.dataManager.employees || [];
        
        const dayLeaves = leaveRequests.filter(request => {
            const startDate = new Date(request.startDate);
            const endDate = new Date(request.endDate);
            const targetDate = new Date(dateStr);
            
            const employee = employees.find(emp => emp.id === request.employeeId);
            if (!employee) return false;
            
            return targetDate >= startDate && targetDate <= endDate && this.shouldShowLeave(request, employee);
        });

        if (dayLeaves.length > 0) {
            this.showDayLeaveModal(dateStr, dayLeaves, employees);
        }
    }

    showDayLeaveModal(dateStr, dayLeaves, employees) {
        const modal = document.getElementById('leave-detail-modal');
        const content = document.getElementById('leave-detail-content');
        
        content.innerHTML = `
            <h4>${dateStr} 연차 신청자</h4>
            <div class="day-leaves-list">
                ${dayLeaves.map(request => {
                    const employee = employees.find(emp => emp.id === request.employeeId);
                    return `
                        <div class="leave-detail-item ${request.status}">
                            <div class="leave-detail-info">
                                <div class="leave-detail-name">${employee.name}</div>
                                <div class="leave-detail-dates">${request.startDate} ~ ${request.endDate} (${request.days}일)</div>
                                <div class="leave-detail-dates">${employee.branch} | ${request.reason || '연차'}</div>
                            </div>
                            <div class="leave-detail-status ${request.status}">
                                ${request.status === 'approved' ? '승인됨' : request.status === 'pending' ? '대기중' : '거부됨'}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        modal.style.display = 'block';
    }

    showLeaveDetailModal(request, employee) {
        const modal = document.getElementById('leave-detail-modal');
        const content = document.getElementById('leave-detail-content');
        
        content.innerHTML = `
            <h4>연차 상세 정보</h4>
            <div class="leave-detail-item ${request.status}">
                <div class="leave-detail-info">
                    <div class="leave-detail-name">${employee.name}</div>
                    <div class="leave-detail-dates">${request.startDate} ~ ${request.endDate} (${request.days}일)</div>
                    <div class="leave-detail-dates">${employee.branch} | ${employee.department} | ${employee.position}</div>
                    <div class="leave-detail-dates">사유: ${request.reason || '연차'}</div>
                    <div class="leave-detail-dates">신청일: ${request.requestDate || '-'}</div>
                </div>
                <div class="leave-detail-status ${request.status}">
                    ${request.status === 'approved' ? '승인됨' : request.status === 'pending' ? '대기중' : '거부됨'}
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    }

    formatDate(date) {
        if (typeof date === 'string') {
            return date;
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

// 모달 닫기 함수
function closeLeaveDetailModal() {
    document.getElementById('leave-detail-modal').style.display = 'none';
}

// 모달 외부 클릭 시 닫기
window.addEventListener('click', (e) => {
    const modal = document.getElementById('leave-detail-modal');
    if (e.target === modal) {
        closeLeaveDetailModal();
    }
});

// Calendar 인스턴스 생성
window.addEventListener('DOMContentLoaded', () => {
    if (window.dataManager) {
        window.calendar = new Calendar();
    } else {
        // DataManager가 로드될 때까지 대기
        const checkDataManager = setInterval(() => {
            if (window.dataManager) {
                window.calendar = new Calendar();
                clearInterval(checkDataManager);
            }
        }, 100);
    }
});

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

        // 연차 신청 버튼
        document.getElementById('leave-request-btn').addEventListener('click', () => {
            this.showLeaveRequestModal();
        });

        // 연차 신청 폼 이벤트
        this.setupLeaveRequestForm();

        // 날짜 선택 모달 이벤트
        this.setupDatePickerModal();

        // 현재 월/년도 클릭 이벤트
        document.getElementById('current-month').addEventListener('click', () => {
            this.showDatePickerModal();
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

            // 날짜 클릭 이벤트 (연차 신청)
            if (isCurrentMonth) {
                dayElement.classList.add('clickable');
                dayElement.addEventListener('click', () => {
                    this.showLeaveRequestModal(date);
                });
            } else {
                // 다른 달 날짜는 기존 상세 보기
                dayElement.addEventListener('click', () => {
                    this.showLeaveDetails(date);
                });
            }

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
        } else {
            this.showLeaveRequestModal(dateStr);
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
    // 연차 신청 팝업 표시
    showLeaveRequestModal(dateStr) {
        const modal = document.getElementById('leave-request-modal');
        const dateInput = document.getElementById('quick-date');
        const form = document.getElementById('quick-leave-form');
        
        dateInput.value = dateStr;
        document.getElementById('quick-type').value = '연차';
        document.getElementById('quick-reason').value = '';
        
        form.onsubmit = (e) => {
            e.preventDefault();
            this.submitQuickLeaveRequest(dateStr);
        };
        
        modal.style.display = 'block';
    }
        // 연차 신청 처리
        submitQuickLeaveRequest(dateStr) {
            const type = document.getElementById('quick-type').value;
            const reason = document.getElementById('quick-reason').value;
            const currentUser = window.AuthGuard.getCurrentUser();
            
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return;
            }
            
            const days = type.includes('반차') ? 0.5 : 1;
            
            const newRequest = {
                id: Date.now().toString(),
                employeeId: currentUser.id,
                startDate: dateStr,
                endDate: dateStr,
                days: days,
                reason: reason,
                type: type,
                status: 'pending',
                requestDate: new Date().toISOString().split('T')[0]
            };
            
            this.dataManager.leaveRequests.push(newRequest);
            this.dataManager.saveData();
            
            closeLeaveRequestModal();
            
            this.renderCalendar();
            this.loadLeaveData();
            
            alert(`${dateStr} 연차 신청이 완료되었습니다!\n승인 대기 중입니다.`);
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

    // 연차 신청 모달 표시
    showLeaveRequestModal(selectedDate = null) {
        const modal = document.getElementById('leave-request-modal');
        const title = document.getElementById('modal-title');
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');

        // 모달 제목 설정
        if (selectedDate) {
            const dateStr = selectedDate.toLocaleDateString('ko-KR');
            title.textContent = `${dateStr} 연차 신청`;
            // 선택된 날짜로 시작일 설정
            startDateInput.value = selectedDate.toISOString().split('T')[0];
            endDateInput.value = selectedDate.toISOString().split('T')[0];
        } else {
            title.textContent = '연차 신청';
            // 오늘 날짜로 기본 설정
            const today = new Date().toISOString().split('T')[0];
            startDateInput.value = today;
            endDateInput.value = today;
        }

        // 모달 표시
        modal.style.display = 'block';
        
        // 모달이 열린 후 총 일수 계산
        setTimeout(() => {
            const startDateInput = document.getElementById('start-date');
            const endDateInput = document.getElementById('end-date');
            const totalDaysInput = document.getElementById('total-days');
            
            if (startDateInput.value && endDateInput.value) {
                const startDate = new Date(startDateInput.value);
                const endDate = new Date(endDateInput.value);
                const timeDiff = endDate.getTime() - startDate.getTime();
                const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
                totalDaysInput.value = daysDiff;
            }
        }, 100);
    }

    // 연차 신청 모달 닫기
    closeLeaveRequestModal() {
        const modal = document.getElementById('leave-request-modal');
        modal.style.display = 'none';
        
        // 폼 초기화
        document.getElementById('leave-request-form').reset();
    }

    // 연차 신청 폼 이벤트 설정
    setupLeaveRequestForm() {
        const form = document.getElementById('leave-request-form');
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        const totalDaysInput = document.getElementById('total-days');

        // 날짜 변경 시 총 일수 계산
        const calculateDays = () => {
            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);
            
            if (startDateInput.value && endDateInput.value) {
                if (startDate <= endDate) {
                    const timeDiff = endDate.getTime() - startDate.getTime();
                    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
                    totalDaysInput.value = daysDiff;
                } else {
                    totalDaysInput.value = '';
                }
            } else {
                totalDaysInput.value = '';
            }
        };

        startDateInput.addEventListener('change', calculateDays);
        endDateInput.addEventListener('change', calculateDays);
        
        // 모달이 열릴 때 초기 계산
        const modal = document.getElementById('leave-request-modal');
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    if (modal.style.display === 'block') {
                        // 모달이 열릴 때 총 일수 계산
                        setTimeout(calculateDays, 100);
                    }
                }
            });
        });
        observer.observe(modal, { attributes: true });

        // 폼 제출
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitLeaveRequest();
        });

        // 모달 외부 클릭 시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'leave-request-modal') {
                this.closeLeaveRequestModal();
            }
        });
    }

    // 연차 신청 제출
    submitLeaveRequest() {
        if (!this.dataManager || !this.dataManager.currentUser) {
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

        // 연차 신청 데이터 생성
        const leaveRequest = {
            id: Date.now(),
            employeeId: this.dataManager.currentUser.id,
            employeeName: this.dataManager.currentUser.name,
            startDate: startDate,
            endDate: endDate,
            days: totalDays,
            leaveType: leaveType,
            reason: reason,
            status: 'pending',
            requestDate: new Date().toISOString().split('T')[0],
            department: this.dataManager.getEmployeeDepartment(this.dataManager.currentUser.id)
        };

        // 데이터 매니저에 연차 신청 추가
        this.dataManager.addLeaveRequest(leaveRequest);

        // 폼 초기화 및 모달 닫기
        form.reset();
        this.closeLeaveRequestModal();

        // 캘린더 새로고침
        this.loadLeaveData();

        // 성공 알림
        this.showNotification('연차 신청이 완료되었습니다.', 'success');
    }

    // 알림 표시
    showNotification(message, type = 'info') {
        // 간단한 알림 구현
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;

        if (type === 'success') {
            notification.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
        } else if (type === 'error') {
            notification.style.background = 'linear-gradient(135deg, #dc3545, #c82333)';
        } else {
            notification.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // 날짜 선택 모달 설정
    setupDatePickerModal() {
        this.selectedYear = this.currentYear;
        this.selectedMonth = this.currentMonth;
        this.currentYearRange = Math.floor(this.currentYear / 10) * 10; // 10년 단위로 반올림
        this.generateYearButtons();
        this.setupDatePickerEvents();
    }

    // 연도 버튼 생성
    generateYearButtons() {
        const yearGrid = document.getElementById('year-grid');
        const yearRangeDisplay = document.getElementById('year-range-display');
        
        // 연도 범위 표시 업데이트
        const startYear = this.currentYearRange;
        const endYear = this.currentYearRange + 9;
        yearRangeDisplay.textContent = `${startYear} - ${endYear}`;
        
        yearGrid.innerHTML = '';
        
        // 현재 범위의 10개 연도 생성
        for (let year = startYear; year <= endYear; year++) {
            const yearBtn = document.createElement('button');
            yearBtn.className = 'year-btn';
            yearBtn.textContent = year;
            yearBtn.dataset.year = year;
            
            if (year === this.selectedYear) {
                yearBtn.classList.add('selected');
            }
            
            yearGrid.appendChild(yearBtn);
        }
    }

    // 날짜 선택 모달 이벤트 설정
    setupDatePickerEvents() {
        // 연도 버튼 클릭 이벤트
        document.getElementById('year-grid').addEventListener('click', (e) => {
            if (e.target.classList.contains('year-btn')) {
                // 모든 연도 버튼에서 selected 클래스 제거
                document.querySelectorAll('.year-btn').forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                // 클릭된 버튼에 selected 클래스 추가
                e.target.classList.add('selected');
                this.selectedYear = parseInt(e.target.dataset.year);
            }
        });

        // 월 버튼 클릭 이벤트
        document.getElementById('month-grid').addEventListener('click', (e) => {
            if (e.target.classList.contains('month-btn')) {
                // 모든 월 버튼에서 selected 클래스 제거
                document.querySelectorAll('.month-btn').forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                // 클릭된 버튼에 selected 클래스 추가
                e.target.classList.add('selected');
                this.selectedMonth = parseInt(e.target.dataset.month);
            }
        });

        // 연도 범위 네비게이션 이벤트
        document.getElementById('prev-year-range').addEventListener('click', () => {
            this.currentYearRange -= 10;
            this.generateYearButtons();
        });

        document.getElementById('next-year-range').addEventListener('click', () => {
            this.currentYearRange += 10;
            this.generateYearButtons();
        });

        // 모달 외부 클릭 시 닫기
        const modal = document.getElementById('date-picker-modal');
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'date-picker-modal') {
                this.closeDatePickerModal();
            }
        });
    }

    // 날짜 선택 모달 표시
    showDatePickerModal() {
        const modal = document.getElementById('date-picker-modal');
        
        // 현재 선택된 연도와 월로 초기화
        this.selectedYear = this.currentYear;
        this.selectedMonth = this.currentMonth;
        this.currentYearRange = Math.floor(this.currentYear / 10) * 10; // 현재 연도가 포함된 10년 범위로 설정
        
        // 연도 버튼 재생성
        this.generateYearButtons();
        
        // 월 버튼 선택 상태 초기화
        document.querySelectorAll('.month-btn').forEach(btn => {
            btn.classList.remove('selected');
            if (parseInt(btn.dataset.month) === this.selectedMonth) {
                btn.classList.add('selected');
            }
        });
        
        modal.style.display = 'block';
    }

    // 날짜 선택 모달 닫기
    closeDatePickerModal() {
        const modal = document.getElementById('date-picker-modal');
        modal.style.display = 'none';
    }

    // 날짜 선택 적용
    applyDateSelection() {
        this.currentYear = this.selectedYear;
        this.currentMonth = this.selectedMonth;
        
        this.renderCalendar();
        this.loadLeaveData();
        this.closeDatePickerModal();
    }
}

// 글로벌 함수들
function closeLeaveDetailModal() {
    const modal = document.getElementById('leave-detail-modal');
    modal.style.display = 'none';
}

function closeLeaveRequestModal() {
    if (window.calendar) {
        window.calendar.closeLeaveRequestModal();
    }
}

function closeDatePickerModal() {
    if (window.calendar) {
        window.calendar.closeDatePickerModal();
    }
}

function applyDateSelection() {
    if (window.calendar) {
        window.calendar.applyDateSelection();
    }
}

// 모달 외부 클릭 시 닫기
document.addEventListener('click', (e) => {
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
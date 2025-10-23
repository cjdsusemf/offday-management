class LeaveRequest {
    constructor() {
        this.dataManager = window.dataManager;
        this.initializeForm();
        this.loadEmployees();
        this.loadRecentRequests();
    }

    initializeForm() {
        const form = document.getElementById('leave-request-form');
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        const leaveTypeSelect = document.getElementById('leave-type');
        const daysInput = document.getElementById('days');

        // 날짜 변경 시 일수 자동 계산
        const calculateDays = () => {
            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);
            const leaveType = leaveTypeSelect.value;

            if (startDate && endDate) {
                if (leaveType === 'half') {
                    daysInput.value = 0.5;
                    // 반차일 때는 시작일과 종료일을 같게 설정
                    endDateInput.value = startDateInput.value;
                } else {
                    const timeDiff = endDate.getTime() - startDate.getTime();
                    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
                    daysInput.value = daysDiff;
                }
            }
        };

        startDateInput.addEventListener('change', calculateDays);
        endDateInput.addEventListener('change', calculateDays);
        leaveTypeSelect.addEventListener('change', () => {
            if (leaveTypeSelect.value === 'half') {
                // 반차 선택 시 종료일 필드 비활성화
                endDateInput.disabled = true;
                endDateInput.style.background = '#f8f9fa';
                endDateInput.style.color = '#6c757d';
            } else {
                // 전일 연차 선택 시 종료일 필드 활성화
                endDateInput.disabled = false;
                endDateInput.style.background = '#f8f9fa';
                endDateInput.style.color = '#2c3e50';
            }
            calculateDays();
        });

        // 폼 제출 처리
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitLeaveRequest();
        });
    }

    loadEmployees() {
        const employeeSelect = document.getElementById('employee-select');
        const employees = this.dataManager.employees;

        employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = `${employee.name} (${employee.branch})`;
            employeeSelect.appendChild(option);
        });
    }

    async submitLeaveRequest() {
        const formData = new FormData(document.getElementById('leave-request-form'));
        const leaveRequest = {
            id: Date.now().toString(),
            employeeId: formData.get('employeeId'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            days: parseFloat(formData.get('days')),
            leaveType: formData.get('leaveType'),
            reason: formData.get('reason'),
            status: 'pending',
            requestDate: new Date().toISOString().split('T')[0],
            type: formData.get('leaveType') === 'half' ? '반차' : '휴가'
        };

        try {
            // 연차 신청 데이터 저장
            this.dataManager.addLeaveRequest(leaveRequest);
            
            alert('연차 신청이 완료되었습니다.');
            
            // 폼 초기화
            document.getElementById('leave-request-form').reset();
            document.getElementById('days').value = '';
            
            // 최근 신청 내역 새로고침
            this.loadRecentRequests();
            
        } catch (error) {
            console.error('연차 신청 오류:', error);
            alert('연차 신청 중 오류가 발생했습니다.');
        }
    }

    loadRecentRequests() {
        const requestsList = document.getElementById('recent-requests-list');
        const requests = this.dataManager.leaveRequests || [];
        
        // 최근 5개 신청만 표시
        const recentRequests = requests.slice(-5).reverse();

        if (recentRequests.length === 0) {
            requestsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>연차 신청 내역이 없습니다.</p>
                </div>
            `;
            return;
        }

        requestsList.innerHTML = recentRequests.map(request => {
            const employee = this.dataManager.employees.find(emp => emp.id === request.employeeId);
            const statusClass = this.getStatusClass(request.status);
            const statusText = this.getStatusText(request.status);
            
            return `
                <div class="request-item">
                    <div class="request-info">
                        <h4>${employee ? employee.name : '알 수 없음'}</h4>
                        <p class="request-dates">${request.startDate} ~ ${request.endDate}</p>
                        <p class="request-days">${request.days}일 (${request.type})</p>
                    </div>
                    <div class="request-status">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    getStatusClass(status) {
        switch (status) {
            case 'approved': return 'status-approved';
            case 'rejected': return 'status-rejected';
            case 'pending': return 'status-pending';
            default: return 'status-pending';
        }
    }

    getStatusText(status) {
        switch (status) {
            case 'approved': return '승인됨';
            case 'rejected': return '거부됨';
            case 'pending': return '대기중';
            default: return '대기중';
        }
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    if (window.dataManager) {
        new LeaveRequest();
    } else {
        console.error('DataManager가 로드되지 않았습니다.');
    }
});

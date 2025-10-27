// FullCalendar 기반 연차 캘린더
(function(){
    let calendar;
    let allEvents = [];
    
    // 지점별 색상 정의
    const branchColors = {
        '본사': '#1976d2',
        '강남점': '#388e3c',
        '부산점': '#f57c00',
        '평택점': '#7b1fa2',
        '대구점': '#d32f2f',
        '광주점': '#00796b',
        '대전점': '#5d4037',
        '울산점': '#455a64'
    };

    // 초기화
    function init() {
        console.log('캘린더 초기화 시작');
        if (!window.AuthGuard || !AuthGuard.checkAuth()) {
            console.log('인증 실패');
            return;
        }
        
        console.log('캘린더 초기화 중...');
        initializeCalendar();
        setupEventListeners();
        loadLeaveData();
    }

    // FullCalendar 초기화
    function initializeCalendar() {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) {
            console.error('캘린더 엘리먼트를 찾을 수 없습니다');
            return;
        }
        console.log('FullCalendar 초기화 중...');

        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'ko',
            headerToolbar: false, // 커스텀 헤더 사용
            height: 'auto',
            timeZone: 'local', // 로컬 시간대 사용
            displayEventTime: false, // 시간 표시 비활성화
            displayEventEnd: false, // 종료 시간 표시 비활성화
            events: [], // 빈 배열로 시작
            eventClick: function(info) {
                // 연차 클릭 시 상세 정보 표시
                const event = info.event;
                const eventData = {
                    ...event.extendedProps,
                    start: event.startStr,
                    end: event.endStr
                };
                showLeaveDetail(eventData);
            },
            eventDidMount: function(info) {
                // 이벤트 스타일링
                const event = info.event;
                const branchName = event.extendedProps.branch_name;
                const color = branchColors[branchName] || '#666';
                
                info.el.style.backgroundColor = color + '20';
                info.el.style.borderLeftColor = color;
                info.el.style.color = color;
                info.el.style.fontWeight = '500';
                info.el.style.borderRadius = '4px';
                info.el.style.padding = '2px 6px';
            },
            dayCellDidMount: function(info) {
                // 오늘 날짜 하이라이트
                const today = new Date();
                const cellDate = info.date;
                if (cellDate.toDateString() === today.toDateString()) {
                    info.el.style.backgroundColor = '#fff3cd';
                }
            }
        });

        calendar.render();
        console.log('FullCalendar 렌더링 완료');
    }

    // 실제 연차 데이터 가져오기
    function loadLeaveData() {
        try {
            // DataManager에서 실제 데이터 가져오기
            const dm = window.dataManager;
            if (!dm) {
                console.error('DataManager를 찾을 수 없습니다');
                return;
            }

            const employees = dm.employees || [];
            const leaveRequests = dm.leaveRequests || [];
            const branches = dm.branches || [];
            
            console.log('실제 데이터 로드:', {
                employees: employees.length,
                leaveRequests: leaveRequests.length,
                branches: branches.length
            });

            // 승인된 연차만 필터링
            const approvedLeaves = leaveRequests.filter(req => req.status === 'approved');
            console.log('승인된 연차:', approvedLeaves.length, '개');
            console.log('승인된 연차 상세:', approvedLeaves);
            
            // 각 연차의 날짜 정보 상세 출력
            approvedLeaves.forEach((leave, index) => {
                console.log(`연차 #${index + 1}:`, {
                    id: leave.id,
                    employeeName: leave.employeeName,
                    startDate: leave.startDate,
                    endDate: leave.endDate,
                    days: leave.days,
                    leaveType: leave.leaveType,
                    status: leave.status,
                    employeeId: leave.employeeId,
                    reason: leave.reason
                });
                
                // 직원 정보 상세 확인
                const employee = employees.find(emp => String(emp.id) === String(leave.employeeId));
                console.log(`  직원 정보:`, employee);
                
                // 지점 정보 상세 확인
                const branch = branches.find(br => br.id === (employee?.branchId || 1));
                console.log(`  지점 정보:`, branch);
                
                // 날짜 변환 과정 확인
                const startDate = leave.startDate + 'T00:00:00';
                const endDate = new Date(new Date(leave.endDate + 'T00:00:00').getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00';
                console.log(`  날짜 변환: ${leave.startDate} → ${startDate}, ${leave.endDate} → ${endDate}`);
            });

            // FullCalendar 이벤트 형식으로 변환
            const calendarEvents = approvedLeaves.map(leave => {
                // 연차 승인 페이지와 동일한 방식으로 직원 정보 조회
                const employee = employees.find(emp => String(emp.id) === String(leave.employeeId));
                const branch = branches.find(br => br.id === (employee?.branchId || 1));
                
                // 연차 승인 페이지와 동일한 지점명 사용 방식
                const branchName = employee?.branch || branch?.name || '본사';
                console.log(`연차 ${leave.id} 지점 매핑:`, {
                    employeeId: leave.employeeId,
                    employee: employee,
                    branch: branch,
                    finalBranchName: branchName
                });
                
                // 연차 승인 페이지와 동일한 leaveType 변환 로직
                const leaveTypeText = leave.leaveType === 'welfare-vacation' ? '복지휴가' : 
                                    leave.leaveType === 'vacation' ? '법정연차' :
                                    leave.leaveType === 'personal' ? '개인사정' :
                                    leave.leaveType === 'sick' ? '병가' : '기타';
                
                // 연차 승인 페이지와 동일한 직원명 사용
                const employeeName = leave.employeeName || employee?.name || '알 수 없음';
                const title = `${employeeName} (${leaveTypeText})`;
                
                // 날짜 변환 - FullCalendar의 배타적 end 날짜 처리
                const startDate = leave.startDate;
                const endDate = leave.endDate;
                
                // end 날짜를 포함적으로 처리하기 위해 하루 추가
                const endDateObj = new Date(endDate);
                endDateObj.setDate(endDateObj.getDate() + 1);
                const inclusiveEndDate = endDateObj.toISOString().split('T')[0];
                
                return {
                    id: leave.id,
                    title: title,
                    start: startDate,
                    end: inclusiveEndDate,
                    allDay: true, // 종일 이벤트로 설정
                    backgroundColor: getBranchColor(branchName),
                    borderColor: getBranchColor(branchName),
                    textColor: '#333',
                    extendedProps: {
                        leave_type: leaveTypeText,
                        half_type: leave.halfType || '전일',
                        reason: leave.reason || '',
                        user_name: employeeName,
                        team_name: employee?.team || employee?.department || '알 수 없음',
                        branch_name: branchName,
                        branch_id: employee?.branchId || 1,
                        team_id: employee?.teamId || 1,
                        days: leave.days || 1,
                        requestDate: leave.requestDate
                    }
                };
            });
            
            console.log('변환된 캘린더 이벤트:', calendarEvents);
            
            // 변환된 이벤트의 날짜 정보 상세 출력
            calendarEvents.forEach((event, index) => {
                console.log(`캘린더 이벤트 #${index + 1}:`, {
                    id: event.id,
                    title: event.title,
                    start: event.start,
                    end: event.end,
                    user_name: event.extendedProps.user_name,
                    branch_name: event.extendedProps.branch_name,
                    team_name: event.extendedProps.team_name
                });
            });
            
            allEvents = calendarEvents;
            console.log('allEvents 설정 완료:', allEvents.length, '개');
            console.log('allEvents 첫 번째 이벤트:', allEvents[0]);
            
            // 캘린더에서 모든 이벤트 제거 후 새로 추가
            calendar.removeAllEvents();
            calendar.addEventSource(calendarEvents);
            console.log('캘린더에 이벤트 추가 완료:', calendarEvents.length, '개');
            
            // 필터 옵션 업데이트
            updateFilterOptions();
            
            // 초기 필터 적용 (전체 표시)
            applyFilters();
            
        } catch (error) {
            console.error('연차 데이터 로드 실패:', error);
            // API 폴백
            loadLeaveDataFromAPI();
        }
    }

    // API에서 연차 데이터 가져오기 (폴백)
    function loadLeaveDataFromAPI() {
        fetch('/api/leaves')
            .then(response => response.json())
            .then(data => {
                console.log('API에서 연차 데이터 로드:', data);
                allEvents = data || [];
                
                // FullCalendar 이벤트 형식으로 변환
                const calendarEvents = allEvents.map(event => {
                    // end 날짜를 포함적으로 처리하기 위해 하루 추가
                    const endDateObj = new Date(event.end);
                    endDateObj.setDate(endDateObj.getDate() + 1);
                    const inclusiveEndDate = endDateObj.toISOString().split('T')[0];
                    
                    return {
                        id: event.id,
                        title: event.title,
                        start: event.start,
                        end: inclusiveEndDate,
                        allDay: true,
                        backgroundColor: getBranchColor(event.branch_name),
                        borderColor: getBranchColor(event.branch_name),
                        textColor: '#333',
                        extendedProps: {
                            leave_type: event.leave_type,
                            half_type: event.half_type,
                            reason: event.reason,
                            user_name: event.user_name,
                            team_name: event.team_name,
                            branch_name: event.branch_name,
                            branch_id: event.branch_id,
                            team_id: event.team_id
                        }
                    };
                });
                
                console.log('변환된 캘린더 이벤트:', calendarEvents);
                
                // 캘린더에서 모든 이벤트 제거 후 새로 추가
                calendar.removeAllEvents();
                calendar.addEventSource(calendarEvents);
                console.log('캘린더에 이벤트 추가 완료:', calendarEvents.length, '개');
                
                // 필터 옵션 업데이트
                updateFilterOptions();
            })
            .catch(error => {
                console.error('API 연차 데이터 로드 실패:', error);
            });
    }

    // 지점별 색상 가져오기
    function getBranchColor(branchName) {
        return branchColors[branchName] || '#666';
    }

    // 필터 옵션 업데이트
    function updateFilterOptions() {
        console.log('필터 옵션 업데이트 시작');
        
        // 지점 필터 업데이트
        const branchFilter = document.getElementById('branchFilter');
        if (branchFilter) {
            const dm = window.dataManager;
            const branches = dm?.branches || [];
            console.log('사용 가능한 지점들:', branches);
            
            const uniqueBranches = branches.map(branch => branch.name).filter(Boolean);
            console.log('고유 지점 이름들:', uniqueBranches);
            
            branchFilter.innerHTML = '<option value="all">전체 지점</option>';
            uniqueBranches.forEach(branch => {
                const option = document.createElement('option');
                option.value = branch;
                option.textContent = branch;
                branchFilter.appendChild(option);
            });
        }

        // 팀 필터 업데이트
        const teamFilter = document.getElementById('teamFilter');
        if (teamFilter) {
            const dm = window.dataManager;
            const employees = dm?.employees || [];
            console.log('사용 가능한 직원들:', employees);
            
            const uniqueTeams = [...new Set(employees.map(emp => emp.team))].filter(Boolean);
            console.log('고유 팀들:', uniqueTeams);
            
            teamFilter.innerHTML = '<option value="all">전체 팀</option>';
            uniqueTeams.forEach(team => {
                const option = document.createElement('option');
                option.value = team;
                option.textContent = team;
                teamFilter.appendChild(option);
            });
        }
        
        console.log('필터 옵션 업데이트 완료');
    }

    // 이벤트 리스너 설정
    function setupEventListeners() {
        // 월 네비게이션
        document.getElementById('prevMonth')?.addEventListener('click', () => {
            calendar.prev();
            updateCurrentMonth();
        });

        document.getElementById('nextMonth')?.addEventListener('click', () => {
            calendar.next();
            updateCurrentMonth();
        });

        // 오늘 버튼
        document.getElementById('todayBtn')?.addEventListener('click', () => {
            calendar.today();
            updateCurrentMonth();
        });

        // 필터 변경
        document.getElementById('branchFilter')?.addEventListener('change', applyFilters);
        document.getElementById('teamFilter')?.addEventListener('change', applyFilters);


        // 연차 신청 버튼
        document.getElementById('addLeaveBtn')?.addEventListener('click', () => {
            window.location.href = 'leave-request.html';
        });

        // 모달 닫기
        document.getElementById('closeLeaveDetailModal')?.addEventListener('click', closeLeaveDetailModal);
        document.getElementById('leaveDetailModal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('leaveDetailModal')) {
                closeLeaveDetailModal();
            }
        });
    }

    // 현재 월 표시 업데이트
    function updateCurrentMonth() {
        const currentMonthElement = document.getElementById('currentMonth');
        if (currentMonthElement && calendar) {
            const currentDate = calendar.getDate();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            currentMonthElement.textContent = `${year}년 ${month}월`;
        }
    }


    // 필터 적용
    function applyFilters() {
        const branchFilter = document.getElementById('branchFilter')?.value || 'all';
        const teamFilter = document.getElementById('teamFilter')?.value || 'all';
        
        console.log('필터 적용:', { branchFilter, teamFilter });
        console.log('allEvents 상태:', allEvents);
        console.log('allEvents 길이:', allEvents.length);
        
        if (!allEvents || allEvents.length === 0) {
            console.error('allEvents가 비어있습니다. 데이터를 다시 로드합니다.');
            loadLeaveData();
            return;
        }
        
        // 전체 필터인 경우 모든 이벤트 표시
        if (branchFilter === 'all' && teamFilter === 'all') {
            console.log('전체 필터 - 모든 이벤트 표시');
            calendar.removeAllEvents();
            calendar.addEventSource(allEvents);
            console.log('캘린더에 전체 이벤트 적용 완료:', allEvents.length, '개');
            return;
        }
        
        const filteredEvents = allEvents.filter(event => {
            const branchMatch = branchFilter === 'all' || event.extendedProps.branch_name === branchFilter;
            const teamMatch = teamFilter === 'all' || event.extendedProps.team_name === teamFilter;
            
            console.log(`이벤트 "${event.title}":`, {
                branch_name: event.extendedProps.branch_name,
                team_name: event.extendedProps.team_name,
                branchMatch,
                teamMatch,
                passed: branchMatch && teamMatch
            });
            
            return branchMatch && teamMatch;
        });
        
        console.log('필터링된 이벤트:', filteredEvents);

        // 필터링된 이벤트를 그대로 사용 (이미 FullCalendar 형식)
        calendar.removeAllEvents();
        calendar.addEventSource(filteredEvents);
        console.log('캘린더에 필터링된 이벤트 적용 완료:', filteredEvents.length, '개');
    }

    // 연차 상세 정보 표시
    function showLeaveDetail(eventData) {
        const modal = document.getElementById('leaveDetailModal');
        const title = document.getElementById('leaveDetailTitle');
        const content = document.getElementById('leaveDetailContent');

        if (!modal || !title || !content) return;

        title.textContent = `${eventData.user_name} - 연차 상세 정보`;

        const leaveTypeText = eventData.leave_type === '연차' ? '연차' : '복지휴가';
        const statusText = '승인됨'; // API에서 승인된 연차만 조회

        content.innerHTML = `
            <div class="leave-detail-item">
                <div class="leave-detail-header">
                    <div class="leave-detail-title">${eventData.leave_type} 신청</div>
                    <div class="leave-detail-status approved">승인됨</div>
                </div>
                <div class="leave-detail-info">
                    <span><i class="fas fa-user"></i> ${eventData.user_name}</span>
                    <span><i class="fas fa-building"></i> ${eventData.branch_name}</span>
                    <span><i class="fas fa-users"></i> ${eventData.team_name}</span>
                    <span><i class="fas fa-calendar"></i> ${eventData.start.split('T')[0]} ~ ${eventData.end.split('T')[0]} (${eventData.days || 1}일)</span>
                    <span><i class="fas fa-file-alt"></i> ${eventData.reason || '사유 없음'}</span>
                    <span><i class="fas fa-clock"></i> ${eventData.half_type || '전일'}</span>
                    <span><i class="fas fa-calendar-plus"></i> 신청일: ${eventData.requestDate || '-'}</span>
                </div>
            </div>
        `;

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // 모달 닫기
    function closeLeaveDetailModal() {
        const modal = document.getElementById('leaveDetailModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // 전역 함수로 등록
    window.showLeaveDetail = showLeaveDetail;
    window.closeLeaveDetailModal = closeLeaveDetailModal;

    // 페이지 로드 시 초기화
    window.addEventListener('DOMContentLoaded', function() {
        init();
    });
})();
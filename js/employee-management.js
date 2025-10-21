// 직원관리 테이블 스크립트 - 이벤트 핸들러 중복 방지 버전
(function(){
    let dm;
    let currentEditingId = null;
    let currentSort = { column: null, direction: 'asc' };
    let currentPage = 1;
    const itemsPerPage = 10;
    let isInitialized = false; // 초기화 중복 방지

    function renderEmployeeTable(employees) {
        const tbody = document.getElementById('employeeTableBody');
        if (!tbody) return;

        if (employees.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="13" class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>검색 조건에 맞는 직원이 없습니다.</p>
                    </td>
                </tr>
            `;
            updateTableInfo(0);
            return;
        }

        tbody.innerHTML = employees.map(emp => {
            
            const status = emp.status || 'active';
            const statusText = status === 'active' ? '재직' : '퇴사';
            const statusClass = status === 'active' ? 'status-active' : 'status-resigned';
            
            // 지점별 연차 계산 기준 표시
            let leaveStandard = '-';
            try {
                const branch = (emp.branch || '').toString();
                const branchInfo = (dm.branches || []).find(b => b.name === branch);
                const std = branchInfo?.leaveCalculationStandard || 'hire_date';
                leaveStandard = std === 'fiscal_year' ? '회계연도' : '입사일';
            } catch(_) {}

            const stats = getComputedLeaveStats(emp);
            const usageRate = stats.total > 0 ? (stats.used / stats.total * 100) : 0;
            const usageClass = usageRate < 30 ? 'low' : usageRate < 70 ? 'medium' : 'high';
            return `
                <tr data-id="${emp.id}" class="${status}">
                    <td><strong>${emp.name}</strong></td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td><span class="badge ${leaveStandard === '회계연도' ? 'badge-std-fiscal' : 'badge-std-hire'}">${leaveStandard}</span></td>
                    <td>${emp.department}</td>
                    <td>${emp.branch}</td>
                    <td>${emp.position}</td>
                    <td>${emp.email}</td>
                    <td>${emp.phone || '-'}</td>
                    <td>${emp.hireDate}</td>
                    <td>${emp.birthDate || '-'}</td>
                    <td>${stats.total}일</td>
                    <td>${stats.used}일</td>
                    <td>${stats.remaining}일</td>
                    <td>
                        <div class="usage-rate">
                            <div class="usage-bar">
                                <div class="usage-fill ${usageClass}" style="width: ${usageRate.toFixed(0)}%"></div>
                            </div>
                            <span class="usage-text">${usageRate.toFixed(0)}%</span>
                        </div>
                    </td>
                    <td class="actions-column">
                        <div class="employee-actions-btns">
                            <button class="btn-icon btn-edit" onclick="editEmployee(${emp.id})" title="수정">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${status === 'active' ? 
                                `<button class="btn-icon btn-resign" onclick="resignEmployee(${emp.id})" title="퇴사 처리">
                                    <i class="fas fa-user-times"></i>
                                </button>` : 
                                `<button class="btn-icon btn-reactivate" onclick="reactivateEmployee(${emp.id})" title="재직 처리">
                                    <i class="fas fa-user-check"></i>
                                </button>`
                            }
                            ${getCurrentUser() && getCurrentUser().role === 'admin' ? 
                                `<button class="btn-icon btn-delete" onclick="deleteEmployee(${emp.id})" title="계정 삭제">
                                    <i class="fas fa-trash-alt"></i>
                                </button>` : ''
                            }
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        updateTableInfo(employees.length);
    }

    function updateTableInfo(total) {
        const countElement = document.getElementById('employeeCount');
        if (countElement) {
            countElement.textContent = `총 ${total}명의 직원`;
        }
    }

    // 직원 연차 현황 산출(실제 leaveRequests 기준)
    function getComputedLeaveStats(employee) {
        try {
            const currentYear = new Date().getFullYear();
            // employeeId 혼재 대응(user.id/employee.id)
            const usersStorage = localStorage.getItem('offday_users') || localStorage.getItem('users') || '[]';
            const users = dm?.users || JSON.parse(usersStorage);
            const user = users.find(u => u.email === employee.email);
            const identifiers = new Set([employee.id]);
            if (user) identifiers.add(user.id);

            const requests = (dm.leaveRequests || []).filter(r =>
                identifiers.has(r.employeeId) &&
                new Date(r.startDate).getFullYear() === currentYear
            );

            const used = requests
                .filter(r => r.status === 'approved')
                .reduce((sum, r) => sum + (r.days || 0), 0);

            // 총 연차는 지점 기준 계산 우선 (직원 지점 기준 + 현재 날짜 기준)
            let total = employee.annualLeaveDays || 15;
            if (window.LeaveCalculation && typeof window.LeaveCalculation.calculateLeaveByBranchStandard === 'function') {
                try {
                    total = Math.round(window.LeaveCalculation.calculateLeaveByBranchStandard(employee.id));
                } catch (_) {}
            }
            const remaining = Math.max(total - used, 0);
            return { total, used, remaining };
        } catch (e) {
            return { total: employee.annualLeaveDays || 15, used: employee.usedLeaveDays || 0, remaining: employee.remainingLeaveDays || 0 };
        }
    }

    function searchEmployees(searchTerm, statusFilter, branchFilter, departmentFilter) {
        const employees = dm.employees || [];
        
        return employees.filter(emp => {
            const matchesSearch = !searchTerm || 
                emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.position.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'all' || (emp.status || 'active') === statusFilter;
            const matchesBranch = branchFilter === 'all' || emp.branch === branchFilter;
            const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
            
            return matchesSearch && matchesStatus && matchesBranch && matchesDepartment;
        });
    }

    function sortEmployees(employees, column, direction) {
        return employees.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // 숫자 필드 처리
            if (['annualLeaveDays', 'usedLeaveDays', 'remainingLeaveDays'].includes(column)) {
                aVal = Number(aVal) || 0;
                bVal = Number(bVal) || 0;
            }

            // 날짜 필드 처리
            if (column === 'hireDate' || column === 'birthDate') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            if (direction === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });
    }

    function updateSortUI(column, direction) {
        // 모든 헤더에서 정렬 클래스 제거
        document.querySelectorAll('.employee-table th.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });

        // 현재 정렬 컬럼에 클래스 추가
        const currentTh = document.querySelector(`th[data-sort="${column}"]`);
        if (currentTh) {
            currentTh.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    }

    function refreshEmployeeTable() {
        const searchTerm = document.getElementById('searchEmployee').value;
        const branchFilter = document.getElementById('branchFilter').value;
        const departmentFilter = document.getElementById('departmentFilter').value;

        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        let filteredEmployees = searchEmployees(searchTerm, statusFilter, branchFilter, departmentFilter);

        // 정렬 적용
        if (currentSort.column) {
            filteredEmployees = sortEmployees(filteredEmployees, currentSort.column, currentSort.direction);
        }

        renderEmployeeTable(filteredEmployees);
    }

    function openModal(title, employeeData = null) {
        const modal = document.getElementById('employeeModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('employeeForm');

        if (!modal || !modalTitle || !form) return;

        modalTitle.textContent = title;
        currentEditingId = employeeData ? employeeData.id : null;

        if (employeeData) {
            // 수정 모드 - 폼에 데이터 채우기
            document.getElementById('employeeName').value = employeeData.name || '';
            document.getElementById('employeeEmail').value = employeeData.email || '';
            document.getElementById('employeePhone').value = employeeData.phone || '';
            document.getElementById('employeePosition').value = employeeData.position || '';
            document.getElementById('employeeHireDate').value = employeeData.hireDate || employeeData.joindate || '';
            document.getElementById('employeeBirthDate').value = employeeData.birthDate || '';
            // annualLeaveDays는 지점 기준 계산을 사용하므로 편집 제외
            
            // 지점과 부서 데이터 로드 및 설정
            loadBranchAndDepartmentDataWithValues(employeeData);
        } else {
            // 추가 모드 - 폼 초기화
            form.reset();
            // annualLeaveDays 입력 제거
            // 추가 모드에서도 지점 데이터 로드
            loadBranchAndDepartmentData();
        }

        modal.style.display = 'block';
        
        // 모달이 열릴 때 body 스크롤 방지
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        const modal = document.getElementById('employeeModal');
        if (modal) {
            modal.style.display = 'none';
            // 모달이 닫힐 때 body 스크롤 복원
            document.body.style.overflow = 'auto';
        }
        currentEditingId = null;
    }

    function addEmployee() {
        openModal('직원 추가');
    }

    function editEmployee(id) {
        const employee = dm.employees.find(emp => emp.id === id);
        if (employee) {
            openModal('직원 수정', employee);
        }
    }

    function deleteEmployee(id) {
        const employee = dm.employees.find(emp => emp.id === id);
        if (!employee) return;

        // 현재 사용자가 메인관리자인지 확인
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            alert('계정 삭제 권한이 없습니다.\n메인관리자만 계정을 삭제할 수 있습니다.');
            return;
        }

        // 메인관리자는 연차 신청 내역이 있어도 삭제 가능
        const hasLeaveRequests = dm.leaveRequests.some(req => req.employeeId === id);
        if (hasLeaveRequests) {
            if (!confirm(`"${employee.name}" 직원에게 연차 신청 내역이 있습니다.\n\n메인관리자 권한으로 연차 내역과 함께 완전히 삭제하시겠습니까?\n\n⚠️ 다음 데이터가 모두 삭제됩니다:\n• 직원 데이터\n• 사용자 계정\n• 모든 연차 신청 내역\n• 연차 사용 기록\n\n이 작업은 되돌릴 수 없습니다.`)) {
                return;
            }
        }

        if (confirm(`"${employee.name}" 직원의 계정을 완전히 삭제하시겠습니까?\n\n⚠️ 다음 데이터가 삭제됩니다:\n• 직원 데이터\n• 사용자 계정 (이메일: ${employee.email})\n• 모든 연차 내역\n\n이 작업은 되돌릴 수 없습니다.`)) {
            // 1. 연차 신청 내역 삭제 (해당 직원의 모든 연차 신청)
            if (hasLeaveRequests) {
                dm.leaveRequests = dm.leaveRequests.filter(req => req.employeeId !== id);
                dm.saveData();
                console.log('연차 신청 내역 삭제 완료');
            }

            // 2. 사용자 계정 삭제 (authManager 사용)
            if (typeof window.authManager !== 'undefined') {
                const deleteResult = window.authManager.deleteUserByEmail(employee.email);
                if (deleteResult.success) {
                    console.log('사용자 계정 삭제 완료:', employee.email);
                } else {
                    console.log('사용자 계정 삭제 실패 또는 계정 없음:', employee.email);
                }
            }

            // 3. 직원 데이터 삭제
            dm.deleteEmployee(id);
            
            // 4. 테이블 새로고침
            refreshEmployeeTable();
            
            const deleteMessage = hasLeaveRequests ? 
                '계정 삭제가 완료되었습니다.\n직원 데이터, 사용자 계정, 연차 신청 내역이 모두 삭제되었습니다.' :
                '계정 삭제가 완료되었습니다.\n직원 데이터와 사용자 계정이 모두 삭제되었습니다.';
            
            alert(deleteMessage);
        }
    }

    // 퇴사 처리
    function resignEmployee(id) {
        const employee = dm.employees.find(emp => emp.id === id);
        if (!employee) return;

        const resignationDate = prompt('퇴사일을 입력해주세요 (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
        if (!resignationDate) return;

        // 날짜 형식 검증
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(resignationDate)) {
            alert('올바른 날짜 형식을 입력해주세요 (YYYY-MM-DD)');
            return;
        }

        if (confirm(`"${employee.name}" 직원을 퇴사 처리하시겠습니까?\n퇴사일: ${resignationDate}\n\n연차 내역은 보존됩니다.`)) {
            if (dm.resignEmployee(id, resignationDate)) {
                alert('퇴사 처리되었습니다.');
                refreshEmployeeTable();
            } else {
                alert('퇴사 처리에 실패했습니다.');
            }
        }
    }

    // 재직 처리 (퇴사 취소)
    function reactivateEmployee(id) {
        const employee = dm.employees.find(emp => emp.id === id);
        if (!employee) return;

        if (confirm(`"${employee.name}" 직원을 재직 처리하시겠습니까?\n퇴사 처리를 취소합니다.`)) {
            if (dm.reactivateEmployee(id)) {
                alert('재직 처리되었습니다.');
                refreshEmployeeTable();
            } else {
                alert('재직 처리에 실패했습니다.');
            }
        }
    }

    function saveEmployee(formData) {
        const employeeData = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            department: formData.get('department'),
            branch: formData.get('branch'),
            position: formData.get('position'),
            hireDate: formData.get('hireDate'),
            birthDate: formData.get('birthDate')
        };

        // 이메일 중복 체크
        const existingEmployee = dm.employees.find(emp => 
            emp.email === employeeData.email && emp.id !== currentEditingId
        );
        if (existingEmployee) {
            alert('이미 존재하는 이메일입니다.');
            return false;
        }

        if (currentEditingId) {
            // 수정
            const updatedEmployee = dm.updateEmployee(currentEditingId, employeeData);
            if (updatedEmployee) {
                // 사용자 데이터도 동기화
                if (typeof window.authManager !== 'undefined') {
                    const user = window.authManager.getStoredUsers().find(u => u.email === employeeData.email);
                    if (user) {
                        user.name = employeeData.name;
                        user.phone = employeeData.phone;
                        user.branch = employeeData.branch;
                        user.department = employeeData.department;
                        user.position = employeeData.position;
                        // 입사일이 변경되었는지 확인
                        const hireDateChanged = user.joindate !== employeeData.hireDate;
                        user.joindate = employeeData.hireDate;
                        user.birthdate = employeeData.birthDate;
                        window.authManager.saveUsers(window.authManager.getStoredUsers());
                        
                        // 입사일이 변경되었으면 연차 재계산 필요
                        if (hireDateChanged) {
                            console.log('입사일 변경됨 - 연차 재계산 필요:', user.email, employeeData.hireDate);
                            // 연차 재계산 로직이 있다면 여기서 호출
                            if (window.LeaveCalculation) {
                                // 연차 계산 시스템이 있으면 재계산
                                console.log('연차 재계산 시스템 호출');
                            }
                        }
                        
                        console.log('직원 수정 시 사용자 데이터 동기화 완료:', user.email);
                    }
                }
                alert('직원 정보가 수정되었습니다.');
            }
        } else {
            // 추가
            const newEmployee = dm.addEmployee(employeeData);
            if (newEmployee) {
                alert('새 직원이 추가되었습니다.');
            }
        }

        closeModal();
        refreshEmployeeTable();
        return true;
    }

    // 전역 함수로 등록
    window.addEmployee = addEmployee;
    window.editEmployee = editEmployee;
    window.deleteEmployee = deleteEmployee;
    window.resignEmployee = resignEmployee;
    window.reactivateEmployee = reactivateEmployee;

    // 지점과 부서 데이터 로드 (캐싱 적용)
    function loadBranchAndDepartmentData() {
        const branchSelect = document.getElementById('employeeBranch');
        if (!branchSelect) return;

        // 이미 로드된 경우 재로드하지 않음
        if (branchSelect.options.length > 1) {
            return;
        }
        
        if (window.dataManager && window.dataManager.branches && window.dataManager.branches.length > 0) {
            branchSelect.innerHTML = '<option value="">지점을 선택하세요</option>';
            window.dataManager.branches.forEach(branch => {
                const option = document.createElement('option');
                option.value = branch.name;
                option.textContent = branch.name;
                branchSelect.appendChild(option);
            });
        } else {
            branchSelect.innerHTML = '<option value="">지점을 선택하세요</option>';
        }
    }

    // 지점과 부서 데이터 로드 및 값 설정 (최적화)
    function loadBranchAndDepartmentDataWithValues(employeeData) {
        const branchSelect = document.getElementById('employeeBranch');
        if (!branchSelect) return;

        // dataManager 로드 확인 및 재시도
        let attempts = 0;
        const maxAttempts = 20;
        
        const loadData = () => {
            attempts++;
            
            if (window.dataManager && window.dataManager.branches && window.dataManager.branches.length > 0) {
                // 지점 데이터 로드
                branchSelect.innerHTML = '<option value="">지점을 선택하세요</option>';
                window.dataManager.branches.forEach(branch => {
                    const option = document.createElement('option');
                    option.value = branch.name;
                    option.textContent = branch.name;
                    branchSelect.appendChild(option);
                });
                
                // 지점 값 설정
                if (employeeData.branch) {
                    branchSelect.value = employeeData.branch;
                    
                    // 부서 로드 및 설정
                    loadDepartmentsForBranch(employeeData.branch);
                    
                    // 부서 값 설정 (약간의 지연 후)
                    setTimeout(() => {
                        if (employeeData.department) {
                            const departmentSelect = document.getElementById('employeeDepartment');
                            if (departmentSelect) {
                                departmentSelect.value = employeeData.department;
                            }
                        }
                    }, 50);
                }
            } else if (attempts < maxAttempts) {
                // dataManager가 아직 로드되지 않았으면 재시도
                setTimeout(loadData, 50);
            } else {
                // 최대 시도 횟수 초과 시 기본 옵션만 표시
                branchSelect.innerHTML = '<option value="">지점을 선택하세요</option>';
            }
        };
        
        loadData();
    }

    // 선택된 지점에 따른 부서 로드 (최적화)
    function loadDepartmentsForBranch(branchName) {
        const departmentSelect = document.getElementById('employeeDepartment');
        if (!departmentSelect) return;

        departmentSelect.innerHTML = '<option value="">팀/부서를 선택하세요</option>';
        
        if (!branchName) {
            departmentSelect.disabled = true;
            return;
        }

        // dataManager에서 해당 지점의 부서 데이터 가져오기
        if (window.dataManager && window.dataManager.getBranchTeams) {
            const teams = window.dataManager.getBranchTeams(branchName);
            
            if (teams && teams.length > 0) {
                departmentSelect.disabled = false;
                teams.forEach(team => {
                    const option = document.createElement('option');
                    option.value = team;
                    option.textContent = team;
                    departmentSelect.appendChild(option);
                });
            } else {
                // 지점별 팀 데이터가 없으면 기본 부서들 사용
                setDefaultDepartments(departmentSelect);
            }
        } else {
            // dataManager가 없으면 기본 부서들 사용
            setDefaultDepartments(departmentSelect);
        }
    }

    // 기본 부서 설정
    function setDefaultDepartments(departmentSelect) {
        const defaultDepartments = ['경영관리팀', '택스팀', '컨설팅팀', '영업팀', '개발팀', '마케팅팀', '인사팀'];
        departmentSelect.disabled = false;
        
        defaultDepartments.forEach(deptName => {
            const option = document.createElement('option');
            option.value = deptName;
            option.textContent = deptName;
            departmentSelect.appendChild(option);
        });
    }

    // 이벤트 핸들러 등록 함수
    function attachEventListeners() {
        if (isInitialized) return; // 중복 등록 방지
        isInitialized = true;

        // 직원 추가 버튼
        const addBtn = document.getElementById('addEmployeeBtn');
        if (addBtn) {
            addBtn.addEventListener('click', addEmployee);
        }

        // 검색 및 필터
        const searchInput = document.getElementById('searchEmployee');
        if (searchInput) {
            searchInput.addEventListener('input', refreshEmployeeTable);
        }

        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', refreshEmployeeTable);
        }

        const branchFilter = document.getElementById('branchFilter');
        if (branchFilter) {
            branchFilter.addEventListener('change', refreshEmployeeTable);
        }

        const departmentFilter = document.getElementById('departmentFilter');
        if (departmentFilter) {
            departmentFilter.addEventListener('change', refreshEmployeeTable);
        }

        // 정렬 이벤트 리스너
        document.querySelectorAll('.employee-table th.sortable').forEach(th => {
            th.addEventListener('click', function() {
                const column = this.getAttribute('data-sort');
                if (!column) return;

                // 정렬 방향 결정
                if (currentSort.column === column) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = column;
                    currentSort.direction = 'asc';
                }

                updateSortUI(column, currentSort.direction);
                refreshEmployeeTable();
            });
        });

        // 폼 제출 처리
        const form = document.getElementById('employeeForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                const formData = new FormData(this);
                saveEmployee(formData);
            });
        }

        // 지점 선택 시 부서 로드
        const branchSelect = document.getElementById('employeeBranch');
        if (branchSelect) {
            branchSelect.addEventListener('change', function() {
                loadDepartmentsForBranch(this.value);
            });
        }

        // 모달 닫기
        const closeModalBtn = document.getElementById('closeModal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeModal);
        }

        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModal);
        }

        const modal = document.getElementById('employeeModal');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeModal();
                }
            });
        }

        // 로그아웃 처리는 auth.js에서 전역으로 처리됨

        // 엑셀 내보내기
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                alert('엑셀 내보내기 기능은 추후 구현 예정입니다.');
            });
        }

        // 회원 동기화 버튼 이벤트
        const syncUsersBtn = document.getElementById('syncUsersBtn');
        if (syncUsersBtn) {
            syncUsersBtn.addEventListener('click', function() {
                if (typeof window.authManager !== 'undefined') {
                    console.log('회원 동기화 버튼 클릭 - 데이터 일관성 검증 및 강제 동기화 시작');
                    
                    // 1단계: 데이터 일관성 검증 및 수정
                    const validationResult = window.authManager.validateAndFixDataConsistency();
                    
                    // 2단계: 강제 동기화
                    window.authManager.forceSyncUsersToEmployees();
                    
                    // 3단계: 테이블 새로고침
                    refreshEmployeeTable();
                    
                    // 결과 알림
                    let message = '데이터 동기화가 완료되었습니다.\n';
                    if (validationResult && validationResult.issuesFound > 0) {
                        message += `발견된 문제: ${validationResult.issuesFound}개\n`;
                        message += `해결된 문제: ${validationResult.issuesFixed}개\n`;
                    }
                    message += `현재 사용자: ${validationResult?.usersCount || 0}명\n`;
                    message += `현재 직원: ${validationResult?.employeesCount || 0}명`;
                    
                    alert(message);
                } else {
                    alert('인증 관리자가 로드되지 않았습니다.');
                }
            });
        }
    }

    window.addEventListener('DOMContentLoaded', function() {
        if (!window.AuthGuard || !AuthGuard.checkAuth()) return;
        
        dm = window.dataManager || new DataManager();
        window.dataManager = dm;

        // 페이지 로드 시 자동으로 회원 데이터 동기화 (한 번만 실행)
        if (typeof window.authManager !== 'undefined' && !window.employeeManagementInitialized) {
            console.log('직원관리 페이지에서 자동 동기화 실행');
            // 기존 삭제된 사용자 정리 (일회성)
            window.authManager.cleanupDeletedUsers();
            // 강제 동기화로 모든 데이터 일치시키기
            window.authManager.forceSyncUsersToEmployees();
            window.employeeManagementInitialized = true;
        }

        // 이벤트 리스너 등록
        attachEventListeners();

        // 초기 렌더링
        refreshEmployeeTable();
        
        // 지점별 팀 선택 기능 초기화
        initializeBranchTeamSelection();
    });

    // 지점별 팀 선택 기능 초기화
    function initializeBranchTeamSelection() {
        const branchSelect = document.getElementById('employeeBranch');
        const departmentSelect = document.getElementById('employeeDepartment');
        
        if (!branchSelect || !departmentSelect) return;

        // 지점 선택 시 팀 목록 업데이트
        branchSelect.addEventListener('change', function() {
            updateDepartmentOptions(this.value, departmentSelect);
        });
    }

    // 부서 옵션 업데이트
    function updateDepartmentOptions(branchName, departmentSelect) {
        if (!departmentSelect) return;

        // 기존 옵션 제거
        departmentSelect.innerHTML = '';

        if (!branchName) {
            departmentSelect.innerHTML = '<option value="">먼저 지점을 선택하세요</option>';
            departmentSelect.disabled = true;
            return;
        }

        // 해당 지점의 팀 목록 가져오기
        const teams = dm.getBranchTeams(branchName);
        
        if (teams.length === 0) {
            departmentSelect.innerHTML = '<option value="">등록된 팀이 없습니다</option>';
            departmentSelect.disabled = true;
            return;
        }

        // 팀 옵션 추가
        departmentSelect.innerHTML = '<option value="">팀을 선택하세요</option>';
        teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team;
            option.textContent = team;
            departmentSelect.appendChild(option);
        });

        departmentSelect.disabled = false;
    }
})();

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
                    <td colspan="12" class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>검색 조건에 맞는 직원이 없습니다.</p>
                    </td>
                </tr>
            `;
            updateTableInfo(0);
            return;
        }

        tbody.innerHTML = employees.map(emp => {
            const usageRate = emp.annualLeaveDays > 0 ? (emp.usedLeaveDays / emp.annualLeaveDays * 100) : 0;
            const usageClass = usageRate < 30 ? 'low' : usageRate < 70 ? 'medium' : 'high';
            
            return `
                <tr>
                    <td><strong>${emp.name}</strong></td>
                    <td>${emp.department}</td>
                    <td>${emp.branch}</td>
                    <td>${emp.position}</td>
                    <td>${emp.email}</td>
                    <td>${emp.phone || '-'}</td>
                    <td>${emp.hireDate}</td>
                    <td>${emp.annualLeaveDays}일</td>
                    <td>${emp.usedLeaveDays}일</td>
                    <td>${emp.remainingLeaveDays}일</td>
                    <td>
                        <div class="usage-rate">
                            <div class="usage-bar">
                                <div class="usage-fill ${usageClass}" style="width: ${usageRate}%"></div>
                            </div>
                            <span class="usage-text">${usageRate.toFixed(0)}%</span>
                        </div>
                    </td>
                    <td class="actions-column">
                        <div class="employee-actions-btns">
                            <button class="btn-icon btn-edit" onclick="editEmployee(${emp.id})" title="수정">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-delete" onclick="deleteEmployee(${emp.id})" title="삭제">
                                <i class="fas fa-trash"></i>
                            </button>
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

    function searchEmployees(searchTerm, branchFilter, departmentFilter) {
        const employees = dm.employees || [];
        
        return employees.filter(emp => {
            const matchesSearch = !searchTerm || 
                emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.position.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesBranch = branchFilter === 'all' || emp.branch === branchFilter;
            const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
            
            return matchesSearch && matchesBranch && matchesDepartment;
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
            if (column === 'hireDate') {
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

        let filteredEmployees = searchEmployees(searchTerm, branchFilter, departmentFilter);

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
            document.getElementById('employeeDepartment').value = employeeData.department || '';
            document.getElementById('employeeBranch').value = employeeData.branch || '';
            document.getElementById('employeePosition').value = employeeData.position || '';
            document.getElementById('employeeHireDate').value = employeeData.hireDate || '';
            document.getElementById('employeeAnnualLeave').value = employeeData.annualLeaveDays || 15;
        } else {
            // 추가 모드 - 폼 초기화
            form.reset();
            document.getElementById('employeeAnnualLeave').value = 15;
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

        // 연차 신청이 있는 직원은 삭제 불가
        const hasLeaveRequests = dm.leaveRequests.some(req => req.employeeId === id);
        if (hasLeaveRequests) {
            alert('연차 신청 내역이 있는 직원은 삭제할 수 없습니다.');
            return;
        }

        if (confirm(`"${employee.name}" 직원을 삭제하시겠습니까?`)) {
            dm.deleteEmployee(id);
            refreshEmployeeTable();
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
            annualLeaveDays: parseInt(formData.get('annualLeaveDays')) || 15
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

        // 로그아웃 처리
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', function(e) {
                e.preventDefault();
                if (confirm('정말 로그아웃하시겠습니까?')) {
                    window.authManager && window.authManager.logout && window.authManager.logout();
                    window.location.href = 'login.html';
                }
            });
        }

        // 엑셀 내보내기
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                alert('엑셀 내보내기 기능은 추후 구현 예정입니다.');
            });
        }
    }

    window.addEventListener('DOMContentLoaded', function() {
        if (!window.AuthGuard || !AuthGuard.checkAuth()) return;
        
        dm = window.dataManager || new DataManager();
        window.dataManager = dm;

        // 이벤트 리스너 등록
        attachEventListeners();

        // 초기 렌더링
        refreshEmployeeTable();
    });
})();

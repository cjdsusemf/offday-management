// 지점관리 스크립트
(function(){
    let dm;
    let currentEditingId = null;

    // 지점 목록 렌더링
    function renderBranchList(branches) {
        const branchList = document.getElementById('branchList');
        if (!branchList) return;

        if (branches.length === 0) {
            branchList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-building"></i>
                    <p>등록된 지점이 없습니다.<br>지점 추가 버튼을 클릭하여 새 지점을 등록하세요.</p>
                </div>
            `;
            return;
        }

        branchList.innerHTML = branches.map(branch => `
            <div class="branch-card" data-id="${branch.id}">
                <div class="branch-header">
                    <h3 class="branch-name">${branch.name}</h3>
                    <div class="branch-actions-btns">
                        <button class="btn-icon btn-edit" onclick="editBranch(${branch.id})" title="수정">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteBranch(${branch.id})" title="삭제">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="branch-info">
                    ${branch.address ? `
                        <div class="branch-info-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${branch.address}</span>
                        </div>
                    ` : ''}
                    ${branch.phone ? `
                        <div class="branch-info-item">
                            <i class="fas fa-phone"></i>
                            <span>${branch.phone}</span>
                        </div>
                    ` : ''}
                    ${branch.manager ? `
                        <div class="branch-info-item">
                            <i class="fas fa-user-tie"></i>
                            <span>지점장: ${branch.manager}</span>
                        </div>
                    ` : ''}
                </div>
                ${branch.description ? `
                    <div class="branch-description">${branch.description}</div>
                ` : ''}
            </div>
        `).join('');
    }

    // 지점 검색
    function searchBranches(searchTerm) {
        const allBranches = dm.branches || [];
        if (!searchTerm.trim()) {
            return allBranches;
        }
        
        return allBranches.filter(branch => 
            branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (branch.address && branch.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (branch.manager && branch.manager.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }

    // 모달 열기
    function openModal(title, branchData = null) {
        const modal = document.getElementById('branchModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('branchForm');
        
        modalTitle.textContent = title;
        currentEditingId = branchData ? branchData.id : null;
        
        // 폼 초기화
        form.reset();
        
        // 수정 모드인 경우 데이터 채우기
        if (branchData) {
            document.getElementById('branchName').value = branchData.name || '';
            document.getElementById('branchAddress').value = branchData.address || '';
            document.getElementById('branchPhone').value = branchData.phone || '';
            document.getElementById('branchManager').value = branchData.manager || '';
            document.getElementById('branchDescription').value = branchData.description || '';
        }
        
        modal.style.display = 'block';
        document.getElementById('branchName').focus();
    }

    // 모달 닫기
    function closeModal() {
        const modal = document.getElementById('branchModal');
        modal.style.display = 'none';
        currentEditingId = null;
    }

    // 지점 추가
    function addBranch() {
        openModal('지점 추가');
    }

    // 지점 수정
    function editBranch(id) {
        const branch = dm.branches.find(b => b.id === id);
        if (branch) {
            openModal('지점 수정', branch);
        }
    }

    // 지점 삭제
    function deleteBranch(id) {
        const branch = dm.branches.find(b => b.id === id);
        if (!branch) return;

        if (confirm(`"${branch.name}" 지점을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
            // 해당 지점에 속한 직원이 있는지 확인
            const employeesInBranch = dm.employees.filter(emp => emp.branch === branch.name);
            if (employeesInBranch.length > 0) {
                alert(`이 지점에 ${employeesInBranch.length}명의 직원이 있습니다.\n직원을 다른 지점으로 이동한 후 삭제해주세요.`);
                return;
            }

            // 지점 삭제
            dm.branches = dm.branches.filter(b => b.id !== id);
            dm.saveData('branches', dm.branches);
            
            // 목록 새로고침
            refreshBranchList();
            alert('지점이 삭제되었습니다.');
        }
    }

    // 지점 저장
    function saveBranch(formData) {
        const branchData = {
            name: formData.name.trim(),
            address: formData.address.trim(),
            phone: formData.phone.trim(),
            manager: formData.manager.trim(),
            description: formData.description.trim()
        };

        // 지점명 중복 확인
        const existingBranch = dm.branches.find(b => 
            b.name === branchData.name && b.id !== currentEditingId
        );
        
        if (existingBranch) {
            alert('이미 존재하는 지점명입니다.');
            return false;
        }

        if (currentEditingId) {
            // 수정
            const index = dm.branches.findIndex(b => b.id === currentEditingId);
            if (index !== -1) {
                const oldName = dm.branches[index].name;
                dm.branches[index] = { ...dm.branches[index], ...branchData };
                
                // 지점명이 변경된 경우 직원들의 지점 정보도 업데이트
                if (oldName !== branchData.name) {
                    dm.employees.forEach(emp => {
                        if (emp.branch === oldName) {
                            emp.branch = branchData.name;
                        }
                    });
                    dm.saveData('employees', dm.employees);
                }
                
                dm.saveData('branches', dm.branches);
                alert('지점 정보가 수정되었습니다.');
            }
        } else {
            // 추가
            const newBranch = {
                id: Date.now(),
                ...branchData,
                createdAt: new Date().toISOString().split('T')[0]
            };
            dm.branches.push(newBranch);
            dm.saveData('branches', dm.branches);
            alert('새 지점이 추가되었습니다.');
        }

        closeModal();
        refreshBranchList();
        return true;
    }

    // 목록 새로고침
    function refreshBranchList() {
        const searchTerm = document.getElementById('searchBranch').value;
        const filteredBranches = searchBranches(searchTerm);
        renderBranchList(filteredBranches);
    }

    // 전역 함수로 등록
    window.addBranch = addBranch;
    window.editBranch = editBranch;
    window.deleteBranch = deleteBranch;

    // DOM 로드 완료 시 실행
    window.addEventListener('DOMContentLoaded', function() {
        if (!window.AuthGuard || !AuthGuard.checkAuth()) return;
        
        dm = window.dataManager || new DataManager();
        window.dataManager = dm;

        // 지점 데이터 초기화 (없으면 샘플 데이터 생성)
        if (!dm.branches || dm.branches.length === 0) {
            dm.branches = [
                {
                    id: 1,
                    name: '본사',
                    address: '서울특별시 강남구 테헤란로 123',
                    phone: '02-1234-5678',
                    manager: '김대표',
                    description: '본사 건물입니다.',
                    createdAt: '2024-01-01'
                },
                {
                    id: 2,
                    name: '강남점',
                    address: '서울특별시 강남구 역삼동 456',
                    phone: '02-2345-6789',
                    manager: '이지점장',
                    description: '강남 지점입니다.',
                    createdAt: '2024-01-15'
                },
                {
                    id: 3,
                    name: '부산점',
                    address: '부산광역시 해운대구 우동 789',
                    phone: '051-3456-7890',
                    manager: '박지점장',
                    description: '부산 지점입니다.',
                    createdAt: '2024-02-01'
                }
            ];
            dm.saveData('branches', dm.branches);
        }

        // 이벤트 리스너 등록
        document.getElementById('addBranchBtn').addEventListener('click', addBranch);
        document.getElementById('searchBranch').addEventListener('input', refreshBranchList);
        document.getElementById('branchForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            saveBranch(data);
        });
        document.getElementById('closeModal').addEventListener('click', closeModal);
        document.getElementById('cancelBtn').addEventListener('click', closeModal);

        // 모달 외부 클릭 시 닫기
        document.getElementById('branchModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });

        // 로그아웃 처리
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', function(e) {
                e.preventDefault();
                if (confirm('정말 로그아웃하시겠습니까?')) {
                    window.authManager.logout();
                    location.href = 'login.html';
                }
            });
        }

        // 초기 목록 렌더링
        refreshBranchList();
    });
})();

// 연차승인 스크립트 - 일괄선택 기능 추가 (이벤트 충돌 해결 버전)
(function(){
  let dm;
  let selectedItems = new Set(); // 선택된 항목 ID를 저장하는 Set
  
  function render(list){
    const wrap=document.getElementById('approvalList');
    if(!wrap) return;
    if(list.length===0){ 
      wrap.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>검색 조건에 맞는 신청이 없습니다.</p></div>'; 
      return; 
    }
    wrap.innerHTML = list.map(r=>{
      const employee = dm.employees.find(emp => emp.id === r.employeeId);
      const branch = employee ? employee.branch : '알 수 없음';
      const isSelected = selectedItems.has(r.id); // 현재 항목이 선택되었는지 확인
      return `
        <div class="approval-item ${isSelected ? 'selected' : ''}" data-id="${r.id}">
          <input type="checkbox" class="item-checkbox" ${isSelected ? 'checked' : ''} data-id="${r.id}">
          <div>
            <div><strong>${r.employeeName}</strong> <span class="status-badge ${r.status}">${statusText(r.status)}</span> <span class="approval-branch">${branch}</span></div>
            <div class="approval-meta">기간: ${r.startDate} ~ ${r.endDate} (${r.days}일)  신청일: ${r.requestDate || '-'}</div>
            <div class="approval-meta">사유: ${r.reason || '-'}</div>
          </div>
          <div class="approval-actions">
            ${r.status==='pending' ? `
              <button class="btn-small btn-approve" data-act="approve" data-id="${r.id}"><i class="fas fa-check"></i> 승인</button>
              <button class="btn-small btn-reject" data-act="reject" data-id="${r.id}"><i class="fas fa-times"></i> 거부</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
    updateBulkButtons(); // 렌더링 후 일괄 버튼 상태 업데이트
  }
  
  function statusText(s){return s==='pending'?'대기중':s==='approved'?'승인됨':s==='rejected'?'거부됨':s}
  
  function getFiltered(){
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const branchFilter = document.getElementById('branchFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const reqs = dm.leaveRequests || [];
    
    return reqs.filter(r => {
      const employee = dm.employees.find(emp => emp.id === r.employeeId);
      const branch = employee ? employee.branch : '';
      
      const matchesSearch = !searchTerm || r.employeeName.toLowerCase().includes(searchTerm);
      const matchesBranch = branchFilter === 'all' || branch === branchFilter;
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      
      return matchesSearch && matchesBranch && matchesStatus;
    });
  }
  
  function updateBulkButtons(){
    const pendingSelected = Array.from(selectedItems).filter(id => {
      const req = dm.leaveRequests.find(r => r.id === id);
      return req && req.status === 'pending';
    });

    document.getElementById('bulkApprove').disabled = pendingSelected.length === 0;
    document.getElementById('bulkReject').disabled = pendingSelected.length === 0;
    document.getElementById('selectedCount').textContent = `선택된 항목: ${selectedItems.size}개`;       
    
    // 전체 선택 체크박스 상태 업데이트
    const filteredList = getFiltered();
    const pendingList = filteredList.filter(r => r.status === 'pending');
    const selectedPending = pendingList.filter(r => selectedItems.has(r.id));

    const selectAllCheckbox = document.getElementById('selectAll');
    selectAllCheckbox.disabled = pendingList.length === 0;
    if(pendingList.length === 0){
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if(selectedPending.length === 0){
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if(selectedPending.length === pendingList.length){
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
    }
  }
  
  function refresh(){ render(getFiltered()); }
  
  // 개별 항목 클릭 처리 (승인/거부 버튼, 체크박스)
  function handleItemClick(e){
    const t=e.target.closest('button');
    if(t){
      const id=Number(t.getAttribute('data-id'));
      const act=t.getAttribute('data-act');
      if(act==='approve' && confirm('승인하시겠습니까?')){
        dm.updateLeaveRequestStatus(id,'approved');
        selectedItems.delete(id); // 개별 처리 후 선택 해제
        refresh();
      }
      if(act==='reject' && confirm('거부하시겠습니까?')){
        dm.updateLeaveRequestStatus(id,'rejected');
        selectedItems.delete(id); // 개별 처리 후 선택 해제
        refresh();
      }
      return;
    }

    // 체크박스 클릭 처리
    const checkbox = e.target.closest('.item-checkbox');
    if(checkbox){
      const id = Number(checkbox.getAttribute('data-id'));
      if(checkbox.checked){
        selectedItems.add(id);
      } else {
        selectedItems.delete(id);
      }
      updateBulkButtons();
      refresh(); // 체크박스 상태 반영을 위해 리프레시
      return;
    }
  }

  // 전체 선택 체크박스 처리
  function handleSelectAll(e){
    const filteredList = getFiltered();
    const pendingList = filteredList.filter(r => r.status === 'pending'); // 대기중인 항목만 선택 대상

    if(e.target.checked){
      pendingList.forEach(r => selectedItems.add(r.id));
    } else {
      pendingList.forEach(r => selectedItems.delete(r.id));
    }
    updateBulkButtons();
    refresh();
  }

  // 일괄 승인 처리
  function handleBulkApprove(e){
    e.preventDefault();
    e.stopPropagation();
    console.log('일괄승인 버튼 클릭됨!');
    
    // 선택된 항목들만 가져오기
    const selectedCheckboxes = document.querySelectorAll('.item-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => Number(cb.getAttribute('data-id')));
    
    console.log('선택된 항목 ID들:', selectedIds);
    
    if(selectedIds.length === 0) {
      alert('선택된 항목이 없습니다.');
      return;
    }
    
    // 선택된 항목 중 대기중인 것만 필터링
    const selectedPendingRequests = dm.leaveRequests.filter(req => 
      selectedIds.includes(req.id) && req.status === 'pending'
    );
    
    console.log('선택된 대기중인 요청들:', selectedPendingRequests);
    
    if(selectedPendingRequests.length === 0) {
      alert('선택된 항목 중 처리할 대기중인 요청이 없습니다.');
      return;
    }
    
    if(confirm(`선택된 ${selectedPendingRequests.length}개 요청을 승인하시겠습니까?`)){
      selectedPendingRequests.forEach(request => {
        dm.updateLeaveRequestStatus(request.id, 'approved');
        selectedItems.delete(request.id);
      });
      refresh();
    }
  }

  // 일괄 거부 처리
  function handleBulkReject(e){
    e.preventDefault();
    e.stopPropagation();
    console.log('일괄거부 버튼 클릭됨!');
    
    // 선택된 항목들만 가져오기
    const selectedCheckboxes = document.querySelectorAll('.item-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => Number(cb.getAttribute('data-id')));
    
    console.log('선택된 항목 ID들:', selectedIds);
    
    if(selectedIds.length === 0) {
      alert('선택된 항목이 없습니다.');
      return;
    }
    
    // 선택된 항목 중 대기중인 것만 필터링
    const selectedPendingRequests = dm.leaveRequests.filter(req => 
      selectedIds.includes(req.id) && req.status === 'pending'
    );
    
    console.log('선택된 대기중인 요청들:', selectedPendingRequests);
    
    if(selectedPendingRequests.length === 0) {
      alert('선택된 항목 중 처리할 대기중인 요청이 없습니다.');
      return;
    }
    
    if(confirm(`선택된 ${selectedPendingRequests.length}개 요청을 거부하시겠습니까?`)){
      selectedPendingRequests.forEach(request => {
        dm.updateLeaveRequestStatus(request.id, 'rejected');
        selectedItems.delete(request.id);
      });
      refresh();
    }
  }
  
  window.addEventListener('DOMContentLoaded', function(){
    if(!window.AuthGuard || !AuthGuard.checkAuth()) return;
    dm = window.dataManager || new DataManager(); 
    window.dataManager = dm;

    // 이벤트 리스너 설정 - 각각 분리된 핸들러 사용
    document.getElementById('searchInput').addEventListener('input', refresh);
    document.getElementById('branchFilter').addEventListener('change', refresh);
    document.getElementById('statusFilter').addEventListener('change', refresh);
    document.getElementById('approvalList').addEventListener('click', handleItemClick);
    document.getElementById('selectAll').addEventListener('change', handleSelectAll);
    document.getElementById('bulkApprove').addEventListener('click', handleBulkApprove);
    document.getElementById('bulkReject').addEventListener('click', handleBulkReject);

    const logout=document.getElementById('logout-link');
    if(logout){
      logout.addEventListener('click', function(e){
        e.preventDefault();
        if(confirm('정말 로그아웃하시겠습니까?')){
          window.authManager.logout();
          location.href='login.html';
        }
      });
    }
    refresh();
  });
})();

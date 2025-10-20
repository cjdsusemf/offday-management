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
      const employee = resolveEmployee(r);
      const branch = employee ? (employee.branch || '-') : '-';
      const department = employee ? (employee.department || '-') : '-';
      const isSelected = selectedItems.has(r.id); // 현재 항목이 선택되었는지 확인
      return `
        <div class="approval-item ${isSelected ? 'selected' : ''}" data-id="${r.id}">
          <input type="checkbox" class="item-checkbox" ${isSelected ? 'checked' : ''} data-id="${r.id}">
          <div>
            <div><strong>${r.employeeName}</strong> <span class="status-badge ${r.status}">${statusText(r.status)}</span> <span class="approval-branch">${branch}</span> <span class="approval-dept">${department}</span></div>
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
      const employee = resolveEmployee(r);
      const branch = employee ? (employee.branch || '') : '';
      
      const matchesSearch = !searchTerm || r.employeeName.toLowerCase().includes(searchTerm);
      const matchesBranch = branchFilter === 'all' || branch === branchFilter;
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      
      return matchesSearch && matchesBranch && matchesStatus;
    });
  }

  // 직원 정보 해석 (employeeId/userId/이름 기준 모두 시도)
  function resolveEmployee(request){
    if (!dm) return null;
    // 1) employeeId가 직원 ID인 경우
    let emp = dm.employees.find(e => e.id === request.employeeId);
    if (emp) return emp;
    // 2) employeeId가 사용자 ID인 경우 -> 사용자 이메일로 직원 찾기
    if (dm.users) {
      const user = dm.users.find(u => u.id === request.employeeId || u.email === request.employeeName);
      if (user) {
        emp = dm.employees.find(e => e.email === user.email);
        if (emp) return emp;
      }
    }
    // 3) 이름으로 매칭 (동명이인 가능하므로 마지막 수단)
    emp = dm.employees.find(e => e.name === request.employeeName);
    return emp || null;
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

  // 템플릿 다운로드(CSV)
  function downloadTemplate(){
    const header = ['email','startDate','endDate','days','type','reason'];
    const example = ['user@example.com','2025-01-10','2025-01-12','3','vacation','가족 행사'];
    const csv = [header.join(','), example.join(',')].join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'leave_template.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 엑셀/CSV 업로드 파서(간단 CSV 지원)
  function parseCSV(text){
    const lines = text.trim().split(/\r?\n/);
    const header = lines.shift().split(',').map(h=>h.trim());
    return lines.map(line => {
      const cols = line.split(',').map(c=>c.trim());
      const row = {}; header.forEach((h,i)=>row[h]=cols[i]||'');
      return row;
    });
  }

  function handleExcelUpload(file){
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      const rows = parseCSV(text);
      let added = 0; let skipped = 0;
      rows.forEach(row => {
        const email = row.email; const employee = dm.employees.find(e=>e.email===email);
        if(!employee){ skipped++; return; }
        // 기본 검증
        if(!row.startDate || !row.endDate || !row.days || !row.type){ skipped++; return; }
        const req = {
          id: Date.now()+Math.floor(Math.random()*10000),
          employeeId: employee.id,
          employeeName: employee.name || email,
          startDate: row.startDate,
          endDate: row.endDate,
          days: parseFloat(row.days),
          type: row.type,
          reason: row.reason || '',
          status: 'pending',
          requestDate: new Date().toISOString().split('T')[0]
        };
        dm.leaveRequests.push(req); added++;
      });
      dm.saveData('leaveRequests', dm.leaveRequests);
      alert(`업로드 완료: 추가 ${added}건, 건너뜀 ${skipped}건`);
      refresh();
    };
    reader.readAsText(file, 'utf-8');
  }
  
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

    // 템플릿 다운로드
    const btnTpl = document.getElementById('btnDownloadTemplate');
    if(btnTpl) btnTpl.addEventListener('click', downloadTemplate);

    // 엑셀 업로드
    const excelInput = document.getElementById('excelUpload');
    if(excelInput) excelInput.addEventListener('change', (e)=>{ if(e.target.files[0]) handleExcelUpload(e.target.files[0]); });

    // 연차 등록 모달
    const btnAdd = document.getElementById('btnAddRequest');
    const modal = document.getElementById('adminAddModal');
    const closeBtn = document.getElementById('adminAddClose');
    const cancelBtn = document.getElementById('adminAddCancel');
    const form = document.getElementById('adminAddForm');

    function closeModal(){ if(modal){ modal.style.display='none'; document.body.style.overflow='auto'; } }

    if(btnAdd && modal){
      btnAdd.addEventListener('click', ()=>{ modal.style.display='block'; document.body.style.overflow='hidden'; });
    }
    if(closeBtn) closeBtn.addEventListener('click', closeModal);
    if(cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // 모달 내 일수 자동 계산 및 사유 토글
    const admStart = document.getElementById('adm-start');
    const admEnd = document.getElementById('adm-end');
    const admDays = document.getElementById('adm-days');
    const admType = document.getElementById('adm-type');
    const admReason = document.getElementById('adm-reason');
    const admReasonGroup = document.getElementById('adm-reason-group');

    function calcAdmDays(){
      if(!admStart.value || !admEnd.value) return;
      const s=new Date(admStart.value); const e=new Date(admEnd.value);
      if(s>e) return; const diff=(e-s)/(1000*60*60*24)+1; admDays.value = diff;
    }
    if(admStart) admStart.addEventListener('change', calcAdmDays);
    if(admEnd) admEnd.addEventListener('change', calcAdmDays);
    function toggleAdmReason(){ const isOther = admType.value==='other'; admReasonGroup.style.display=isOther?'':'none'; admReason.disabled=!isOther; if(!isOther) admReason.value=''; }
    if(admType){ toggleAdmReason(); admType.addEventListener('change', toggleAdmReason); }

    if(form){
      form.addEventListener('submit', (e)=>{
        e.preventDefault();
        const email = document.getElementById('adm-email').value.trim();
        const emp = dm.employees.find(emp=>emp.email===email);
        if(!emp){ alert('직원 이메일을 찾을 수 없습니다.'); return; }
        if(!admStart.value || !admEnd.value || !admDays.value){ alert('날짜/일수 입력을 확인해주세요.'); return; }
        const req = {
          id: Date.now()+Math.floor(Math.random()*10000),
          employeeId: emp.id,
          employeeName: emp.name || email,
          startDate: admStart.value,
          endDate: admEnd.value,
          days: parseFloat(admDays.value),
          type: admType.value,
          reason: admType.value==='other' ? (admReason.value || '') : '',
          status: 'pending',
          requestDate: new Date().toISOString().split('T')[0]
        };
        dm.leaveRequests.push(req); dm.saveData('leaveRequests', dm.leaveRequests);
        alert('연차 신청이 등록되었습니다.');
        closeModal(); refresh();
      });
    }

    // 로그아웃 처리는 auth.js에서 전역으로 처리됨
    refresh();
  });
})();

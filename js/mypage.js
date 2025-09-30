// 마이페이지 JavaScript 기능
document.addEventListener('DOMContentLoaded', function() {
    // 인증 확인
    if (!checkAuth()) {
        window.location.href = 'login.html';
        return;
    }

    // 초기화
    initializeMyPage();
    loadUserProfile();
    loadLeaveInfo();
    loadLeaveHistory();
    setupEventListeners();
});

// 마이페이지 초기화
function initializeMyPage() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = currentUser.name || '사용자';
        }
    }
}

// 사용자 프로필 로드
function loadUserProfile() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // 프로필 정보 표시
    document.getElementById('displayName').textContent = currentUser.name || '-';
    document.getElementById('displayDepartment').textContent = currentUser.department || '-';
    document.getElementById('displayPosition').textContent = currentUser.position || '-';
    document.getElementById('displayHireDate').textContent = formatDate(currentUser.joindate) || '-';

    // 프로필 이미지 로드
    loadProfileImage(currentUser.profileImage);

    // 폼에 현재 정보 채우기
    fillEditForm(currentUser);
}

// 프로필 이미지 로드
function loadProfileImage(imageUrl) {
    const profileImg = document.getElementById('profileImg');
    const defaultAvatar = document.getElementById('defaultAvatar');
    
    if (imageUrl && imageUrl.trim() !== '') {
        profileImg.src = imageUrl;
        profileImg.style.display = 'block';
        defaultAvatar.style.display = 'none';
    } else {
        profileImg.style.display = 'none';
        defaultAvatar.style.display = 'block';
    }
}

// 편집 폼에 현재 정보 채우기
function fillEditForm(user) {
    document.getElementById('editName').value = user.name || '';
    document.getElementById('editEmail').value = user.email || '';
    document.getElementById('editPhone').value = user.phone || '';
    document.getElementById('editDepartment').value = user.department || '';
    document.getElementById('editPosition').value = user.position || '';
    document.getElementById('editHireDate').value = user.joindate || '';
    document.getElementById('editAddress').value = user.address || '';
    document.getElementById('editBirthDate').value = user.birthdate || '';
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 프로필 이미지 업로드
    const imageUpload = document.getElementById('imageUpload');
    imageUpload.addEventListener('change', handleImageUpload);

    // 개인정보 폼 제출
    const personalInfoForm = document.getElementById('personalInfoForm');
    personalInfoForm.addEventListener('submit', handlePersonalInfoSubmit);

    // 비밀번호 변경 폼 제출
    const passwordForm = document.getElementById('passwordForm');
    passwordForm.addEventListener('submit', handlePasswordChange);

    // 로그아웃 버튼
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', handleLogout);
    }
}

// 이미지 업로드 처리
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 파일 크기 확인 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('파일 크기는 5MB 이하여야 합니다.', 'error');
        return;
    }

    // 이미지 파일인지 확인
    if (!file.type.startsWith('image/')) {
        showNotification('이미지 파일만 업로드 가능합니다.', 'error');
        return;
    }

    // 이미지 미리보기
    const reader = new FileReader();
    reader.onload = function(e) {
        const profileImg = document.getElementById('profileImg');
        const defaultAvatar = document.getElementById('defaultAvatar');
        
        profileImg.src = e.target.result;
        profileImg.style.display = 'block';
        defaultAvatar.style.display = 'none';

        // 사용자 정보 업데이트
        updateUserProfileImage(e.target.result);
    };
    reader.readAsDataURL(file);
}

// 프로필 이미지 업데이트
function updateUserProfileImage(imageData) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // 로컬 스토리지에서 사용자 정보 업데이트
    currentUser.profileImage = imageData;
    updateUserInStorage(currentUser);
    
    showNotification('프로필 이미지가 업데이트되었습니다.', 'success');
}

// 프로필 이미지 삭제
function removeProfileImage() {
    if (!confirm('프로필 이미지를 삭제하시겠습니까?')) return;

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // 이미지 제거
    currentUser.profileImage = '';
    updateUserInStorage(currentUser);

    // UI 업데이트
    const profileImg = document.getElementById('profileImg');
    const defaultAvatar = document.getElementById('defaultAvatar');
    
    profileImg.style.display = 'none';
    defaultAvatar.style.display = 'block';

    showNotification('프로필 이미지가 삭제되었습니다.', 'success');
}

// 편집 모드 토글
function toggleEditMode() {
    const form = document.getElementById('personalInfoForm');
    const editBtn = document.getElementById('editInfoBtn');
    
    if (form.style.display === 'none' || form.style.display === '') {
        form.style.display = 'block';
        editBtn.innerHTML = '<i class="fas fa-eye"></i> 정보 보기';
    } else {
        form.style.display = 'none';
        editBtn.innerHTML = '<i class="fas fa-edit"></i> 정보 수정';
    }
}

// 편집 취소
function cancelEdit() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        fillEditForm(currentUser);
    }
    toggleEditMode();
}

// 개인정보 폼 제출 처리
function handlePersonalInfoSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userData = {};
    
    // 폼 데이터 수집
    for (let [key, value] of formData.entries()) {
        userData[key] = value;
    }

    // 유효성 검사
    if (!validatePersonalInfo(userData)) {
        return;
    }

    // 사용자 정보 업데이트
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // 정보 업데이트
    Object.assign(currentUser, userData);
    updateUserInStorage(currentUser);

    // UI 업데이트
    loadUserProfile();
    toggleEditMode();

    showNotification('개인정보가 성공적으로 업데이트되었습니다.', 'success');
}

// 개인정보 유효성 검사
function validatePersonalInfo(data) {
    if (!data.name || data.name.trim() === '') {
        showNotification('이름을 입력해주세요.', 'error');
        return false;
    }

    if (!data.email || data.email.trim() === '') {
        showNotification('이메일을 입력해주세요.', 'error');
        return false;
    }

    if (!isValidEmail(data.email)) {
        showNotification('올바른 이메일 형식을 입력해주세요.', 'error');
        return false;
    }

    if (!data.phone || data.phone.trim() === '') {
        showNotification('전화번호를 입력해주세요.', 'error');
        return false;
    }

    if (!data.department || data.department.trim() === '') {
        showNotification('부서를 선택해주세요.', 'error');
        return false;
    }

    if (!data.position || data.position.trim() === '') {
        showNotification('직급을 선택해주세요.', 'error');
        return false;
    }

    if (!data.hireDate || data.hireDate.trim() === '') {
        showNotification('입사일을 입력해주세요.', 'error');
        return false;
    }

    return true;
}

// 비밀번호 변경 처리
function handlePasswordChange(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // 유효성 검사
    if (!validatePasswordChange(currentPassword, newPassword, confirmPassword)) {
        return;
    }

    // 현재 사용자 확인
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // 현재 비밀번호 확인
    if (currentUser.password !== currentPassword) {
        showNotification('현재 비밀번호가 올바르지 않습니다.', 'error');
        return;
    }

    // 비밀번호 업데이트
    currentUser.password = newPassword;
    updateUserInStorage(currentUser);

    // 폼 초기화
    event.target.reset();

    showNotification('비밀번호가 성공적으로 변경되었습니다.', 'success');
}

// 비밀번호 변경 유효성 검사
function validatePasswordChange(currentPassword, newPassword, confirmPassword) {
    if (!currentPassword || currentPassword.trim() === '') {
        showNotification('현재 비밀번호를 입력해주세요.', 'error');
        return false;
    }

    if (!newPassword || newPassword.trim() === '') {
        showNotification('새 비밀번호를 입력해주세요.', 'error');
        return false;
    }

    if (newPassword.length < 6) {
        showNotification('새 비밀번호는 6자 이상이어야 합니다.', 'error');
        return false;
    }

    if (newPassword !== confirmPassword) {
        showNotification('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.', 'error');
        return false;
    }

    if (currentPassword === newPassword) {
        showNotification('새 비밀번호는 현재 비밀번호와 달라야 합니다.', 'error');
        return false;
    }

    return true;
}

// 휴가 정보 로드
function loadLeaveInfo() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // 연차 계산 (입사일 기준)
    const hireDate = new Date(currentUser.joindate);
    const currentDate = new Date();
    const yearsWorked = Math.floor((currentDate - hireDate) / (365.25 * 24 * 60 * 60 * 1000));
    
    // 기본 연차 (1년차: 15일, 2년차 이상: 15일 + (근속년수-1)일, 최대 25일)
    const totalLeave = Math.min(15 + Math.max(0, yearsWorked - 1), 25);
    
    // 사용한 연차 (실제 데이터가 없으므로 임시로 0)
    const usedLeave = currentUser.usedLeave || 0;
    const remainingLeave = totalLeave - usedLeave;

    // UI 업데이트
    document.getElementById('totalLeave').textContent = totalLeave + '일';
    document.getElementById('usedLeave').textContent = usedLeave + '일';
    document.getElementById('remainingLeave').textContent = remainingLeave + '일';
}

// 휴가 신청 내역 로드
function loadLeaveHistory() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // 로컬 스토리지에서 휴가 신청 내역 가져오기
    const leaveRequests = JSON.parse(localStorage.getItem('leaveRequests') || '[]');
    const userLeaveRequests = leaveRequests.filter(request => request.employeeId === currentUser.id);

    const leaveHistoryContainer = document.getElementById('leaveHistory');
    
    if (userLeaveRequests.length === 0) {
        leaveHistoryContainer.innerHTML = '<div class="no-data">휴가 신청 내역이 없습니다.</div>';
        return;
    }

    // 최근 5개만 표시
    const recentRequests = userLeaveRequests.slice(-5).reverse();
    
    let historyHTML = '';
    recentRequests.forEach(request => {
        const statusClass = getStatusClass(request.status);
        const statusText = getStatusText(request.status);
        
        historyHTML += `
            <div class="leave-history-item">
                <div class="leave-info">
                    <div class="leave-type"></div>
                    <div class="leave-dates"> ~ </div>
                    <div class="leave-days">일</div>
                </div>
                <div class="leave-status "></div>
            </div>
        `;
    });

    leaveHistoryContainer.innerHTML = historyHTML;
}

// 상태에 따른 CSS 클래스 반환
function getStatusClass(status) {
    switch (status) {
        case 'approved': return 'status-approved';
        case 'pending': return 'status-pending';
        case 'rejected': return 'status-rejected';
        default: return 'status-pending';
    }
}

// 상태 텍스트 반환
function getStatusText(status) {
    switch (status) {
        case 'approved': return '승인됨';
        case 'pending': return '대기중';
        case 'rejected': return '거부됨';
        default: return '대기중';
    }
}

// 로그아웃 처리
function handleLogout(event) {
    event.preventDefault();
    
    if (confirm('로그아웃 하시겠습니까?')) {
        AuthGuard.logout();
    }
}

// 유틸리티 함수들
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const messageElement = document.getElementById('notificationMessage');
    
    messageElement.textContent = message;
    notification.className = `notification ${type} show`;

    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function hideNotification() {
    const notification = document.getElementById('notification');
    notification.classList.remove('show');
}

// 전역 함수들 (HTML에서 호출)
window.removeProfileImage = removeProfileImage;
window.toggleEditMode = toggleEditMode;
window.cancelEdit = cancelEdit;
window.hideNotification = hideNotification;



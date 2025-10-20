// 메인관리 스크립트
(function(){
  function openModal(title, body){
    var modal=document.getElementById('mm-modal');
    if(!modal) return;
    document.getElementById('mm-modal-title').textContent=title;
    document.getElementById('mm-modal-body').textContent=body;
    modal.style.display='block';
  }
  function closeModal(){
    var modal=document.getElementById('mm-modal');
    if(modal) modal.style.display='none';
  }
  window.addEventListener('DOMContentLoaded', function(){
    if (!window.AuthGuard || !AuthGuard.checkAuth()) return;

    // 로그아웃 처리는 auth.js에서 전역으로 처리됨

    // 지점관리 링크는 이제 branch-management.html로 직접 이동하므로 모달 제거

    // 연차승인 링크는 이제 approval.html로 직접 이동하므로 모달 제거

    var closeBtn=document.getElementById('mm-modal-close');
    if(closeBtn){
      closeBtn.addEventListener('click', function(){ closeModal(); });
    }

    window.addEventListener('click', function(e){
      var modal=document.getElementById('mm-modal');
      if(e.target===modal){ closeModal(); }
    });
  });
})();

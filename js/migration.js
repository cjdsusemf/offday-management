// offday_users와 employees 테이블 통합 마이그레이션 스크립트
// 사용법: 브라우저 콘솔에서 migrateToUnifiedUsers() 실행

(function() {
    'use strict';
    
    window.migrateToUnifiedUsers = function() {
        console.log('🔄 테이블 통합 마이그레이션 시작...');
        
        try {
            // 1단계: 기존 데이터 로드
            const oldUsers = JSON.parse(localStorage.getItem('offday_users') || '[]');
            const oldEmployees = JSON.parse(localStorage.getItem('employees') || '[]');
            
            console.log('📊 기존 데이터:', {
                users: oldUsers.length,
                employees: oldEmployees.length
            });
            
            // 2단계: 백업 생성
            const backupData = {
                offday_users: oldUsers,
                employees: oldEmployees,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('_backup_before_merge', JSON.stringify(backupData));
            console.log('💾 백업 완료');
            
            // 3단계: 데이터 병합
            const mergedUsers = [];
            const processedEmails = new Set();
            
            // 사용자 계정 기준으로 병합 (users 우선)
            oldUsers.forEach(user => {
                const employee = oldEmployees.find(e => e.email === user.email);
                
                const mergedUser = {
                    // === 인증 정보 (users 우선) ===
                    id: user.id,
                    username: user.username,
                    password: user.password,
                    role: user.role || 'user',
                    
                    // === 개인 정보 (employee가 있으면 우선, 없으면 user) ===
                    name: employee?.name || user.name,
                    email: user.email,
                    phone: employee?.phone || user.phone || '',
                    birthDate: employee?.birthDate || user.birthdate || '',
                    profileImage: user.profileImage || '',
                    
                    // === 회사 정보 (employee 우선) ===
                    branch: employee?.branch || user.branch || '',
                    branchId: employee?.branchId || null,
                    department: employee?.department || user.department || '',
                    team: employee?.team || employee?.department || user.department || '',
                    position: employee?.position || user.position || '',
                    hireDate: employee?.hireDate || user.joindate || '',
                    
                    // === 연차 정보 (employee만 가지고 있음) ===
                    annualLeaveDays: employee?.annualLeaveDays || 15,
                    usedLeaveDays: employee?.usedLeaveDays || 0,
                    remainingLeaveDays: employee?.remainingLeaveDays || 15,
                    welfareLeaveDays: employee?.welfareLeaveDays || 0,
                    
                    // === 상태 정보 ===
                    status: employee?.status || 'active',
                    resignationDate: employee?.resignationDate || null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    deletedAt: null
                };
                
                mergedUsers.push(mergedUser);
                processedEmails.add(user.email);
                
                console.log('✅ 병합 완료:', user.email);
            });
            
            // 직원 데이터만 있고 사용자 계정이 없는 경우 추가
            oldEmployees.forEach(employee => {
                if (!processedEmails.has(employee.email)) {
                    const mergedUser = {
                        // === 인증 정보 (새로 생성) ===
                        id: String(employee.id),
                        username: employee.email,
                        password: null, // 비밀번호 없음 (관리자가 설정 필요)
                        role: 'user',
                        
                        // === 개인 정보 ===
                        name: employee.name,
                        email: employee.email,
                        phone: employee.phone || '',
                        birthDate: employee.birthDate || '',
                        profileImage: '',
                        
                        // === 회사 정보 ===
                        branch: employee.branch || '',
                        branchId: employee.branchId || null,
                        department: employee.department || '',
                        team: employee.team || employee.department || '',
                        position: employee.position || '',
                        hireDate: employee.hireDate || '',
                        
                        // === 연차 정보 ===
                        annualLeaveDays: employee.annualLeaveDays || 15,
                        usedLeaveDays: employee.usedLeaveDays || 0,
                        remainingLeaveDays: employee.remainingLeaveDays || 15,
                        welfareLeaveDays: employee.welfareLeaveDays || 0,
                        
                        // === 상태 정보 ===
                        status: employee.status || 'active',
                        resignationDate: employee.resignationDate || null,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        deletedAt: null
                    };
                    
                    mergedUsers.push(mergedUser);
                    console.log('⚠️ 사용자 계정 없는 직원 추가:', employee.email);
                }
            });
            
            // 4단계: 새로운 users 테이블 저장
            localStorage.setItem('users', JSON.stringify(mergedUsers));
            console.log('💾 통합 users 테이블 저장 완료:', mergedUsers.length, '명');
            
            // 5단계: 기존 테이블 백업 후 삭제
            localStorage.setItem('_old_offday_users', localStorage.getItem('offday_users'));
            localStorage.setItem('_old_employees', localStorage.getItem('employees'));
            localStorage.removeItem('offday_users');
            localStorage.removeItem('employees');
            
            console.log('🗑️ 기존 테이블 삭제 완료 (백업은 _old_ 접두사로 보관)');
            
            // 6단계: 삭제된 사용자 데이터 통합
            const deletedUsers = JSON.parse(localStorage.getItem('deletedUsers') || '[]');
            const deletedEmployees = JSON.parse(localStorage.getItem('deletedEmployees') || '[]');
            
            const mergedDeleted = [];
            const processedDeletedEmails = new Set();
            
            deletedUsers.forEach(deleted => {
                mergedDeleted.push(deleted);
                processedDeletedEmails.add(deleted.email);
            });
            
            deletedEmployees.forEach(deleted => {
                if (!processedDeletedEmails.has(deleted.email)) {
                    mergedDeleted.push(deleted);
                }
            });
            
            localStorage.setItem('deletedUsers', JSON.stringify(mergedDeleted));
            localStorage.removeItem('deletedEmployees');
            
            console.log('✅ 삭제된 사용자 데이터 통합 완료');
            
            // 7단계: 현재 로그인 사용자 유지
            const currentUserId = localStorage.getItem('offday_current_user');
            if (currentUserId) {
                const currentUser = mergedUsers.find(u => u.id === currentUserId);
                if (currentUser) {
                    localStorage.setItem('current_user', currentUserId);
                    console.log('✅ 현재 로그인 사용자 유지:', currentUser.email);
                }
            }
            localStorage.removeItem('offday_current_user');
            
            // 8단계: 마이그레이션 완료 플래그 설정
            localStorage.setItem('migration_completed', 'true');
            localStorage.setItem('migration_date', new Date().toISOString());
            
            console.log('✅ 마이그레이션 완료!');
            console.log('📊 최종 결과:', {
                통합된_사용자: mergedUsers.length,
                삭제된_사용자: mergedDeleted.length
            });
            
            alert('✅ 테이블 통합이 완료되었습니다!\n페이지를 새로고침해주세요.');
            
            return {
                success: true,
                totalUsers: mergedUsers.length,
                deletedUsers: mergedDeleted.length
            };
            
        } catch (error) {
            console.error('❌ 마이그레이션 오류:', error);
            alert('❌ 마이그레이션 중 오류가 발생했습니다.\n콘솔을 확인해주세요.');
            return {
                success: false,
                error: error.message
            };
        }
    };
    
    // 롤백 함수
    window.rollbackMigration = function() {
        console.log('🔄 마이그레이션 롤백 시작...');
        
        try {
            const backup = localStorage.getItem('_backup_before_merge');
            if (!backup) {
                console.error('❌ 백업 데이터를 찾을 수 없습니다.');
                alert('백업 데이터를 찾을 수 없습니다.');
                return false;
            }
            
            const backupData = JSON.parse(backup);
            
            // 백업 데이터 복원
            localStorage.setItem('offday_users', JSON.stringify(backupData.offday_users));
            localStorage.setItem('employees', JSON.stringify(backupData.employees));
            
            // 새로운 테이블 삭제
            localStorage.removeItem('users');
            localStorage.removeItem('current_user');
            
            // 플래그 제거
            localStorage.removeItem('migration_completed');
            localStorage.removeItem('migration_date');
            
            console.log('✅ 롤백 완료!');
            alert('✅ 롤백이 완료되었습니다.\n페이지를 새로고침해주세요.');
            
            return true;
        } catch (error) {
            console.error('❌ 롤백 오류:', error);
            alert('❌ 롤백 중 오류가 발생했습니다.');
            return false;
        }
    };
    
    console.log('📋 마이그레이션 스크립트 로드 완료');
    console.log('사용법:');
    console.log('  - 마이그레이션 실행: migrateToUnifiedUsers()');
    console.log('  - 롤백: rollbackMigration()');
})();


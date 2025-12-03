// Users 테이블에 roleId 추가 마이그레이션
// 기존 role 문자열을 roleId로 매핑

(function() {
    'use strict';
    
    window.migrateUsersToRoleId = function() {
        console.log('🔄 Users 테이블 roleId 마이그레이션 시작...');
        
        try {
            // roleManager가 로드되었는지 확인
            if (typeof window.roleManager === 'undefined') {
                throw new Error('RoleManager가 로드되지 않았습니다. role-manager.js를 먼저 로드해주세요.');
            }
            
            // 1단계: 기존 users 데이터 로드
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            
            if (users.length === 0) {
                console.log('⚠️ 사용자 데이터가 없습니다.');
                return {
                    success: true,
                    message: '마이그레이션할 사용자가 없습니다.',
                    migrated: 0
                };
            }
            
            console.log('📊 기존 사용자:', users.length, '명');
            
            // 2단계: 백업 생성
            const backupData = {
                users: users,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('_backup_before_role_migration', JSON.stringify(backupData));
            console.log('💾 백업 완료');
            
            // 3단계: 역할 매핑
            const roleMapping = {
                'admin': 1,
                'manager': 2,
                'team_leader': 3,
                'user': 4
            };
            
            let migratedCount = 0;
            let alreadyMigrated = 0;
            
            // 4단계: 각 사용자에게 roleId 추가
            users.forEach(user => {
                // 이미 roleId가 있으면 스킵
                if (user.roleId) {
                    alreadyMigrated++;
                    return;
                }
                
                // role 문자열을 roleId로 변환
                const roleName = user.role || 'user'; // 기본값: user
                const roleId = roleMapping[roleName] || 4; // 기본값: 4 (user)
                
                user.roleId = roleId;
                user.updatedAt = new Date().toISOString();
                
                // role 문자열은 유지 (하위 호환성)
                if (!user.role) {
                    user.role = roleName;
                }
                
                migratedCount++;
                console.log(`✅ ${user.name} (${user.email}): ${roleName} → roleId ${roleId}`);
            });
            
            // 5단계: 업데이트된 users 저장
            localStorage.setItem('users', JSON.stringify(users));
            
            // 6단계: 마이그레이션 완료 플래그 설정
            localStorage.setItem('role_migration_completed', 'true');
            localStorage.setItem('role_migration_date', new Date().toISOString());
            
            console.log('✅ 마이그레이션 완료!');
            console.log('📊 최종 결과:', {
                전체_사용자: users.length,
                마이그레이션: migratedCount,
                이미_완료: alreadyMigrated
            });
            
            // 7단계: 검증
            const allHaveRoleId = users.every(u => u.roleId);
            if (!allHaveRoleId) {
                console.warn('⚠️ 일부 사용자에게 roleId가 없습니다.');
            }
            
            alert('✅ Role ID 마이그레이션이 완료되었습니다!\n페이지를 새로고침해주세요.');
            
            return {
                success: true,
                totalUsers: users.length,
                migrated: migratedCount,
                alreadyMigrated: alreadyMigrated
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
    window.rollbackRoleMigration = function() {
        console.log('🔄 Role 마이그레이션 롤백 시작...');
        
        try {
            const backup = localStorage.getItem('_backup_before_role_migration');
            if (!backup) {
                console.error('❌ 백업 데이터를 찾을 수 없습니다.');
                alert('백업 데이터를 찾을 수 없습니다.');
                return false;
            }
            
            const backupData = JSON.parse(backup);
            
            // 백업 데이터 복원
            localStorage.setItem('users', JSON.stringify(backupData.users));
            
            // 플래그 제거
            localStorage.removeItem('role_migration_completed');
            localStorage.removeItem('role_migration_date');
            
            console.log('✅ 롤백 완료!');
            alert('✅ 롤백이 완료되었습니다.\n페이지를 새로고침해주세요.');
            
            return true;
        } catch (error) {
            console.error('❌ 롤백 오류:', error);
            alert('❌ 롤백 중 오류가 발생했습니다.');
            return false;
        }
    };
    
    // 자동 마이그레이션 체크
    window.checkRoleMigration = function() {
        const completed = localStorage.getItem('role_migration_completed');
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        if (!completed && users.length > 0) {
            const needsMigration = users.some(u => !u.roleId);
            if (needsMigration) {
                console.warn('⚠️ Role 마이그레이션이 필요합니다.');
                console.log('실행: migrateUsersToRoleId()');
                return false;
            }
        }
        
        return true;
    };
    
    console.log('📋 Role 마이그레이션 스크립트 로드 완료');
    console.log('사용법:');
    console.log('  - 마이그레이션 실행: migrateUsersToRoleId()');
    console.log('  - 롤백: rollbackRoleMigration()');
    console.log('  - 상태 확인: checkRoleMigration()');
    
    // 페이지 로드 시 자동 체크
    window.addEventListener('DOMContentLoaded', () => {
        window.checkRoleMigration();
    });
})();



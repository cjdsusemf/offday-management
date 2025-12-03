/**
 * Supabase 마이그레이션 스크립트
 * LocalStorage 데이터를 Supabase로 마이그레이션
 */

class SupabaseMigration {
    constructor() {
        this.supabase = window.supabaseClient;
        this.migrationLog = [];
    }

    /**
     * 마이그레이션 로그 추가
     */
    log(message, type = 'info') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type,
            message
        };
        this.migrationLog.push(logEntry);
        console.log(`[Migration ${type.toUpperCase()}]`, message);
    }

    /**
     * 전체 마이그레이션 실행
     */
    async migrateAll() {
        try {
            this.log('=== 마이그레이션 시작 ===');
            
            // 1. Groups 마이그레이션
            await this.migrateGroups();
            
            // 2. Roles 마이그레이션 (이미 스키마에 포함)
            this.log('Roles: 스키마에 기본 데이터 포함됨', 'success');
            
            // 3. Branches 마이그레이션
            await this.migrateBranches();
            
            // 4. Teams 마이그레이션
            await this.migrateTeams();
            
            // 5. Users 마이그레이션
            await this.migrateUsers();
            
            // 6. Leave Requests 마이그레이션
            await this.migrateLeaveRequests();
            
            // 7. Welfare Leave Grants 마이그레이션
            await this.migrateWelfareLeaveGrants();
            
            // 8. Settings 마이그레이션
            await this.migrateSettings();
            
            this.log('=== 마이그레이션 완료 ===', 'success');
            
            return {
                success: true,
                log: this.migrationLog
            };
        } catch (error) {
            this.log(`마이그레이션 실패: ${error.message}`, 'error');
            return {
                success: false,
                error: error.message,
                log: this.migrationLog
            };
        }
    }

    /**
     * Groups 마이그레이션
     */
    async migrateGroups() {
        try {
            this.log('Groups 마이그레이션 시작...');
            
            // 기본 그룹 확인
            const { data: existingGroups, error: checkError } = await this.supabase
                .from('groups')
                .select('id')
                .eq('id', 1);
            
            if (checkError) throw checkError;
            
            if (existingGroups && existingGroups.length > 0) {
                this.log('Groups: 기본 그룹이 이미 존재합니다', 'info');
                return;
            }
            
            // 기본 그룹 생성
            const { error: insertError } = await this.supabase
                .from('groups')
                .insert([
                    { id: 1, name: '기본 그룹', description: '시스템 기본 그룹' }
                ]);
            
            if (insertError) throw insertError;
            
            this.log('Groups: 기본 그룹 생성 완료', 'success');
        } catch (error) {
            this.log(`Groups 마이그레이션 오류: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Branches 마이그레이션
     */
    async migrateBranches() {
        try {
            this.log('Branches 마이그레이션 시작...');
            
            // LocalStorage에서 branches 데이터 가져오기
            const localBranches = JSON.parse(localStorage.getItem('branches') || '[]');
            
            if (localBranches.length === 0) {
                this.log('Branches: 마이그레이션할 데이터 없음', 'warning');
                return;
            }
            
            // Supabase 형식으로 변환
            const supabaseBranches = localBranches.map(branch => ({
                id: branch.id,
                group_id: 1, // 기본 그룹
                name: branch.name,
                address: branch.address || null,
                phone: branch.phone || null,
                manager: branch.manager || null,
                description: branch.description || null,
                departments: branch.departments || [],
                leave_calculation_standard: branch.leaveCalculationStandard || 'hire_date'
            }));
            
            // 배치 삽입
            const { error } = await this.supabase
                .from('branches')
                .upsert(supabaseBranches, { onConflict: 'id' });
            
            if (error) throw error;
            
            this.log(`Branches: ${supabaseBranches.length}개 마이그레이션 완료`, 'success');
        } catch (error) {
            this.log(`Branches 마이그레이션 오류: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Teams 마이그레이션
     */
    async migrateTeams() {
        try {
            this.log('Teams 마이그레이션 시작...');
            
            // LocalStorage에서 branchTeams 데이터 가져오기
            const branchTeams = JSON.parse(localStorage.getItem('branchTeams') || '{}');
            
            if (Object.keys(branchTeams).length === 0) {
                this.log('Teams: 마이그레이션할 데이터 없음', 'warning');
                return;
            }
            
            // Supabase 형식으로 변환
            let teamId = 1;
            const supabaseTeams = [];
            
            for (const [branchId, teams] of Object.entries(branchTeams)) {
                for (const teamName of teams) {
                    supabaseTeams.push({
                        id: teamId++,
                        branch_id: parseInt(branchId),
                        name: teamName
                    });
                }
            }
            
            if (supabaseTeams.length === 0) {
                this.log('Teams: 변환된 데이터 없음', 'warning');
                return;
            }
            
            // 배치 삽입
            const { error } = await this.supabase
                .from('teams')
                .upsert(supabaseTeams, { onConflict: 'id' });
            
            if (error) throw error;
            
            this.log(`Teams: ${supabaseTeams.length}개 마이그레이션 완료`, 'success');
        } catch (error) {
            this.log(`Teams 마이그레이션 오류: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Users 마이그레이션
     */
    async migrateUsers() {
        try {
            this.log('Users 마이그레이션 시작...');
            
            // LocalStorage에서 users 데이터 가져오기
            const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
            
            if (localUsers.length === 0) {
                this.log('Users: 마이그레이션할 데이터 없음', 'warning');
                return;
            }
            
            // 기존 지점명-ID 매핑 가져오기
            const { data: branches } = await this.supabase
                .from('branches')
                .select('id, name');
            
            const branchMap = {};
            branches.forEach(b => {
                branchMap[b.name] = b.id;
            });
            
            // Supabase 형식으로 변환
            const supabaseUsers = [];
            const usersRoles = [];
            
            for (const user of localUsers) {
                // 활성 사용자만 마이그레이션
                if (user.status === 'deleted') continue;
                
                const userId = user.id;
                
                supabaseUsers.push({
                    id: userId,
                    group_id: 1,
                    branch_id: branchMap[user.branch] || user.branchId || null,
                    login_id: user.username || user.id,
                    username: user.username || user.name,
                    password: user.password, // ⚠️ 실제 운영에서는 해시 필요
                    email: user.email,
                    name: user.name,
                    phone: user.phone || null,
                    birth_date: user.birthDate || null,
                    profile_image: user.profileImage || null,
                    branch: user.branch || null,
                    department: user.department || null,
                    team: user.team || null,
                    position: user.position || null,
                    hire_date: user.hireDate || null,
                    resignation_date: user.resignationDate || null,
                    annual_leave_days: user.annualLeaveDays || 15,
                    used_leave_days: user.usedLeaveDays || 0,
                    remaining_leave_days: user.remainingLeaveDays || 15,
                    welfare_leave_days: user.welfareLeaveDays || 0,
                    status: user.status === 'active' ? 1 : 0,
                    created_at: user.createdAt || new Date().toISOString(),
                    updated_at: user.updatedAt || new Date().toISOString()
                });
                
                // 역할 매핑
                const roleId = user.roleId || this.getRoleIdFromRoleName(user.role);
                if (roleId) {
                    usersRoles.push({
                        user_id: userId,
                        role_id: roleId
                    });
                }
            }
            
            // Users 삽입
            const { error: usersError } = await this.supabase
                .from('users')
                .upsert(supabaseUsers, { onConflict: 'id' });
            
            if (usersError) throw usersError;
            
            this.log(`Users: ${supabaseUsers.length}개 마이그레이션 완료`, 'success');
            
            // Users_Roles 삽입
            if (usersRoles.length > 0) {
                const { error: rolesError } = await this.supabase
                    .from('users_roles')
                    .upsert(usersRoles, { onConflict: 'user_id,role_id' });
                
                if (rolesError) throw rolesError;
                
                this.log(`Users_Roles: ${usersRoles.length}개 매핑 완료`, 'success');
            }
        } catch (error) {
            this.log(`Users 마이그레이션 오류: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Leave Requests 마이그레이션
     */
    async migrateLeaveRequests() {
        try {
            this.log('Leave Requests 마이그레이션 시작...');
            
            // LocalStorage에서 leaveRequests 데이터 가져오기
            const localRequests = JSON.parse(localStorage.getItem('leaveRequests') || '[]');
            
            if (localRequests.length === 0) {
                this.log('Leave Requests: 마이그레이션할 데이터 없음', 'warning');
                return;
            }
            
            // Supabase 형식으로 변환
            const supabaseRequests = localRequests.map(request => ({
                id: request.id,
                employee_id: request.employeeId,
                employee_name: request.employeeName,
                leave_type: request.leaveType,
                start_date: request.startDate,
                end_date: request.endDate,
                days: request.days,
                reason: request.reason,
                status: request.status,
                request_date: request.requestDate,
                approval_date: request.approvalDate || null,
                approver: request.approver || null,
                rejection_reason: request.rejectionReason || null,
                type: request.type || '휴가'
            }));
            
            // 배치 삽입
            const { error } = await this.supabase
                .from('leave_requests')
                .upsert(supabaseRequests, { onConflict: 'id' });
            
            if (error) throw error;
            
            this.log(`Leave Requests: ${supabaseRequests.length}개 마이그레이션 완료`, 'success');
        } catch (error) {
            this.log(`Leave Requests 마이그레이션 오류: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Welfare Leave Grants 마이그레이션
     */
    async migrateWelfareLeaveGrants() {
        try {
            this.log('Welfare Leave Grants 마이그레이션 시작...');
            
            // LocalStorage에서 welfareLeaveGrants 데이터 가져오기
            const localGrants = JSON.parse(localStorage.getItem('welfareLeaveGrants') || '[]');
            
            if (localGrants.length === 0) {
                this.log('Welfare Leave Grants: 마이그레이션할 데이터 없음', 'warning');
                return;
            }
            
            // Supabase 형식으로 변환
            const supabaseGrants = localGrants.map(grant => ({
                id: grant.id,
                employee_id: grant.employeeId,
                employee_name: grant.employeeName,
                days: grant.days,
                reason: grant.reason,
                grant_date: grant.grantDate,
                grantor: grant.grantor,
                created_at: grant.createdAt || new Date().toISOString()
            }));
            
            // 배치 삽입
            const { error } = await this.supabase
                .from('welfare_leave_grants')
                .upsert(supabaseGrants, { onConflict: 'id' });
            
            if (error) throw error;
            
            this.log(`Welfare Leave Grants: ${supabaseGrants.length}개 마이그레이션 완료`, 'success');
        } catch (error) {
            this.log(`Welfare Leave Grants 마이그레이션 오류: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Settings 마이그레이션
     */
    async migrateSettings() {
        try {
            this.log('Settings 마이그레이션 시작...');
            
            // LocalStorage에서 settings 데이터 가져오기
            const localSettings = JSON.parse(localStorage.getItem('settings') || '{}');
            
            if (Object.keys(localSettings).length === 0) {
                this.log('Settings: 마이그레이션할 데이터 없음', 'warning');
                return;
            }
            
            // Supabase 형식으로 변환
            const supabaseSettings = Object.entries(localSettings).map(([key, value]) => ({
                key: key,
                value: JSON.stringify(value),
                description: `Migrated from LocalStorage`
            }));
            
            // 배치 삽입
            const { error } = await this.supabase
                .from('settings')
                .upsert(supabaseSettings, { onConflict: 'key' });
            
            if (error) throw error;
            
            this.log(`Settings: ${supabaseSettings.length}개 마이그레이션 완료`, 'success');
        } catch (error) {
            this.log(`Settings 마이그레이션 오류: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * 역할 이름에서 ID 가져오기
     */
    getRoleIdFromRoleName(roleName) {
        const roleMap = {
            'admin': 1,
            'manager': 2,
            'team_leader': 3,
            'user': 4
        };
        return roleMap[roleName] || 4; // 기본값: user
    }

    /**
     * 마이그레이션 로그 다운로드
     */
    downloadLog() {
        const logText = this.migrationLog
            .map(entry => `[${entry.timestamp}] [${entry.type.toUpperCase()}] ${entry.message}`)
            .join('\n');
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `migration-log-${new Date().toISOString()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * 마이그레이션 검증
     */
    async validateMigration() {
        try {
            this.log('=== 마이그레이션 검증 시작 ===');
            
            const validation = {
                users: 0,
                branches: 0,
                teams: 0,
                leaveRequests: 0,
                welfareLeaveGrants: 0,
                settings: 0
            };
            
            // 각 테이블의 레코드 수 확인
            const { count: usersCount } = await this.supabase
                .from('users')
                .select('*', { count: 'exact', head: true });
            validation.users = usersCount;
            
            const { count: branchesCount } = await this.supabase
                .from('branches')
                .select('*', { count: 'exact', head: true });
            validation.branches = branchesCount;
            
            const { count: teamsCount } = await this.supabase
                .from('teams')
                .select('*', { count: 'exact', head: true });
            validation.teams = teamsCount;
            
            const { count: requestsCount } = await this.supabase
                .from('leave_requests')
                .select('*', { count: 'exact', head: true });
            validation.leaveRequests = requestsCount;
            
            const { count: grantsCount } = await this.supabase
                .from('welfare_leave_grants')
                .select('*', { count: 'exact', head: true });
            validation.welfareLeaveGrants = grantsCount;
            
            const { count: settingsCount } = await this.supabase
                .from('settings')
                .select('*', { count: 'exact', head: true });
            validation.settings = settingsCount;
            
            this.log(`검증 결과: ${JSON.stringify(validation, null, 2)}`, 'success');
            this.log('=== 마이그레이션 검증 완료 ===');
            
            return validation;
        } catch (error) {
            this.log(`검증 오류: ${error.message}`, 'error');
            throw error;
        }
    }
}

// 전역 객체로 노출
window.SupabaseMigration = SupabaseMigration;

// 사용 예시
console.log(`
=== Supabase 마이그레이션 도구 ===

사용법:
1. 마이그레이션 시작:
   const migration = new SupabaseMigration();
   await migration.migrateAll();

2. 마이그레이션 검증:
   await migration.validateMigration();

3. 로그 다운로드:
   migration.downloadLog();

예시 (전체 실행):
   const migration = new SupabaseMigration();
   const result = await migration.migrateAll();
   if (result.success) {
       await migration.validateMigration();
       migration.downloadLog();
   }
`);


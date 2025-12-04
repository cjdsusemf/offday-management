// 데이터 관리자 클래스
class DataManager {
    constructor() {
        // users는 authManager에서 관리하므로 참조만 사용
        this.leaveRequests = this.loadData('leaveRequests') || [];
        this.settings = this.loadData('settings') || {};
        this.branchTeams = this.loadData('branchTeams') || {}; // 지점별 팀 관리
        this.branches = this.loadData('branches') || []; // 지점 데이터
        
        // 🔥 Supabase 로딩 플래그
        this.isSupabaseLoading = false;
        
        // 🔥 Supabase에서 연차 데이터 동기화
        this.syncFromSupabase();
        
        // 샘플 데이터 자동 생성 비활성화 (사용자가 명시적으로 허용한 경우에만 생성)
        // 로컬스토리지에 offday_auto_seed === '1' 일 때만 시드 생성
        const allowAutoSeed = localStorage.getItem('offday_auto_seed') === '1';
        const users = this.getUsers();
        if (allowAutoSeed && users.length === 0 && this.leaveRequests.length === 0) {
            console.log('샘플 데이터 자동 시드 허용됨 - 테스트 데이터 생성');
            this.createSampleData();
        }
        
        // 복지휴가 지급 기록 초기화 (테스트 데이터 제거)
        this.initializeWelfareLeaveGrants();
        
        // 지점 데이터가 없으면 샘플 지점 데이터 생성
        if (this.branches.length === 0) {
            this.createSampleBranches();
        }
        
        // 지점별 팀 데이터 초기화
        this.initializeBranchTeams();

        // 데이터 정리 로직 비활성화 (사용자가 명시적으로 요청할 때만 실행)
        // this.cleanLeaveRequests();
    }
    
    // 🔥 Supabase와 동기화
    async syncFromSupabase() {
        this.isSupabaseLoading = true;  // ✅ 로딩 시작
        try {
            // Supabase 클라이언트가 준비될 때까지 대기
            if (!window.supabaseClient) {
                console.log('[DataManager] ⏳ Supabase 클라이언트 대기 중...');
                // 최대 5초 대기
                for (let i = 0; i < 10; i++) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    if (window.supabaseClient) break;
                }
            }
            
            if (!window.supabaseClient) {
                console.warn('[DataManager] ⚠️ Supabase 타임아웃 - LocalStorage만 사용');
                return;
            }
            
            console.log('[DataManager] 📥 Supabase에서 데이터 로드 시작...');
            const supabaseData = await this.loadLeaveRequestsFromSupabase();
            
            if (supabaseData.length > 0) {
                console.log('[DataManager] ✅ Supabase에서 로드:', supabaseData.length, '개');
                this.leaveRequests = supabaseData;
                // LocalStorage에도 저장 (캐시)
                localStorage.setItem('leaveRequests', JSON.stringify(this.leaveRequests));
            } else {
                console.log('[DataManager] 📭 Supabase에 데이터 없음');
            }
        } catch (err) {
            console.error('[DataManager] Supabase 동기화 오류:', err);
        } finally {
            this.isSupabaseLoading = false;  // ✅ 로딩 완료
        }
    }
    
    // users 참조 (authManager에서 관리)
    getUsers() {
        return JSON.parse(localStorage.getItem('users') || '[]');
    }
    
    saveUsers(users) {
        localStorage.setItem('users', JSON.stringify(users));
    }
    
    // 🔥 Supabase 동기화 - 연차 신청 저장
    async saveLeaveRequestToSupabase(leaveRequest) {
        try {
            if (!window.supabaseClient || !window.supabaseClient.auth) {
                console.warn('[DataManager] Supabase 연결 안 됨 - LocalStorage만 사용');
                return false;
            }

            // RLS 정책을 만족하기 위해 auth.uid()와 employee_id를 일치시켜야 함
            const { data: userData, error: userError } = await window.supabaseClient.auth.getUser();
            if (userError || !userData || !userData.user) {
                console.warn('[DataManager] Supabase 사용자 정보를 가져오지 못해 연차를 DB에 저장하지 않습니다.', userError);
                return false;
            }
            const authUser = userData.user;

            const payload = {
                // id는 SERIAL이므로 명시하지 않으면 자동 생성됨
                employee_id: authUser.id,                              // 🔥 auth.uid() 와 동일
                employee_name: leaveRequest.employeeName,
                leave_type: leaveRequest.leaveType,
                start_date: leaveRequest.startDate,
                end_date: leaveRequest.endDate,
                days: leaveRequest.days,
                reason: leaveRequest.reason || '사유 없음',            // ✅ 기본값
                status: leaveRequest.status,
                request_date: leaveRequest.requestDate,
                approval_date: leaveRequest.approvalDate || null,
                approver: leaveRequest.approver || null,
                rejection_reason: leaveRequest.rejectionReason || null,
                type: leaveRequest.type || '휴가'
            };

            const { error } = await window.supabaseClient
                .from('leave_requests')
                .insert([payload]);
            
            if (error) {
                console.error('[DataManager] ❌ Supabase 연차 저장 실패:', error);
                return false;
            }
            
            console.log('[DataManager] ✅ Supabase에 연차 저장 완료 (employee:', authUser.id, ')');
            return true;
        } catch (err) {
            console.error('[DataManager] Supabase 저장 오류:', err);
            return false;
        }
    }
    
    // 🔥 Supabase에서 연차 데이터 로드
    async loadLeaveRequestsFromSupabase() {
        try {
            if (!window.supabaseClient) {
                console.warn('[DataManager] Supabase 연결 안 됨');
                return [];
            }
            
            const { data, error } = await window.supabaseClient
                .from('leave_requests')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('[DataManager] Supabase 로드 실패:', error);
                return [];
            }
            
            // Supabase 형식 → LocalStorage 형식 변환
            const leaveRequests = (data || []).map(item => ({
                id: item.id,
                employeeId: item.employee_id,
                employeeName: item.employee_name,
                leaveType: item.leave_type,
                startDate: item.start_date,
                endDate: item.end_date,
                days: item.days,
                reason: item.reason,
                status: item.status,
                requestDate: item.request_date,
                approvalDate: item.approval_date,
                approver: item.approver,
                rejectionReason: item.rejection_reason,
                type: item.type || '휴가'
            }));
            
            console.log('[DataManager] ✅ Supabase에서 로드:', leaveRequests.length, '개');
            return leaveRequests;
        } catch (err) {
            console.error('[DataManager] Supabase 로드 오류:', err);
            return [];
        }
    }
    
    // 수동 데이터 정리 (사용자가 명시적으로 요청할 때만)
    manualCleanup() {
        console.log('🧹 수동 데이터 정리 시작...');
        this.cleanLeaveRequests();
        console.log('🧹 수동 데이터 정리 완료');
    }
    
    // 모든 데이터 클리어 (개발용)
    clearAllData() {
        localStorage.removeItem('users');
        localStorage.removeItem('leaveRequests');
        localStorage.removeItem('settings');
        localStorage.removeItem('deletedUsers');
        localStorage.removeItem('branchTeams');
        localStorage.removeItem('branches');
        console.log('✅ 모든 데이터가 클리어되었습니다.');
    }

    // 고아/테스트 연차신청 정리: 사용자 존재하지 않거나 테스트 이메일이면 제거 (관리자 계정 보호)
    cleanLeaveRequests() {
        try {
            const users = this.getUsers();
            const usersById = new Map(users.map(u => [String(u.id), u]));
            const before = (this.leaveRequests || []).length;
            this.leaveRequests = (this.leaveRequests || []).filter(req => {
                const user = usersById.get(String(req.employeeId));
                if (!user) return false; // 고아 데이터 제거
                
                // 관리자 계정은 보호
                if (user.role === 'admin') return true;
                
                // 삭제된 사용자의 연차는 제거
                if (user.status === 'deleted') return false;
                
                // 테스트 계정만 제거
                if (typeof user.email === 'string' && user.email.endsWith('@test.com')) return false;
                return true;
            });
            const after = this.leaveRequests.length;
            if (after !== before) {
                this.saveData('leaveRequests', this.leaveRequests);
                console.log(`🧹 연차신청 정리: 제거 ${before - after}건 (관리자 계정 보호됨)`);
            }
        } catch (err) {
            console.error('연차신청 정리 오류:', err);
        }
    }
    
    // 관리자 계정 복구 및 연차 신청 복구
    restoreAdminAccount() {
        try {
            const users = this.getUsers();
            // 관리자 사용자 데이터 확인/생성
            let adminUser = users.find(u => u.email === 'admin@offday.com' || u.email === 'admin@test.com');
            if (!adminUser) {
                adminUser = {
                    id: 'admin',
                    username: 'admin',
                    password: 'admin123',
                    role: 'admin',
                    roleId: 1,  // 관리자 역할
                    name: '관리자',
                    email: 'admin@offday.com',
                    phone: '010-0000-0000',
                    birthDate: '1990-01-01',
                    profileImage: '',
                    branch: '본사',
                    branchId: 1,
                    department: '경영관리팀',
                    team: '경영관리팀',
                    position: '관리자',
                    hireDate: '2020-01-01',
                    annualLeaveDays: 15,
                    usedLeaveDays: 0,
                    remainingLeaveDays: 15,
                    welfareLeaveDays: 0,
                    status: 'active',
                    resignationDate: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    deletedAt: null
                };
                users.push(adminUser);
                this.saveUsers(users);
                console.log('✅ 관리자 사용자 계정이 복구되었습니다.');
            }
            
            // 관리자 연차 신청 복구 (샘플 데이터에서)
            const adminLeaveRequest = {
                id: 2,
                employeeId: adminUser.id,
                employeeName: adminUser.name,
                leaveType: '개인사정',
                startDate: '2025-10-29',
                endDate: '2025-10-29',
                days: 1,
                reason: '개인사정',
                status: 'approved',
                requestDate: '2025-10-26',
                type: '휴가'
            };
            
            // 이미 존재하는지 확인
            const existingRequest = this.leaveRequests.find(req => req.id === adminLeaveRequest.id);
            if (!existingRequest) {
                this.leaveRequests.push(adminLeaveRequest);
                this.saveData('leaveRequests', this.leaveRequests);
                console.log('✅ 관리자 연차 신청이 복구되었습니다.');
            }
            
            return true;
        } catch (err) {
            console.error('관리자 계정 복구 오류:', err);
            return false;
        }
    }
    
    // 모든 사용자 관련 데이터 강제 삭제
    clearAllUserData() {
        localStorage.removeItem('leaveRequests');
        localStorage.removeItem('deletedUsers');
        
        // 사용자 계정도 함께 삭제 (admin 제외)
        const users = this.getUsers();
        const adminUser = users.find(u => u.role === 'admin');
        if (adminUser) {
            this.saveUsers([adminUser]);
            console.log('🗑️ 관리자 계정 제외하고 모든 사용자 계정이 삭제되었습니다.');
        } else {
            this.saveUsers([]);
            console.log('🗑️ 모든 사용자 계정이 삭제되었습니다.');
        }
        
        console.log('🗑️ 모든 사용자 데이터와 삭제된 사용자 목록이 삭제되었습니다.');
    }

    // 로컬 스토리지에서 데이터 로드
    loadData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('데이터 로드 오류:', error);
            return null;
        }
    }

    // 로컬 스토리지에 데이터 저장
    saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            
            // NOTE:
            // - 과거에는 여기서 leaveRequests 전체를 Supabase에 다시 동기화했지만
            //   이제는 addLeaveRequest()에서 개별 insert만 수행합니다.
            // - 전체 동기화는 마이그레이션 시에만 manualCleanup / 별도 도구로 처리하세요.
            
            // 동일 탭에서도 변화를 감지할 수 있도록 커스텀 이벤트 디스패치
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                try {
                    window.dispatchEvent(new CustomEvent('dm:updated', { detail: { key } }));
                } catch (e) {
                    // 이벤트 디스패치는 실패해도 동작에 영향 없음
                }
            }
            return true;
        } catch (error) {
            console.error('데이터 저장 오류:', error);
            return false;
        }
    }
    
    // 🔥 모든 연차 신청을 Supabase에 동기화 (개발/마이그레이션 용도)
    async syncLeaveRequestsToSupabase(leaveRequests) {
        try {
            if (!window.supabaseClient) {
                console.warn('[DataManager] ⚠️ Supabase 연결 안 됨 - 동기화 취소');
                return;
            }
            
            console.log('[DataManager] (개발용) Supabase 전체 동기화 시작:', leaveRequests.length, '개');
            
            // 주의: RLS / auth.uid() 제약 때문에 실제 운영 환경에서는
            // 이 함수보다 서버 사이드 마이그레이션을 사용하는 것을 권장합니다.
            for (const leave of leaveRequests) {
                await this.saveLeaveRequestToSupabase(leave);
            }
            
            console.log('[DataManager] (개발용) Supabase 전체 동기화 완료');
        } catch (err) {
            console.error('[DataManager] Supabase 동기화 오류:', err);
        }
    }

    // 샘플 데이터 생성 (빈 배열로 시작)
    createSampleData() {
        // 빈 배열로 초기화
        this.leaveRequests = [];
        
        // 테스트용 사용자 데이터 추가 (다양한 지점)
        const sampleUsers = [
            {
                id: '1',
                username: 'jang@test.com',
                password: 'test123',
                role: 'user',
                roleId: 4,
                name: '장경민',
                email: 'jang@test.com',
                phone: '010-1234-5678',
                birthDate: '1990-01-01',
                profileImage: '',
                branch: '본사',
                branchId: 1,
                department: '개발팀',
                team: '개발팀',
                position: '개발자',
                hireDate: '2023-01-01',
                annualLeaveDays: 15,
                usedLeaveDays: 0,
                remainingLeaveDays: 15,
                welfareLeaveDays: 0,
                status: 'active',
                resignationDate: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null
            },
            {
                id: 'admin',
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                roleId: 1,
                name: '관리자',
                email: 'admin@offday.com',
                phone: '010-0000-0000',
                birthDate: '1990-01-01',
                profileImage: '',
                branch: '본사',
                branchId: 1,
                department: '경영관리팀',
                team: '경영관리팀',
                position: '관리자',
                hireDate: '2020-01-01',
                annualLeaveDays: 15,
                usedLeaveDays: 0,
                remainingLeaveDays: 15,
                welfareLeaveDays: 0,
                status: 'active',
                resignationDate: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null
            },
            {
                id: '3',
                username: 'kim@test.com',
                password: 'test123',
                role: 'user',
                roleId: 4,
                name: '김강남',
                email: 'kim@test.com',
                phone: '010-3456-7890',
                birthDate: '1992-03-15',
                profileImage: '',
                branch: '강남점',
                branchId: 2,
                department: '영업팀',
                team: '영업팀',
                position: '영업사원',
                hireDate: '2023-03-01',
                annualLeaveDays: 15,
                usedLeaveDays: 0,
                remainingLeaveDays: 15,
                welfareLeaveDays: 0,
                status: 'active',
                resignationDate: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null
            },
            {
                id: '4',
                username: 'park@test.com',
                password: 'test123',
                role: 'user',
                roleId: 4,
                name: '박부산',
                email: 'park@test.com',
                phone: '010-4567-8901',
                birthDate: '1988-07-22',
                profileImage: '',
                branch: '부산점',
                branchId: 3,
                department: '컨설팅팀',
                team: '컨설팅팀',
                position: '컨설턴트',
                hireDate: '2023-05-01',
                annualLeaveDays: 15,
                usedLeaveDays: 0,
                remainingLeaveDays: 15,
                welfareLeaveDays: 0,
                status: 'active',
                resignationDate: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null
            },
            {
                id: '5',
                username: 'lee@test.com',
                password: 'test123',
                role: 'user',
                roleId: 4,
                name: '이대구',
                email: 'lee@test.com',
                phone: '010-5678-9012',
                birthDate: '1995-11-30',
                profileImage: '',
                branch: '대구점',
                branchId: 4,
                department: '지원팀',
                team: '지원팀',
                position: '지원직',
                hireDate: '2023-07-01',
                annualLeaveDays: 15,
                usedLeaveDays: 0,
                remainingLeaveDays: 15,
                welfareLeaveDays: 0,
                status: 'active',
                resignationDate: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null
            }
        ];
        
        this.saveUsers(sampleUsers);
        
        // 테스트용 연차 데이터 추가 (다양한 지점)
        this.leaveRequests = [
            {
                id: 1,
                employeeId: 1,
                employeeName: '장경민',
                leaveType: '개인사정',
                startDate: '2025-10-28',
                endDate: '2025-10-28',
                days: 1,
                reason: '개인사정',
                status: 'approved',
                requestDate: '2025-10-25',
                type: '휴가'
            },
            {
                id: 2,
                employeeId: 2,
                employeeName: 'admin',
                leaveType: '개인사정',
                startDate: '2025-10-29',
                endDate: '2025-10-29',
                days: 1,
                reason: '개인사정',
                status: 'approved',
                requestDate: '2025-10-26',
                type: '휴가'
            },
            {
                id: 3,
                employeeId: 3,
                employeeName: '김강남',
                leaveType: '기타',
                startDate: '2025-11-03',
                endDate: '2025-11-03',
                days: 1,
                reason: '기타',
                status: 'pending',
                requestDate: '2025-10-27',
                type: '휴가'
            },
            {
                id: 4,
                employeeId: 4,
                employeeName: '박부산',
                leaveType: '기타',
                startDate: '2025-11-07',
                endDate: '2025-11-07',
                days: 1,
                reason: '기타',
                status: 'pending',
                requestDate: '2025-10-28',
                type: '휴가'
            },
            {
                id: 5,
                employeeId: 5,
                employeeName: '이대구',
                leaveType: '개인사정',
                startDate: '2025-11-05',
                endDate: '2025-11-05',
                days: 1,
                reason: '개인사정',
                status: 'approved',
                requestDate: '2025-10-29',
                type: '휴가'
            },
            {
                id: 6,
                employeeId: 1,
                employeeName: '장경민',
                leaveType: '기타',
                startDate: '2025-11-10',
                endDate: '2025-11-10',
                days: 1,
                reason: '기타',
                status: 'approved',
                requestDate: '2025-10-30',
                type: '휴가'
            },
            {
                id: 7,
                employeeId: 3,
                employeeName: '김강남',
                leaveType: '개인사정',
                startDate: '2025-11-12',
                endDate: '2025-11-12',
                days: 1,
                reason: '개인사정',
                status: 'pending',
                requestDate: '2025-10-31',
                type: '휴가'
            }
        ];
        
        // localStorage에 데이터 저장
        this.saveData('leaveRequests', this.leaveRequests);
        this.saveData('deletedUsers', []);
        
        console.log('✅ 테스트용 사용자 및 연차 데이터가 생성되었습니다.');
    }

    // 샘플 지점 데이터 생성
    createSampleBranches() {
        const sampleBranches = [
            {
                id: 1,
                name: '본사',
                address: '서울특별시 강남구 테헤란로 123',
                phone: '02-1234-5678',
                manager: '김대표',
                description: '본사 건물입니다.',
                createdAt: '2024-01-01',
                departments: ['경영관리팀', '개발팀', '마케팅팀', '인사팀'],
                leaveCalculationStandard: 'hire_date' // 입사일 기준
            },
            {
                id: 2,
                name: '강남점',
                address: '서울특별시 강남구 역삼동 456',
                phone: '02-2345-6789',
                manager: '이지점장',
                description: '강남 지점입니다.',
                createdAt: '2024-01-15',
                departments: ['영업팀', '컨설팅팀', '지원팀'],
                leaveCalculationStandard: 'fiscal_year' // 회계연도 기준
            },
            {
                id: 3,
                name: '영등포점',
                address: '서울특별시 영등포구 영등포동 123',
                phone: '02-3456-7890',
                manager: '최지점장',
                description: '영등포 지점입니다.',
                createdAt: '2024-02-01',
                departments: ['경영관리팀', '택스팀', '컨설팅팀'],
                leaveCalculationStandard: 'hire_date' // 입사일 기준
            },
            {
                id: 4,
                name: '부산점',
                address: '부산광역시 해운대구 우동 789',
                phone: '051-3456-7890',
                manager: '박지점장',
                description: '부산 지점입니다.',
                createdAt: '2024-02-01',
                departments: ['영업팀', '마케팅팀'],
                leaveCalculationStandard: 'fiscal_year' // 회계연도 기준
            },
            {
                id: 5,
                name: '서초점',
                address: '서울특별시 서초구 서초동 101',
                phone: '02-3456-7890',
                manager: '최지점장',
                description: '서초 지점입니다.',
                createdAt: '2024-02-15',
                departments: ['개발팀', '인사팀'],
                leaveCalculationStandard: 'hire_date' // 입사일 기준
            },
            {
                id: 5,
                name: '송파점',
                address: '서울특별시 송파구 잠실동 202',
                phone: '02-4567-8901',
                manager: '정지점장',
                description: '송파 지점입니다.',
                createdAt: '2024-03-01'
            },
            {
                id: 6,
                name: '마포점',
                address: '서울특별시 마포구 홍대입구역 303',
                phone: '02-5678-9012',
                manager: '한지점장',
                description: '마포 지점입니다.',
                createdAt: '2024-03-15'
            },
            {
                id: 7,
                name: '용산점',
                address: '서울특별시 용산구 이태원동 404',
                phone: '02-6789-0123',
                manager: '오지점장',
                description: '용산 지점입니다.',
                createdAt: '2024-04-01'
            },
            {
                id: 8,
                name: '영등포점',
                address: '서울특별시 영등포구 여의도동 505',
                phone: '02-7890-1234',
                manager: '강지점장',
                description: '영등포 지점입니다.',
                createdAt: '2024-04-15'
            },
            {
                id: 9,
                name: '구로점',
                address: '서울특별시 구로구 구로동 606',
                phone: '02-8901-2345',
                manager: '윤지점장',
                description: '구로 지점입니다.',
                createdAt: '2024-05-01'
            },
            {
                id: 10,
                name: '금천점',
                address: '서울특별시 금천구 가산동 707',
                phone: '02-9012-3456',
                manager: '임지점장',
                description: '금천 지점입니다.',
                createdAt: '2024-05-15'
            },
            {
                id: 11,
                name: '관악점',
                address: '서울특별시 관악구 신림동 808',
                phone: '02-0123-4567',
                manager: '조지점장',
                description: '관악 지점입니다.',
                createdAt: '2024-06-01'
            }
        ];
        this.branches = sampleBranches;
        this.saveData('branches', this.branches);
    }

    // 연차 신청 상태 업데이트 (Supabase 우선, LocalStorage 병행)
    async updateLeaveRequestStatus(id, status, approvedBy = '관리자') {
        const index = this.leaveRequests.findIndex(req => req.id === id);
        if (index !== -1) {
            this.leaveRequests[index].status = status;
            this.leaveRequests[index].approvedDate = new Date().toISOString().split('T')[0];
            this.leaveRequests[index].approvedBy = approvedBy;
            
            // 승인된 경우 사용자의 사용 연차일 업데이트
            if (status === 'approved') {
                const request = this.leaveRequests[index];
                const users = this.getUsers();
                const userIndex = users.findIndex(u => u.id === request.employeeId);
                if (userIndex !== -1) {
                    users[userIndex].usedLeaveDays = (users[userIndex].usedLeaveDays || 0) + request.days;
                    users[userIndex].remainingLeaveDays = (users[userIndex].remainingLeaveDays || 15) - request.days;
                    users[userIndex].updatedAt = new Date().toISOString();
                    this.saveUsers(users);
                }
            }
            
            // LocalStorage 업데이트
            this.saveData('leaveRequests', this.leaveRequests);
            
            // Supabase 업데이트 (백그라운드)
            this.updateLeaveRequestInSupabase(id, status, approvedBy)
                .then((ok) => {
                    if (!ok) {
                        console.warn('[DataManager] Supabase 연차 상태 업데이트 실패 (로컬 데이터는 유지됨)');
                    }
                })
                .catch(err => {
                    console.error('[DataManager] Supabase 연차 상태 업데이트 중 예외:', err);
                });
            
            return this.leaveRequests[index];
        }
        return null;
    }

    // 사용자 추가 (이전 addEmployee와의 호환성)
    addEmployee(employeeData) {
        // users 테이블에 추가
        const users = this.getUsers();
        const newUser = {
            // 인증 정보
            id: Date.now().toString(),
            username: employeeData.email || employeeData.username,
            password: null, // 비밀번호는 별도 설정 필요
            role: 'user',
            roleId: 4,  // 일반 사용자 역할
            
            // 개인 정보
            name: employeeData.name,
            email: employeeData.email,
            phone: employeeData.phone || '',
            birthDate: employeeData.birthDate || '',
            profileImage: '',
            
            // 회사 정보
            branch: employeeData.branch || '',
            branchId: employeeData.branchId || null,
            department: employeeData.department || '',
            team: employeeData.team || employeeData.department || '',
            position: employeeData.position || '',
            hireDate: employeeData.hireDate || '',
            
            // 연차 정보
            annualLeaveDays: employeeData.annualLeaveDays || 15,
            usedLeaveDays: 0,
            remainingLeaveDays: employeeData.annualLeaveDays || 15,
            welfareLeaveDays: employeeData.welfareLeaveDays || 0,
            
            // 상태 정보
            status: 'active',
            resignationDate: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null
        };
        users.push(newUser);
        this.saveUsers(users);
        return newUser;
    }

    // 기존 사용자 데이터 마이그레이션 - 더 이상 필요 없음 (통합 완료)
    migrateEmployeeData() {
        console.log('사용자 데이터 마이그레이션: 통합 완료로 인해 스킵');
    }

    // 복지휴가 지급 기록 초기화
    clearWelfareLeaveGrants() {
        this.welfareLeaveGrants = [];
        this.saveData('welfareLeaveGrants', this.welfareLeaveGrants);
        
        // 모든 사용자의 welfareLeaveDays도 0으로 초기화
        const users = this.getUsers();
        users.forEach(user => {
            user.welfareLeaveDays = 0;
            user.updatedAt = new Date().toISOString();
        });
        this.saveUsers(users);
        
        console.log('복지휴가 지급 기록이 모두 삭제되었습니다.');
    }

    // 복지휴가 지급 기록 초기화 (자동 실행)
    initializeWelfareLeaveGrants() {
        // welfareLeaveGrants 데이터 로드
        this.welfareLeaveGrants = this.loadData('welfareLeaveGrants') || [];
        
        // 테스트용 데이터가 있으면 모두 삭제
        if (this.welfareLeaveGrants.length > 0) {
            console.log('테스트용 복지휴가 지급 기록을 초기화합니다.');
            this.clearWelfareLeaveGrants();
        }
    }

    // 특정 사용자의 복지휴가 지급 기록 삭제
    clearEmployeeWelfareLeaveGrants(employeeId) {
        if (!this.welfareLeaveGrants) {
            this.welfareLeaveGrants = [];
        }
        
        // 해당 사용자의 복지휴가 지급 기록 삭제
        this.welfareLeaveGrants = this.welfareLeaveGrants.filter(grant => grant.employeeId !== employeeId);
        this.saveData('welfareLeaveGrants', this.welfareLeaveGrants);
        
        // 해당 사용자의 welfareLeaveDays도 0으로 초기화
        const users = this.getUsers();
        const user = users.find(u => u.id === employeeId);
        if (user) {
            user.welfareLeaveDays = 0;
            user.updatedAt = new Date().toISOString();
            this.saveUsers(users);
        }
        
        console.log(`사용자 ID ${employeeId}의 복지휴가 지급 기록이 삭제되었습니다.`);
    }

    // 사용자 업데이트 (이전 updateEmployee와의 호환성)
    updateEmployee(id, employeeData) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.id === id);
        if (index !== -1) {
            users[index] = { ...users[index], ...employeeData };
            users[index].updatedAt = new Date().toISOString();
            this.saveUsers(users);
            return users[index];
        }
        return null;
    }

    // 사용자 삭제 (이전 deleteEmployee와의 호환성)
    deleteEmployee(id) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.id === id);
        if (index !== -1) {
            const deletedUser = users[index];
            
            // 소프트 삭제
            users[index].status = 'deleted';
            users[index].deletedAt = new Date().toISOString();
            
            // 사용자 계정도 함께 삭제 (authManager 사용)
            if (typeof window.authManager !== 'undefined') {
                window.authManager.deleteUserByEmail(deletedUser.email);
            }
            
            // 데이터 저장
            this.saveUsers(users);
            
            return true;
        }
        return false;
    }

    // 삭제된 사용자 목록 조회 (이전 getDeletedEmployees와의 호환성)
    getDeletedEmployees() {
        const users = this.getUsers();
        return users.filter(u => u.status === 'deleted');
    }

    // 삭제된 사용자 복원
    restoreEmployee(email) {
        const users = this.getUsers();
        const user = users.find(u => u.email === email && u.status === 'deleted');
        if (user) {
            user.status = 'active';
            user.deletedAt = null;
            user.updatedAt = new Date().toISOString();
            this.saveUsers(users);
            
            // authManager의 삭제 목록에서도 제거
            if (typeof window.authManager !== 'undefined') {
                window.authManager.restoreUserByEmail(email);
            }
            return true;
        }
        return false;
    }

    // 삭제된 사용자 영구 삭제
    permanentlyDeleteEmployee(email) {
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.email === email && u.status === 'deleted');
        if (userIndex !== -1) {
            // 완전히 제거
            users.splice(userIndex, 1);
            this.saveUsers(users);
            
            // authManager의 삭제 목록에서도 제거
            if (typeof window.authManager !== 'undefined') {
                window.authManager.permanentlyDeleteUserByEmail(email);
            }
            return true;
        }
        return false;
    }

    // 퇴사 처리
    resignEmployee(id, resignationDate = null) {
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.id === id);
        if (userIndex !== -1) {
            users[userIndex].status = 'resigned';
            users[userIndex].resignationDate = resignationDate || new Date().toISOString().split('T')[0];
            users[userIndex].updatedAt = new Date().toISOString();
            this.saveUsers(users);
            return true;
        }
        return false;
    }

    // 재직 처리 (퇴사 취소)
    reactivateEmployee(id) {
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.id === id);
        if (userIndex !== -1) {
            users[userIndex].status = 'active';
            users[userIndex].resignationDate = null;
            users[userIndex].updatedAt = new Date().toISOString();
            this.saveUsers(users);
            return true;
        }
        return false;
    }

    // 활성 사용자 목록 조회 (이전 getActiveEmployees와의 호환성)
    getActiveEmployees() {
        const users = this.getUsers();
        return users.filter(u => u.status === 'active');
    }
    
    // employees 속성 getter (호환성)
    get employees() {
        return this.getActiveEmployees();
    }

    // 퇴사자 목록 조회
    getResignedEmployees() {
        const users = this.getUsers();
        return users.filter(u => u.status === 'resigned');
    }

    // 사용자가 연차 신청 내역이 있는지 확인
    hasLeaveRequests(employeeId) {
        return this.leaveRequests.some(request => request.employeeId === employeeId);
    }

    // 지점별 팀 데이터 초기화
    initializeBranchTeams() {
        const defaultTeams = {
            "본사": ["경영지원팀", "인사팀", "총무팀", "재무팀", "개발팀", "디자인팀"],
            "강남점": ["영업팀", "고객서비스팀", "마케팅팀"],
            "부산점": ["영업팀", "물류팀", "구매팀"],
            "대구점": ["영업팀", "마케팅팀", "고객서비스팀"],
            "인천점": ["영업팀", "물류팀"],
            "광주점": ["영업팀", "고객서비스팀"]
        };

        // 기존 데이터가 없으면 기본 팀 구조 생성
        if (Object.keys(this.branchTeams).length === 0) {
            this.branchTeams = defaultTeams;
            this.saveData('branchTeams', this.branchTeams);
        } else {
            // 새로운 지점이 추가된 경우 기본 팀 추가
            let updated = false;
            Object.keys(defaultTeams).forEach(branch => {
                if (!this.branchTeams[branch]) {
                    this.branchTeams[branch] = defaultTeams[branch];
                    updated = true;
                }
            });
            
            if (updated) {
                this.saveData('branchTeams', this.branchTeams);
            }
        }
    }

    // 지점별 팀 목록 조회
    getBranchTeams(branchName) {
        return this.branchTeams[branchName] || [];
    }

    // 지점별 팀 추가
    addBranchTeam(branchName, teamName) {
        if (!this.branchTeams[branchName]) {
            this.branchTeams[branchName] = [];
        }
        
        // 중복 팀명 확인
        if (!this.branchTeams[branchName].includes(teamName)) {
            this.branchTeams[branchName].push(teamName);
            this.saveData('branchTeams', this.branchTeams);
            return true;
        }
        return false;
    }

    // 지점별 팀 삭제
    removeBranchTeam(branchName, teamName) {
        if (this.branchTeams[branchName]) {
            const index = this.branchTeams[branchName].indexOf(teamName);
            if (index > -1) {
                this.branchTeams[branchName].splice(index, 1);
                this.saveData('branchTeams', this.branchTeams);
                return true;
            }
        }
        return false;
    }

    // 지점별 팀 수정
    updateBranchTeam(branchName, oldTeamName, newTeamName) {
        if (this.branchTeams[branchName]) {
            const index = this.branchTeams[branchName].indexOf(oldTeamName);
            if (index > -1) {
                this.branchTeams[branchName][index] = newTeamName;
                this.saveData('branchTeams', this.branchTeams);
                return true;
            }
        }
        return false;
    }

    // 모든 지점의 팀 목록 조회
    getAllBranchTeams() {
        return this.branchTeams;
    }

    // 지점 삭제 시 팀 데이터도 삭제
    deleteBranchTeams(branchName) {
        if (this.branchTeams[branchName]) {
            delete this.branchTeams[branchName];
            this.saveData('branchTeams', this.branchTeams);
            return true;
        }
        return false;
    }

    // 기존 사용자 데이터 마이그레이션 (지점별 팀 구조에 맞게)
    migrateEmployeeDataToBranchTeams() {
        let migrated = false;
        const users = this.getUsers();
        
        users.forEach(user => {
            const branchName = user.branch;
            const departmentName = user.department;
            
            // 해당 지점에 팀이 없으면 추가
            if (branchName && departmentName) {
                if (!this.branchTeams[branchName]) {
                    this.branchTeams[branchName] = [];
                }
                
                // 해당 팀이 지점의 팀 목록에 없으면 추가
                if (!this.branchTeams[branchName].includes(departmentName)) {
                    this.branchTeams[branchName].push(departmentName);
                    migrated = true;
                }
            }
        });
        
        if (migrated) {
            this.saveData('branchTeams', this.branchTeams);
            console.log('사용자 데이터가 지점별 팀 구조로 마이그레이션되었습니다.');
        }
    }

    // 연차 신청 추가 (Supabase 우선, LocalStorage 병행 저장)
    addLeaveRequest(request) {
        const newRequest = {
            ...request,
            id: Date.now(),
            status: 'pending',
            requestDate: new Date().toISOString().split('T')[0]
        };

        // 로컬에 먼저 반영 (기존 화면들과의 호환성 유지)
        this.leaveRequests.push(newRequest);
        this.saveData('leaveRequests', this.leaveRequests);
        
        console.log('✅ 연차 신청 추가됨 (로컬):', newRequest);
        console.log('📊 현재 총 연차 신청 수:', this.leaveRequests.length);

        // 백그라운드로 Supabase에도 저장 시도 (실패해도 UI에는 영향 없음)
        this.saveLeaveRequestToSupabase(newRequest)
            .then((ok) => {
                if (!ok) {
                    console.warn('[DataManager] Supabase에 연차를 저장하지 못했습니다. (로컬 데이터는 유지됩니다)');
                }
            })
            .catch(err => {
                console.error('[DataManager] Supabase 연차 저장 중 예외:', err);
            });
        
        return newRequest;
    }

    // Supabase에 연차 신청 저장
    async saveLeaveRequestToSupabase(leaveRequest) {
        try {
            if (!window.supabaseClient || !window.supabaseClient.auth) {
                console.warn('[DataManager] Supabase 연결 안 됨 - LocalStorage만 사용');
                return false;
            }

            // RLS 정책을 만족하기 위해 auth.uid()와 employee_id를 일치시켜야 함
            const { data: userData, error: userError } = await window.supabaseClient.auth.getUser();
            if (userError || !userData || !userData.user) {
                console.warn('[DataManager] Supabase 사용자 정보를 가져오지 못해 연차를 DB에 저장하지 않습니다.', userError);
                return false;
            }
            const authUser = userData.user;

            const payload = {
                // id는 SERIAL이므로 명시하지 않으면 자동 생성됨
                employee_id: authUser.id,                              // 🔥 auth.uid() 와 동일
                employee_name: leaveRequest.employeeName,
                leave_type: leaveRequest.leaveType,
                start_date: leaveRequest.startDate,
                end_date: leaveRequest.endDate,
                days: leaveRequest.days,
                reason: leaveRequest.reason || '사유 없음',            // ✅ 기본값
                status: leaveRequest.status,
                request_date: leaveRequest.requestDate,
                approval_date: leaveRequest.approvalDate || null,
                approver: leaveRequest.approver || null,
                rejection_reason: leaveRequest.rejectionReason || null,
                type: leaveRequest.type || '휴가'
            };

            const { data, error } = await window.supabaseClient
                .from('leave_requests')
                .insert([payload])
                .select()
                .single();
            
            if (error) {
                console.error('[DataManager] ❌ Supabase 연차 저장 실패:', error);
                return false;
            }
            
            console.log('[DataManager] ✅ Supabase에 연차 저장 완료 (employee:', authUser.id, ', DB ID:', data.id, ')');
            
            // LocalStorage의 ID를 Supabase ID로 업데이트 (동기화를 위해)
            const localIndex = this.leaveRequests.findIndex(r => r.id === leaveRequest.id);
            if (localIndex !== -1) {
                this.leaveRequests[localIndex].supabaseId = data.id;
                this.saveData('leaveRequests', this.leaveRequests);
            }
            
            return true;
        } catch (err) {
            console.error('[DataManager] Supabase 저장 오류:', err);
            return false;
        }
    }

    // Supabase에서 연차 신청 업데이트
    async updateLeaveRequestInSupabase(requestId, status, approvedBy = '관리자') {
        try {
            if (!window.supabaseClient) {
                console.warn('[DataManager] Supabase 연결 안 됨 - LocalStorage만 업데이트');
                return false;
            }

            // LocalStorage에서 Supabase ID 찾기
            const localRequest = this.leaveRequests.find(r => r.id === requestId);
            if (!localRequest) {
                console.warn('[DataManager] LocalStorage에서 연차 신청을 찾을 수 없음:', requestId);
                return false;
            }

            const supabaseId = localRequest.supabaseId || requestId;
            const approvalDate = new Date().toISOString().split('T')[0];

            const { error } = await window.supabaseClient
                .from('leave_requests')
                .update({
                    status: status,
                    approval_date: approvalDate,
                    approver: approvedBy
                })
                .eq('id', supabaseId);

            if (error) {
                console.error('[DataManager] ❌ Supabase 연차 상태 업데이트 실패:', error);
                return false;
            }

            console.log('[DataManager] ✅ Supabase 연차 상태 업데이트 완료:', supabaseId, status);
            return true;
        } catch (err) {
            console.error('[DataManager] Supabase 업데이트 중 오류:', err);
            return false;
        }
    }

    // Supabase에서 연차 데이터 동기화 (페이지 로드 시 호출)
    async syncLeaveRequestsFromSupabase() {
        try {
            if (!window.supabaseClient || !window.supabaseClient.auth) {
                console.warn('[DataManager] Supabase 연결 안 됨 - 동기화 건너뜀');
                return false;
            }

            const { data: userData, error: userError } = await window.supabaseClient.auth.getUser();
            if (userError || !userData || !userData.user) {
                console.warn('[DataManager] Supabase 사용자 정보 없음 - 동기화 건너뜀');
                return false;
            }

            const authUser = userData.user;
            console.log(`[DataManager] Supabase 연차 동기화 시작 (User ID: ${authUser.id})...`);

            // RLS에 의해 현재 사용자의 연차만 조회됨 (또는 관리자는 모든 연차)
            const { data: leaveRows, error: leaveError } = await window.supabaseClient
                .from('leave_requests')
                .select('*')
                .order('request_date', { ascending: false });

            if (leaveError) {
                console.error('[DataManager] Supabase leave_requests 로드 오류:', leaveError);
                return false;
            }

            if (Array.isArray(leaveRows)) {
                const normalized = leaveRows.map(row => ({
                    id: row.id,
                    supabaseId: row.id, // Supabase ID 저장
                    employeeId: row.employee_id,
                    employeeName: row.employee_name,
                    leaveType: row.leave_type,
                    startDate: row.start_date,
                    endDate: row.end_date,
                    days: row.days,
                    reason: row.reason,
                    status: row.status,
                    requestDate: row.request_date,
                    approvalDate: row.approval_date,
                    approver: row.approver,
                    rejectionReason: row.rejection_reason,
                    type: row.type || '휴가'
                }));

                this.leaveRequests = normalized;
                this.saveData('leaveRequests', this.leaveRequests);
                console.log(`[DataManager] ✅ Supabase에서 ${normalized.length}개의 연차 동기화 완료`);
                return true;
            }

            return false;
        } catch (err) {
            console.error('[DataManager] Supabase 동기화 중 오류:', err);
            return false;
        }
    }

    // 통계 데이터 가져오기
    getStatistics() {
        const users = this.getActiveEmployees();
        const totalEmployees = users.length;
        const totalLeaveRequests = this.leaveRequests.length;
        const pendingRequests = this.leaveRequests.filter(req => req.status === 'pending').length;
        const approvedRequests = this.leaveRequests.filter(req => req.status === 'approved').length;
        const rejectedRequests = this.leaveRequests.filter(req => req.status === 'rejected').length;
        
        const totalUsedDays = this.leaveRequests
            .filter(req => req.status === 'approved')
            .reduce((sum, req) => sum + req.days, 0);
        
        const averageRemainingDays = users.length > 0 
            ? users.reduce((sum, user) => sum + (user.remainingLeaveDays || 0), 0) / users.length 
            : 0;

        return {
            totalEmployees,
            totalLeaveRequests,
            pendingRequests,
            approvedRequests,
            rejectedRequests,
            totalUsedDays,
            averageRemainingDays
        };
    }
}

// 전역 인스턴스 생성
window.dataManager = new DataManager();

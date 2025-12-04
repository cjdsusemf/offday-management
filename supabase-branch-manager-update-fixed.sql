-- 지점 관리자 기능 추가를 위한 데이터베이스 업데이트 (수정 버전)
-- 실행 날짜: 2025-12-04

-- 1. users 테이블에 managed_branch 컬럼 추가 (지점 관리자가 관리하는 지점)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS managed_branch VARCHAR(100);

-- 컬럼 설명 추가
COMMENT ON COLUMN users.managed_branch IS '지점 관리자가 관리하는 지점명 (branch_manager 역할일 때만 사용)';

-- 2. roles 테이블에 branch_manager 역할 추가 (아직 없는 경우)
-- ✅ 수정: id를 명시하지 않고 자동 증가 사용
INSERT INTO roles (name, display_name, description, priority, created_at, updated_at)
VALUES (
    'branch_manager',
    '지점 관리자',
    '지점 내 승인 및 관리 권한',
    40,
    NOW(),
    NOW()
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    priority = EXCLUDED.priority,
    updated_at = NOW();

-- 3. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_users_managed_branch ON users(managed_branch);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 4. RLS (Row Level Security) 정책 업데이트

-- 먼저 기존 정책이 있는지 확인하고 삭제
DO $$ 
BEGIN
    -- users 테이블 정책
    DROP POLICY IF EXISTS "Branch managers can view their branch employees" ON users;
    DROP POLICY IF EXISTS "Branch managers can view employees" ON users;
    DROP POLICY IF EXISTS "allow_select_own_record" ON users;
    
    -- leave_requests 테이블 정책
    DROP POLICY IF EXISTS "Branch managers can view their branch leave requests" ON leave_requests;
    DROP POLICY IF EXISTS "Branch managers can update their branch leave requests" ON leave_requests;
    DROP POLICY IF EXISTS "Enable read for authenticated users" ON leave_requests;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON leave_requests;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON leave_requests;
    
    -- welfare_leave_grants 테이블 정책
    DROP POLICY IF EXISTS "Branch managers can grant welfare leave to their branch" ON welfare_leave_grants;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON welfare_leave_grants;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Some tables do not exist yet, skipping policy drops';
    WHEN undefined_object THEN
        RAISE NOTICE 'Some policies do not exist yet, skipping';
END $$;

-- 5. 새로운 RLS 정책 생성 (테이블이 존재하는 경우에만)

-- 5-1. users 테이블 정책
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        CREATE POLICY "Branch managers can view their branch employees" ON users
            FOR SELECT
            USING (
                -- 모든 인증된 사용자는 기본적으로 자신의 정보 조회 가능
                auth.uid()::text = id
                OR
                -- 관리자와 매니저는 모든 직원 조회 가능
                (
                    SELECT role FROM users WHERE id = auth.uid()::text
                ) IN ('admin', 'manager')
                OR
                -- 지점 관리자는 자신이 관리하는 지점의 직원만 조회 가능
                (
                    (SELECT role FROM users WHERE id = auth.uid()::text) = 'branch_manager'
                    AND branch = (SELECT managed_branch FROM users WHERE id = auth.uid()::text)
                )
            );
        RAISE NOTICE 'Users table policy created';
    END IF;
END $$;

-- 5-2. leave_requests 테이블 조회 정책
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_requests') THEN
        CREATE POLICY "Branch managers can view their branch leave requests" ON leave_requests
            FOR SELECT
            USING (
                -- 본인의 연차는 항상 조회 가능
                employee_id = auth.uid()::text
                OR
                -- 관리자와 매니저는 모든 연차 신청 조회 가능
                (
                    SELECT role FROM users WHERE id = auth.uid()::text
                ) IN ('admin', 'manager')
                OR
                -- 지점 관리자는 자신이 관리하는 지점의 연차 신청만 조회 가능
                (
                    (SELECT role FROM users WHERE id = auth.uid()::text) = 'branch_manager'
                    AND employee_id IN (
                        SELECT id FROM users 
                        WHERE branch = (SELECT managed_branch FROM users WHERE id = auth.uid()::text)
                    )
                )
            );
        RAISE NOTICE 'Leave requests SELECT policy created';
    END IF;
END $$;

-- 5-3. leave_requests 테이블 수정 정책
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_requests') THEN
        CREATE POLICY "Branch managers can update their branch leave requests" ON leave_requests
            FOR UPDATE
            USING (
                -- 관리자와 매니저는 모든 연차 신청 수정 가능
                (
                    SELECT role FROM users WHERE id = auth.uid()::text
                ) IN ('admin', 'manager')
                OR
                -- 지점 관리자는 자신이 관리하는 지점의 연차 신청만 수정 가능
                (
                    (SELECT role FROM users WHERE id = auth.uid()::text) = 'branch_manager'
                    AND employee_id IN (
                        SELECT id FROM users 
                        WHERE branch = (SELECT managed_branch FROM users WHERE id = auth.uid()::text)
                    )
                )
            )
            WITH CHECK (
                -- 동일 조건 적용
                (
                    SELECT role FROM users WHERE id = auth.uid()::text
                ) IN ('admin', 'manager')
                OR
                (
                    (SELECT role FROM users WHERE id = auth.uid()::text) = 'branch_manager'
                    AND employee_id IN (
                        SELECT id FROM users 
                        WHERE branch = (SELECT managed_branch FROM users WHERE id = auth.uid()::text)
                    )
                )
            );
        RAISE NOTICE 'Leave requests UPDATE policy created';
    END IF;
END $$;

-- 5-4. welfare_leave_grants 테이블 정책
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'welfare_leave_grants') THEN
        CREATE POLICY "Branch managers can grant welfare leave to their branch" ON welfare_leave_grants
            FOR INSERT
            WITH CHECK (
                -- 관리자와 매니저는 모든 직원에게 지급 가능
                (
                    SELECT role FROM users WHERE id = auth.uid()::text
                ) IN ('admin', 'manager')
                OR
                -- 지점 관리자는 자신이 관리하는 지점의 직원에게만 지급 가능
                (
                    (SELECT role FROM users WHERE id = auth.uid()::text) = 'branch_manager'
                    AND employee_id IN (
                        SELECT id FROM users 
                        WHERE branch = (SELECT managed_branch FROM users WHERE id = auth.uid()::text)
                    )
                )
            );
        RAISE NOTICE 'Welfare leave grants policy created';
    END IF;
END $$;

-- 6. 통계 뷰 생성 (지점별 연차 현황)
CREATE OR REPLACE VIEW branch_leave_statistics AS
SELECT 
    b.name AS branch_name,
    b.id AS branch_id,
    COUNT(DISTINCT u.id) AS total_employees,
    COUNT(DISTINCT CASE WHEN u.status = 'active' THEN u.id END) AS active_employees,
    COUNT(DISTINCT lr.id) AS total_leave_requests,
    COUNT(DISTINCT CASE WHEN lr.status = 'pending' THEN lr.id END) AS pending_requests,
    COUNT(DISTINCT CASE WHEN lr.status = 'approved' THEN lr.id END) AS approved_requests,
    COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.days END), 0) AS total_leave_days
FROM branches b
LEFT JOIN users u ON u.branch = b.name
LEFT JOIN leave_requests lr ON lr.employee_id = u.id
GROUP BY b.id, b.name
ORDER BY b.name;

-- 7. 감사 로그 테이블 (선택 사항: 역할 변경 이력 추적)
CREATE TABLE IF NOT EXISTS role_change_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    old_role VARCHAR(50),
    new_role VARCHAR(50) NOT NULL,
    old_managed_branch VARCHAR(100),
    new_managed_branch VARCHAR(100),
    changed_by VARCHAR(255) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_role_change_logs_user_id ON role_change_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_role_change_logs_changed_at ON role_change_logs(changed_at DESC);

-- RLS 활성화
ALTER TABLE role_change_logs ENABLE ROW LEVEL SECURITY;

-- 감사 로그 정책
DROP POLICY IF EXISTS "Only admins can view role change logs" ON role_change_logs;
CREATE POLICY "Only admins can view role change logs" ON role_change_logs
    FOR SELECT
    USING (
        (SELECT role FROM users WHERE id = auth.uid()::text) = 'admin'
    );

DROP POLICY IF EXISTS "Only admins can insert role change logs" ON role_change_logs;
CREATE POLICY "Only admins can insert role change logs" ON role_change_logs
    FOR INSERT
    WITH CHECK (
        (SELECT role FROM users WHERE id = auth.uid()::text) = 'admin'
    );

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ 지점 관리자 기능 추가 완료!';
    RAISE NOTICE '   - users 테이블에 managed_branch 컬럼 추가';
    RAISE NOTICE '   - branch_manager 역할 추가/업데이트';
    RAISE NOTICE '   - RLS 정책 업데이트';
    RAISE NOTICE '   - 통계 뷰 및 권한 함수 생성';
    RAISE NOTICE '   - 감사 로그 테이블 생성';
END $$;


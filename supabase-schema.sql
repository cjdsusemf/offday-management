-- ========================================
-- Offday 관리 시스템 - Supabase 스키마
-- 기존 내부 시스템과의 통합을 고려한 설계
-- ========================================

-- 기존 시스템과의 통합을 위한 확장 스키마 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. Groups 테이블 (기존 시스템의 group)
-- ========================================
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE groups IS '그룹(조직) 테이블 - 기존 시스템의 group_id와 연동';

-- 기본 그룹 데이터 삽입 (⚠️ Roles 테이블 생성 전에 먼저 삽입!)
INSERT INTO groups (id, name, description) VALUES
(1, '기본 그룹', '시스템 기본 그룹')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 2. Roles 테이블 (기존 시스템의 roles와 통합)
-- ========================================
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    priority INTEGER NOT NULL DEFAULT 10,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE roles IS '역할 테이블 - RBAC 시스템, 기존 시스템의 roles와 통합';
COMMENT ON COLUMN roles.permissions IS '권한 목록 JSON 배열';

-- 기본 역할 데이터 삽입
INSERT INTO roles (id, group_id, name, display_name, description, priority, permissions) VALUES
(1, 1, 'admin', '관리자', '시스템 전체 관리 권한', 100, '["*"]'::jsonb),
(2, 1, 'manager', '매니저', '부서 관리 및 승인 권한', 50, '["leave.approve", "leave.reject", "leave.view_all", "employee.view", "employee.edit", "statistics.view", "branch.view", "welfare.grant"]'::jsonb),
(3, 1, 'team_leader', '팀장', '팀 관리 권한', 30, '["leave.approve_team", "leave.reject_team", "leave.view_team", "employee.view_team", "statistics.view_team"]'::jsonb),
(4, 1, 'user', '일반 사용자', '기본 사용자 권한', 10, '["leave.request", "leave.view_own", "profile.view_own", "profile.edit_own"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 3. Branches 테이블 (기존 시스템의 branches와 통합)
-- ========================================
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(32),
    manager VARCHAR(255),
    description TEXT,
    departments TEXT[] DEFAULT '{}',
    leave_calculation_standard VARCHAR(50) DEFAULT 'hire_date',
    master_client_id INTEGER,
    multicase_client_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, name)
);

COMMENT ON TABLE branches IS '지점 테이블 - 기존 시스템의 branches와 통합';
COMMENT ON COLUMN branches.master_client_id IS '기존 시스템의 master_client_id';
COMMENT ON COLUMN branches.multicase_client_id IS '기존 시스템의 multicase_client_id';

-- ========================================
-- 4. Teams 테이블 (기존 시스템의 teams와 통합)
-- ========================================
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE teams IS '팀 테이블 - 기존 시스템의 teams와 연동';

-- ========================================
-- 5. Users 테이블 (기존 시스템의 users와 통합)
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
    
    -- 인증 정보
    login_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    
    -- 개인 정보
    name VARCHAR(255) NOT NULL,
    nickname VARCHAR(255),
    phone VARCHAR(32),
    address VARCHAR(255),
    birth_date DATE,
    profile_image VARCHAR(255),
    profile_message TEXT,
    
    -- 회사 정보
    branch VARCHAR(255),
    department VARCHAR(255),
    team VARCHAR(255),
    position VARCHAR(255),
    hire_date DATE,
    resignation_date DATE,
    
    -- 연차 정보
    annual_leave_days DECIMAL(4,1) DEFAULT 15.0,
    used_leave_days DECIMAL(4,1) DEFAULT 0.0,
    remaining_leave_days DECIMAL(4,1) DEFAULT 15.0,
    welfare_leave_days DECIMAL(4,1) DEFAULT 0.0,
    
    -- 기타 정보
    preferences TEXT,
    status SMALLINT DEFAULT 1,
    point INTEGER DEFAULT 0,
    idx INTEGER DEFAULT 0,
    login_cnt INTEGER DEFAULT 0,
    
    -- 타임스탬프
    join_date DATE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_access TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE users IS '사용자 테이블 - 기존 시스템의 users와 완전 통합';
COMMENT ON COLUMN users.status IS '상태: 0=삭제, 1=활성, 2=비활성';
COMMENT ON COLUMN users.login_id IS '로그인 ID (고유)';

CREATE INDEX idx_users_group_id ON users(group_id);
CREATE INDEX idx_users_team_id ON users(team_id);
CREATE INDEX idx_users_branch_id ON users(branch_id);
CREATE INDEX idx_users_login_id ON users(login_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- ========================================
-- 6. Users_Roles 테이블 (기존 시스템의 users_roles)
-- ========================================
CREATE TABLE IF NOT EXISTS users_roles (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

COMMENT ON TABLE users_roles IS '사용자-역할 연결 테이블 - 기존 시스템의 users_roles와 동일';

CREATE INDEX idx_users_roles_user_id ON users_roles(user_id);
CREATE INDEX idx_users_roles_role_id ON users_roles(role_id);

-- ========================================
-- 7. Leave Requests 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    employee_name VARCHAR(255) NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days DECIMAL(4,1) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    request_date DATE NOT NULL,
    approval_date DATE,
    approver VARCHAR(255),
    rejection_reason TEXT,
    type VARCHAR(20) DEFAULT '휴가',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE leave_requests IS '연차 신청 테이블';
COMMENT ON COLUMN leave_requests.status IS 'pending, approved, rejected';
COMMENT ON COLUMN leave_requests.leave_type IS '연차, 반차, 병가, 경조사, 개인사정, 기타';

CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_start_date ON leave_requests(start_date);

-- ========================================
-- 8. Welfare Leave Grants 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS welfare_leave_grants (
    id SERIAL PRIMARY KEY,
    employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    employee_name VARCHAR(255) NOT NULL,
    days DECIMAL(4,1) NOT NULL,
    reason TEXT NOT NULL,
    grant_date DATE NOT NULL,
    grantor VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE welfare_leave_grants IS '복지휴가 지급 테이블';

CREATE INDEX idx_welfare_leave_grants_employee_id ON welfare_leave_grants(employee_id);
CREATE INDEX idx_welfare_leave_grants_grant_date ON welfare_leave_grants(grant_date);

-- ========================================
-- 9. Settings 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE settings IS '시스템 설정 테이블';

-- 기본 설정 삽입
INSERT INTO settings (key, value, description) VALUES
('leave_calculation_method', '"hire_date"'::jsonb, '연차 계산 방식'),
('default_annual_leave_days', '15'::jsonb, '기본 연차 일수'),
('max_leave_request_days', '10'::jsonb, '최대 신청 가능 일수'),
('require_approval', 'true'::jsonb, '승인 필요 여부')
ON CONFLICT (key) DO NOTHING;

-- ========================================
-- 10. Deleted Users 테이블 (Soft Delete 추적)
-- ========================================
CREATE TABLE IF NOT EXISTS deleted_users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_by VARCHAR(255) NOT NULL
);

COMMENT ON TABLE deleted_users IS '삭제된 사용자 추적 테이블';

-- ========================================
-- Row Level Security (RLS) 정책
-- ========================================

-- Users 테이블 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자는 users 조회 가능
CREATE POLICY "Users can view all users" ON users
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- 사용자는 본인 정보만 수정 가능
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE
    USING (auth.uid() = id);

-- 관리자는 모든 users 수정 가능
CREATE POLICY "Admins can update all users" ON users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'admin'
        )
    );

-- Leave Requests 테이블 RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인의 연차 신청 조회 가능
CREATE POLICY "Users can view own leave requests" ON leave_requests
    FOR SELECT
    USING (employee_id = auth.uid() OR EXISTS (
        SELECT 1 FROM users_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.priority >= 30
    ));

-- 사용자는 연차 신청 가능
CREATE POLICY "Users can insert leave requests" ON leave_requests
    FOR INSERT
    WITH CHECK (employee_id = auth.uid());

-- 매니저/팀장은 연차 승인/거부 가능
CREATE POLICY "Managers can update leave requests" ON leave_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.priority >= 30
        )
    );

-- ========================================
-- Functions - 연차 자동 계산
-- ========================================

-- 사용자의 남은 연차 업데이트 함수
CREATE OR REPLACE FUNCTION update_user_leave_days()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        UPDATE users
        SET 
            used_leave_days = used_leave_days + NEW.days,
            remaining_leave_days = annual_leave_days + welfare_leave_days - (used_leave_days + NEW.days)
        WHERE id = NEW.employee_id;
    ELSIF NEW.status = 'rejected' AND OLD.status = 'approved' THEN
        UPDATE users
        SET 
            used_leave_days = GREATEST(used_leave_days - NEW.days, 0),
            remaining_leave_days = annual_leave_days + welfare_leave_days - GREATEST(used_leave_days - NEW.days, 0)
        WHERE id = NEW.employee_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 연차 승인/거부 시 자동 계산 트리거
CREATE TRIGGER trigger_update_leave_days
AFTER UPDATE ON leave_requests
FOR EACH ROW
WHEN (NEW.status != OLD.status)
EXECUTE FUNCTION update_user_leave_days();

-- 복지휴가 지급 시 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_welfare_leave_days()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET 
        welfare_leave_days = welfare_leave_days + NEW.days,
        remaining_leave_days = annual_leave_days + (welfare_leave_days + NEW.days) - used_leave_days
    WHERE id = NEW.employee_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 복지휴가 지급 트리거
CREATE TRIGGER trigger_welfare_leave_grant
AFTER INSERT ON welfare_leave_grants
FOR EACH ROW
EXECUTE FUNCTION update_welfare_leave_days();

-- ========================================
-- Functions - 타임스탬프 자동 업데이트
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 updated_at 트리거 적용
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================================
-- Views - 편의 뷰
-- ========================================

-- 사용자 전체 정보 뷰 (역할 포함)
CREATE OR REPLACE VIEW v_users_with_roles AS
SELECT 
    u.*,
    COALESCE(
        json_agg(
            json_build_object(
                'role_id', r.id,
                'role_name', r.name,
                'display_name', r.display_name,
                'priority', r.priority
            )
        ) FILTER (WHERE r.id IS NOT NULL),
        '[]'::json
    ) as roles
FROM users u
LEFT JOIN users_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id;

-- 연차 신청 통계 뷰
CREATE OR REPLACE VIEW v_leave_statistics AS
SELECT 
    DATE_TRUNC('month', start_date) as month,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    SUM(days) FILTER (WHERE status = 'approved') as total_days_used
FROM leave_requests
GROUP BY DATE_TRUNC('month', start_date)
ORDER BY month DESC;

-- ========================================
-- 완료
-- ========================================

COMMENT ON DATABASE postgres IS 'Offday 관리 시스템 - 기존 시스템과 완전 통합';

-- 스키마 버전 정보
INSERT INTO settings (key, value, description) VALUES
('schema_version', '"1.0.0"'::jsonb, 'DB 스키마 버전'),
('integration_mode', '"hybrid"'::jsonb, '기존 시스템과 통합 모드'),
('last_migration', to_jsonb(NOW()), '마지막 마이그레이션 일시')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;


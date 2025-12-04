-- 지점 관리자 기능 추가 - 최소한의 안전한 업데이트
-- 실행 날짜: 2025-12-04
-- ✅ 기존 데이터와 충돌하지 않는 안전한 버전

-- ============================================
-- 1단계: users 테이블에 managed_branch 컬럼 추가
-- ============================================
DO $$
BEGIN
    -- managed_branch 컬럼이 없으면 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'managed_branch'
    ) THEN
        ALTER TABLE users ADD COLUMN managed_branch VARCHAR(100);
        RAISE NOTICE '✅ users.managed_branch 컬럼 추가 완료';
    ELSE
        RAISE NOTICE 'ℹ️  users.managed_branch 컬럼이 이미 존재합니다';
    END IF;
END $$;

-- 컬럼 설명 추가
COMMENT ON COLUMN users.managed_branch IS '지점 관리자가 관리하는 지점명 (branch_manager 역할일 때만 사용)';

-- ============================================
-- 2단계: roles 테이블에 branch_manager 역할 추가
-- ============================================
DO $$
DECLARE
    max_id INTEGER;
    role_exists BOOLEAN;
BEGIN
    -- branch_manager 역할이 이미 존재하는지 확인
    SELECT EXISTS(SELECT 1 FROM roles WHERE name = 'branch_manager') INTO role_exists;
    
    IF NOT role_exists THEN
        -- 기존 최대 ID 확인
        SELECT COALESCE(MAX(id), 0) + 1 INTO max_id FROM roles;
        
        -- 새로운 역할 추가
        INSERT INTO roles (id, name, display_name, description, priority, created_at, updated_at)
        VALUES (
            max_id,
            'branch_manager',
            '지점 관리자',
            '지점 내 승인 및 관리 권한',
            40,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ branch_manager 역할 추가 완료 (ID: %)', max_id;
    ELSE
        -- 이미 존재하면 정보만 업데이트
        UPDATE roles 
        SET 
            display_name = '지점 관리자',
            description = '지점 내 승인 및 관리 권한',
            priority = 40,
            updated_at = NOW()
        WHERE name = 'branch_manager';
        
        RAISE NOTICE 'ℹ️  branch_manager 역할이 이미 존재합니다 (정보 업데이트 완료)';
    END IF;
END $$;

-- ============================================
-- 3단계: 인덱스 추가
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_managed_branch ON users(managed_branch);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

DO $$
BEGIN
    RAISE NOTICE '✅ 인덱스 추가 완료';
END $$;

-- ============================================
-- 4단계: 감사 로그 테이블 생성
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_role_change_logs_user_id ON role_change_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_role_change_logs_changed_at ON role_change_logs(changed_at DESC);

DO $$
BEGIN
    RAISE NOTICE '✅ 감사 로그 테이블 생성 완료';
END $$;

-- ============================================
-- 5단계: RLS 정책 업데이트 (선택 사항)
-- ============================================
-- ⚠️ 참고: RLS 정책은 필요 시 나중에 추가 가능
-- ⚠️ 현재는 LocalStorage 기반이므로 필수는 아님

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '🎉 지점 관리자 기능 추가 완료!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ 완료된 작업:';
    RAISE NOTICE '   1. users.managed_branch 컬럼 추가';
    RAISE NOTICE '   2. branch_manager 역할 추가';
    RAISE NOTICE '   3. 인덱스 추가';
    RAISE NOTICE '   4. 감사 로그 테이블 생성';
    RAISE NOTICE '';
    RAISE NOTICE '📋 다음 단계:';
    RAISE NOTICE '   1. 애플리케이션 새로고침';
    RAISE NOTICE '   2. 관리자로 로그인';
    RAISE NOTICE '   3. 직원관리 → 지점 관리자 지정';
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
END $$;

-- ============================================
-- 6단계: 확인 쿼리 (선택 사항)
-- ============================================
-- 다음 쿼리를 별도로 실행하여 결과를 확인하세요:

-- 1) managed_branch 컬럼 확인
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'managed_branch';

-- 2) branch_manager 역할 확인
-- SELECT * FROM roles WHERE name = 'branch_manager';

-- 3) 모든 역할 확인
-- SELECT id, name, display_name, priority FROM roles ORDER BY priority DESC;


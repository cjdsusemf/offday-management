-- 지점 관리자 기능 추가 - 기본 스키마만 (RLS 정책 제외)
-- 실행 날짜: 2025-12-04
-- ✅ 가장 안전한 최소 버전 (테이블 구조 변경만)

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
DO $$
BEGIN
    EXECUTE 'COMMENT ON COLUMN users.managed_branch IS ''지점 관리자가 관리하는 지점명 (branch_manager 역할일 때만 사용)''';
    RAISE NOTICE '✅ 컬럼 설명 추가 완료';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ℹ️  컬럼 설명 추가 건너뜀';
END $$;

-- ============================================
-- 2단계: 인덱스 추가 (성능 최적화)
-- ============================================
DO $$
BEGIN
    -- managed_branch 인덱스
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_users_managed_branch'
    ) THEN
        CREATE INDEX idx_users_managed_branch ON users(managed_branch);
        RAISE NOTICE '✅ idx_users_managed_branch 인덱스 추가 완료';
    ELSE
        RAISE NOTICE 'ℹ️  idx_users_managed_branch 인덱스가 이미 존재합니다';
    END IF;
END $$;

-- ============================================
-- 3단계: 감사 로그 테이블 생성 (선택 사항)
-- ============================================
DO $$
BEGIN
    -- role_change_logs 테이블 생성
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'role_change_logs'
    ) THEN
        CREATE TABLE role_change_logs (
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
        
        CREATE INDEX idx_role_change_logs_user_id ON role_change_logs(user_id);
        CREATE INDEX idx_role_change_logs_changed_at ON role_change_logs(changed_at DESC);
        
        RAISE NOTICE '✅ role_change_logs 테이블 생성 완료';
    ELSE
        RAISE NOTICE 'ℹ️  role_change_logs 테이블이 이미 존재합니다';
    END IF;
END $$;

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '🎉 데이터베이스 업데이트 완료!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ 완료된 작업:';
    RAISE NOTICE '   1. users.managed_branch 컬럼 추가';
    RAISE NOTICE '   2. 인덱스 추가';
    RAISE NOTICE '   3. 감사 로그 테이블 생성';
    RAISE NOTICE '';
    RAISE NOTICE '📋 다음 단계:';
    RAISE NOTICE '   1. 웹 애플리케이션 새로고침';
    RAISE NOTICE '   2. 관리자로 로그인';
    RAISE NOTICE '   3. 메인관리 → 직원관리';
    RAISE NOTICE '   4. 지점 관리자 지정 버튼(🛡️) 클릭';
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
END $$;

-- ============================================
-- 확인 쿼리 (선택 사항 - 별도 실행)
-- ============================================
-- 다음 쿼리를 별도로 실행하여 결과를 확인하세요:

-- 1) users 테이블 구조 확인
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' 
-- ORDER BY ordinal_position;

-- 2) managed_branch 컬럼 확인
-- SELECT column_name, data_type, character_maximum_length
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'managed_branch';

-- 3) 인덱스 확인
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'users' AND indexname LIKE '%managed%';

-- 4) role_change_logs 테이블 확인
-- SELECT * FROM role_change_logs LIMIT 1;


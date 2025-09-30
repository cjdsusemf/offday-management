// 테스트용: localStorage 초기화 및 새 데이터 생성
console.log('데이터 초기화 중...');

// localStorage 초기화
localStorage.removeItem('employees');
localStorage.removeItem('leaveRequests');
localStorage.removeItem('settings');

// 새로운 테스트 데이터 생성
const testEmployees = [
    {
        id: 1,
        name: '김철수',
        department: '개발팀',
        branch: '본사',
        position: '대리',
        email: 'kim@company.com',
        phone: '010-1234-5678',
        hireDate: '2022-01-15',
        annualLeaveDays: 15,
        usedLeaveDays: 0,
        remainingLeaveDays: 15
    },
    {
        id: 2,
        name: '이영희',
        department: '마케팅팀',
        branch: '강남점',
        position: '과장',
        email: 'lee@company.com',
        phone: '010-2345-6789',
        hireDate: '2021-03-20',
        annualLeaveDays: 20,
        usedLeaveDays: 0,
        remainingLeaveDays: 20
    },
    {
        id: 3,
        name: '박민수',
        department: '영업팀',
        branch: '부산점',
        position: '부장',
        email: 'park@company.com',
        phone: '010-3456-7890',
        hireDate: '2020-06-10',
        annualLeaveDays: 25,
        usedLeaveDays: 0,
        remainingLeaveDays: 25
    }
];

const testRequests = [
    {
        id: 1,
        employeeId: 1,
        employeeName: '김철수',
        startDate: '2024-02-01',
        endDate: '2024-02-03',
        days: 3,
        reason: '개인 휴가',
        status: 'pending',
        requestDate: '2024-01-28'
    },
    {
        id: 2,
        employeeId: 2,
        employeeName: '이영희',
        startDate: '2024-02-05',
        endDate: '2024-02-05',
        days: 1,
        reason: '의료진료',
        status: 'pending',
        requestDate: '2024-01-30'
    },
    {
        id: 3,
        employeeId: 3,
        employeeName: '박민수',
        startDate: '2024-02-10',
        endDate: '2024-02-12',
        days: 3,
        reason: '가족 행사',
        status: 'pending',
        requestDate: '2024-02-01'
    },
    {
        id: 4,
        employeeId: 1,
        employeeName: '김철수',
        startDate: '2024-02-15',
        endDate: '2024-02-16',
        days: 2,
        reason: '개인 사정',
        status: 'pending',
        requestDate: '2024-02-05'
    },
    {
        id: 5,
        employeeId: 2,
        employeeName: '이영희',
        startDate: '2024-02-20',
        endDate: '2024-02-22',
        days: 3,
        reason: '여행',
        status: 'pending',
        requestDate: '2024-02-10'
    }
];

// 데이터 저장
localStorage.setItem('employees', JSON.stringify(testEmployees));
localStorage.setItem('leaveRequests', JSON.stringify(testRequests));

console.log('새로운 테스트 데이터가 생성되었습니다!');
console.log('페이지를 새로고침하세요.');

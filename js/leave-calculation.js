// 연차 계산 함수들
class LeaveCalculation {
    constructor() {
        this.dataManager = window.dataManager;
    }

    // 월차 계산 - 한달 만근시 +1일, 최대 11일까지
    calculateMonthlyLeave(hireDate, currentDate) {
        const hire = new Date(hireDate);
        const current = new Date(currentDate);
        
        if ((current - hire) < 30 * 24 * 60 * 60 * 1000) { // 1개월 미만
            return 0;
        }

        // 입사일부터 현재까지의 개월 수 계산
        let monthsWorked = 0;
        let currentMonth = new Date(hire);

        while (currentMonth <= current) {
            // 다음 달의 같은 날짜 계산 (안전한 방법)
            let nextMonth;
            if (currentMonth.getMonth() === 11) {
                nextMonth = new Date(currentMonth.getFullYear() + 1, 0, 1);
            } else {
                nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
            }
            
            // 다음 달의 마지막 날 계산
            let lastDay;
            if (nextMonth.getMonth() === 11) {
                lastDay = new Date(nextMonth.getFullYear() + 1, 0, 1);
            } else {
                lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 1);
            }
            lastDay.setDate(lastDay.getDate() - 1);
            
            // 입사일과 같은 날짜로 설정 (없으면 마지막 날로)
            const targetDay = Math.min(hire.getDate(), lastDay.getDate());
            nextMonth.setDate(targetDay);

            // 다음 달의 같은 날짜가 현재 날짜보다 작거나 같으면 월차 추가
            if (current >= nextMonth) {
                monthsWorked += 1;
                currentMonth = nextMonth;
            } else {
                break;
            }
        }

        return Math.min(11, monthsWorked);
    }

    // 입사일 기준 연차 계산
    calculateAnnualLeaveByHireDate(hireDate, currentDate) {
        const hire = new Date(hireDate);
        const current = new Date(currentDate);
        
        // 1년 미만 근무자 (월차)
        if ((current - hire) < 365 * 24 * 60 * 60 * 1000) {
            return this.calculateMonthlyLeave(hireDate, currentDate);
        }
        
        // 1년 이상 근무자
        let yearsWorked = current.getFullYear() - hire.getFullYear();
        if ((current.getMonth() < hire.getMonth()) || 
            (current.getMonth() === hire.getMonth() && current.getDate() < hire.getDate())) {
            yearsWorked -= 1;
        }
        
        if (yearsWorked < 1) {
            return 0;
        } else if (yearsWorked >= 1) {
            const additionalDays = Math.floor((yearsWorked - 1) / 2);
            return Math.min(25, 15 + additionalDays);
        } else {
            return 0;
        }
    }

    // 회계연도 기준 연차 계산
    calculateAnnualLeaveByFiscalYear(hireDate, currentDate) {
        const hire = new Date(hireDate);
        const current = new Date(currentDate);
        
        // 입사연도 (월차만 발생)
        if (current.getFullYear() === hire.getFullYear()) {
            return this.calculateMonthlyLeave(hireDate, currentDate);
        }
        
        // 입사 2년차: [(입사년 재직일수÷365일 또는 366일)×15일] + 월차발생
        if (current.getFullYear() === hire.getFullYear() + 1) {
            // 입사년 재직일수 계산 (입사일부터 해당년도 12월 31일까지)
            const yearEnd = new Date(hire.getFullYear(), 11, 31);
            const firstYearDays = Math.floor((yearEnd - hire) / (24 * 60 * 60 * 1000)) + 1;
            
            // 윤년 여부 판단하여 총 일수 결정
            const isLeapYear = (hire.getFullYear() % 4 === 0 && hire.getFullYear() % 100 !== 0) || 
                              (hire.getFullYear() % 400 === 0);
            const daysInYear = isLeapYear ? 366 : 365;
            
            // (입사년 재직일수÷365일 또는 366일)×15일
            const proportionalAnnual = (firstYearDays / daysInYear) * 15;
            
            // 2년차 월차 계산
            let secondYearMonthly = 0;
            let firstMonthlyDate = new Date(hire.getFullYear() + 1, 0, hire.getDate());
            
            if (current >= firstMonthlyDate) {
                let currentMonthlyDate = firstMonthlyDate;
                while (currentMonthlyDate <= current) {
                    secondYearMonthly += 1;
                    // 다음 달의 같은 날짜 계산
                    if (currentMonthlyDate.getMonth() === 11) {
                        currentMonthlyDate = new Date(currentMonthlyDate.getFullYear() + 1, 0, hire.getDate());
                    } else {
                        currentMonthlyDate = new Date(currentMonthlyDate.getFullYear(), currentMonthlyDate.getMonth() + 1, hire.getDate());
                    }
                    
                    // 날짜가 존재하지 않는 경우 마지막 날로 조정
                    const lastDayOfMonth = new Date(currentMonthlyDate.getFullYear(), currentMonthlyDate.getMonth() + 1, 0);
                    if (currentMonthlyDate.getDate() !== hire.getDate()) {
                        currentMonthlyDate.setDate(Math.min(hire.getDate(), lastDayOfMonth.getDate()));
                    }
                }
            }
            
            // 2년차 월차는 최대 10일까지만
            const actualSecondYearMonthly = Math.min(secondYearMonthly, 10);
            
            return proportionalAnnual + actualSecondYearMonthly;
        }
        
        // 3년차 이상: 15일 + 추가 연차 (월차 제외)
        else {
            // 기본 연차 15일
            const baseAnnual = 15;
            
            // 추가 연차 (2년마다 1일씩, 최대 25일까지)
            const additionalYears = current.getFullYear() - hire.getFullYear() - 2;
            let additionalDays = 0;
            if (additionalYears > 0) {
                additionalDays = Math.min(10, Math.floor(additionalYears / 2));
            }
            
            console.log(`회계연도 기준 계산 - 입사년: ${hire.getFullYear()}, 현재년: ${current.getFullYear()}, 추가년수: ${additionalYears}`);
            
            console.log(`회계연도 기준 3년차 이상 - 기본: ${baseAnnual}, 추가: ${additionalDays}, 총: ${baseAnnual + additionalDays}`);
            
            // 회계연도 기준에서는 3년차 이상부터는 월차를 별도로 계산하지 않음
            return baseAnnual + additionalDays;
        }
    }

    // 지점별 연차 계산 기준에 따른 연차 계산
    calculateLeaveByBranchStandard(employeeId, currentDate = new Date()) {
        const employee = this.dataManager.employees.find(emp => emp.id === employeeId);
        
        if (!employee) {
            console.log('직원 데이터를 찾을 수 없음, 기본 15일 반환');
            return 15;
        }

        const hireDate = employee.hireDate || employee.joinDate;
        if (!hireDate) {
            console.log('입사일 정보 없음, 기본 15일 반환');
            return 15;
        }

        // 지점 정보 가져오기
        const branch = this.dataManager.branches.find(br => br.name === employee.branch);
        if (!branch || !branch.leaveCalculationStandard) {
            // 지점 설정이 없는 경우 입사일 기준으로 계산
            console.log('지점 설정 없음, 입사일 기준으로 계산');
            return this.calculateAnnualLeaveByHireDate(hireDate, currentDate);
        }

        console.log(`연차 계산 - 직원: ${employee.name}, 지점: ${employee.branch}, 기준: ${branch.leaveCalculationStandard}`);
        console.log(`입사일: ${hireDate}, 현재일: ${currentDate.toISOString().split('T')[0]}`);

        let calculatedDays;
        if (branch.leaveCalculationStandard === 'fiscal_year') {
            // 회계연도 기준 연차 계산
            calculatedDays = this.calculateAnnualLeaveByFiscalYear(hireDate, currentDate);
            console.log(`회계연도 기준 계산 결과: ${calculatedDays}일`);
        } else {
            // 입사일 기준 연차 계산 (기본값)
            calculatedDays = this.calculateAnnualLeaveByHireDate(hireDate, currentDate);
            console.log(`입사일 기준 계산 결과: ${calculatedDays}일`);
        }
        
        return calculatedDays;
    }
}

// 전역 인스턴스 생성
window.LeaveCalculation = new LeaveCalculation();

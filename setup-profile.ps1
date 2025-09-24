# PowerShell 프로필에 Save-ClipboardFile 함수를 자동 등록하는 스크립트

Write-Host "?? PowerShell 프로필 설정을 시작합니다..." -ForegroundColor Yellow

# 프로필 경로 확인
$profilePath = $PROFILE

# 프로필 디렉토리가 없으면 생성
$profileDir = Split-Path $profilePath -Parent
if (!(Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    Write-Host "?? 프로필 디렉토리를 생성했습니다: $profileDir" -ForegroundColor Green
}

# 함수 정의
$functionCode = @'
# 클립보드 내용을 파일로 저장하는 함수
function Save-ClipboardFile {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path
    )
    
    try {
        # PowerShell 버전 확인
        $psVersion = $PSVersionTable.PSVersion.Major
        
        if ($psVersion -ge 7) {
            # PowerShell 7 이상에서는 -Raw 옵션 사용
            $clipboardContent = Get-Clipboard -Raw
        } else {
            # Windows PowerShell에서는 기본 Get-Clipboard 사용
            $clipboardContent = Get-Clipboard
        }
        
        # UTF-8 인코딩으로 파일 저장
        $clipboardContent | Out-File -FilePath $Path -Encoding UTF8 -Force
        
        Write-Host "? 파일이 성공적으로 저장되었습니다: $Path" -ForegroundColor Green
        Write-Host "?? 저장된 내용 크기: $($clipboardContent.Length) 문자" -ForegroundColor Cyan
        
    } catch {
        Write-Error "? 파일 저장 중 오류가 발생했습니다: $($_.Exception.Message)"
    }
}

# alias 등록
Set-Alias -Name scf -Value Save-ClipboardFile

# AX : LOS DIEZ — PDF 복구판 (2026-11-24)

화면 디자인은 유지하고 PDF 추출·진단·재추출 기능을 추가한 Windows 로컬 서버입니다. Node.js 외의 프로그램 설치 없이 일반 텍스트 PDF를 읽도록 Mozilla PDF.js 6.5.438과 필요한 한글 CMap·글꼴·라이선스를 함께 배포합니다. PDF를 외부 서비스로 보내지 않습니다.

## 먼저 알아둘 점

- **Node.js 22.13 이상(권장: 현재 LTS 24)**이 필요합니다. [공식 설치 페이지](https://nodejs.org/)에서 LTS를 설치하세요. 이전 Node.js 20에서는 시작을 중단하고 업그레이드를 안내합니다.
- Poppler는 선택입니다. 일반 텍스트 PDF는 내장 PDF.js로 먼저 처리합니다.
- 스캔 이미지·글자 윤곽선만 있는 PDF는 별도 OCR이 필요합니다. OCR 기능은 이번 패키지에 포함하지 않았습니다. 빈 본문을 성공으로 표시하지 않습니다.
- 사용자 Windows PC의 설치 상태와 AHMN·안연사 PDF 실물은 이 클라우드에서 확인할 수 없었습니다. 설치 부족·암호·손상·OCR 필요 여부는 새 진단 기능으로 구분합니다.

## 다운로드와 기존 문서 가져오기

1. 이 브랜치의 **Code → Download ZIP**으로 받아 **새 폴더**에 압축을 완전히 풉니다. 이전 폴더에 덮어쓰지 마세요.
2. 기존 서버 창에서 **Ctrl+C**로 서버를 종료합니다. 이전 폴더와 `saved-world-lab`은 삭제하지 마세요.
3. 새 `ax-los-diez-local-server` 폴더의 **IMPORT-OLD-DATA.cmd**를 실행합니다. 새 서버를 먼저 실행하지 마세요.
4. 이전 `saved-world-lab` 폴더의 전체 경로를 붙여넣고 Enter를 누릅니다. 예: `C:\Users\이름\Downloads\이전버전\ax-los-diez-local-server\saved-world-lab`.
5. 이 도구는 파일을 **복사**하고 SHA-256을 비교합니다. 기존 데이터는 그대로 남습니다. 새 저장 폴더가 이미 있으면 덮어쓰지 않고 중단합니다. 이 경우 다시 새 폴더에 ZIP을 풀어 가져오세요.
6. 새 폴더에서 **START-WINDOWS.cmd**를 실행합니다. 브라우저에서 **http://localhost:33000**을 엽니다.
7. AHMN 또는 안연사를 선택하고 기존 PDF를 엽니다. **텍스트 다시 추출 → 다시 추출 시작**을 누릅니다. 파일을 다시 업로드할 필요가 없습니다.
8. 본문을 확인하고 새로고침한 뒤 다시 엽니다. **추출 이력**에서 상태와 오류 코드를 확인할 수 있습니다.

자동 가져오기 대신 탐색기에서 이전 `saved-world-lab` 폴더를 새 앱 폴더 안으로 전체 복사해도 됩니다. 서버를 종료한 상태에서, 아직 새 저장 폴더가 없을 때 복사하세요. 일부 문서 폴더만 옮기면 승인 이력이 누락될 수 있습니다.

macOS/Linux는 폴더의 터미널에서 `sh START-MAC-LINUX.command`로 실행합니다. 가져오기 도구는 `node scripts/import-old-data.mjs`로 실행할 수 있습니다.

## PDF 진단

WORLD LAB의 **PDF 진단** 버튼은 서버가 실제 사용 중인 Node.js 버전, 내장 추출기 준비 여부, Poppler 설치 여부, 실행 경로/명령, 버전 또는 오류 코드를 보여줍니다. 설치된 것을 확인하지 못하면 설치됐다고 표시하지 않습니다.

Windows의 **CHECK-PDF-WINDOWS.cmd**를 실행하면 같은 정보를 보고 `pdf-diagnostics.json`으로 남깁니다. 이 보고서에는 PC 프로그램 경로가 들어가므로 공유 전 확인하세요.

이전 버전은 `pdftotext` 실행 파일 없음(ENOENT), 실행 권한 문제, 암호 PDF, 손상 PDF 등을 모두 하나의 일반 오류로 표시했습니다. 이전 오류 메시지만으로 사용자 PC의 실제 원인을 확정할 수 없습니다.

## Poppler를 선택적으로 설치하려면

내장 추출기로 읽히면 설치하지 않아도 됩니다. 필요하다면:

1. [Windows Poppler 배포 페이지](https://github.com/oschwartz10612/poppler-windows/releases)에서 최신 Release ZIP을 받습니다. 이는 별도 Windows 배포본입니다.
2. 예를 들어 `C:\Tools\poppler`에 압축을 풉니다. 버전 폴더가 한 단계 더 생길 수 있습니다.
3. 탐색기에서 실제 **pdftotext.exe**를 찾습니다. 보통 `Library\bin` 안에 있습니다.
4. Windows 검색에서 **환경 변수 편집 → 환경 변수 → 사용자 변수 Path → 편집 → 새로 만들기**를 열어, 실제 `pdftotext.exe`가 든 폴더 경로를 추가합니다. EXE 파일 자체가 아닌 폴더입니다.
5. 기존 서버 창을 닫고 다시 실행한 다음 **PDF 진단**에서 설치 상태와 경로를 확인합니다. PATH 변경 전에 열린 서버에는 새 설정이 적용되지 않습니다.

고급 설정으로 `AX_PDFTOTEXT_PATH` 환경 변수에 pdftotext.exe의 전체 경로를 지정할 수도 있습니다. 팝플러는 내장 추출기가 실패하거나 본문을 찾지 못했을 때만 보조로 사용합니다.

## 원본·텍스트·이력 보존

기존 `original.pdf`, `text.txt`, `metadata.json`은 재추출로 변경하지 않습니다. 새 결과는 같은 문서의 `extractions/<추출ID>/text.txt`와 `extraction.json`에 추가합니다. 파일 해시·추출기·시각·오류 코드도 기록합니다. 실패한 재추출이 이미 성공한 본문을 빈 텍스트로 대체하지 않습니다.

승인된 Original의 본문은 고정되어 재추출을 거절합니다. 필요한 경우 사용자 판단으로 새 후보를 등록해야 합니다. PDF 복구 작업이 자동 승인하거나 정본 버전을 바꾸지는 않습니다. 서버를 다시 시작해도 저장된 추출 이력을 읽습니다.

`전체 세계관 백업 ZIP`은 기존 방식대로 Python 3가 필요합니다. PDF 업로드·추출·재추출·가져오기에는 Python 또는 Poppler 설치가 필요하지 않습니다. 별도로 `saved-world-lab` 폴더 전체를 안전한 디스크에 복사해 둘 수도 있습니다. GitHub에는 개인 문서나 저장 데이터를 업로드하지 않습니다.

## 검증 범위

Linux / Node.js 24에서 Poppler를 일부러 찾을 수 없게 한 환경으로 한글·여러 쪽 PDF 추출, 기존 실패 자료 복구, 원본 보존, 암호/스캔 구분, 승인된 원본 차단, 서버 재시작 후 읽기와 브라우저 본문 표시를 검사합니다. 사용자 Windows PC·실제 AHMN/안연사 PDF의 성공을 확인했다고 주장하지 않습니다.

개발 테스트: `node --test tests/pdf-recovery.test.mjs tests/world-storage.test.mjs` (시험 PDF 생성에는 개발용 Python/reportlab 필요). 브라우저 테스트는 Playwright와 Chromium이 필요합니다. `AX_PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`로 경로를 지정할 수 있습니다. 검증 기록은 `verification/`에 있습니다.

에이전트 자동 실행과 모델 호출은 이 PDF 복구판에 포함하지 않았습니다. 기존 에이전트·이미지 기록은 DEMO이며 실제 파일은 TEST ONLY 또는 실제 등록 문서로 구분합니다.

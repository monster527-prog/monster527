# AX : LOS DIEZ — 로컬 실행판

기존 프로젝트와 분리된 대시보드·문서 저장 서버입니다. 기존 에이전트 파일, 실제 세계관 문서, 참고 서적 전문 및 비밀키는 포함하지 않습니다.

## 다운로드

GitHub 저장소의 **Code → Download ZIP**을 선택한 뒤 압축을 완전히 풀고, 이 `ax-los-diez-local-server` 폴더를 여세요. HTML 파일을 직접 열면 실제 업로드를 사용할 수 없습니다.

## 실행

1. [Node.js LTS](https://nodejs.org/) 20 이상을 설치합니다.
2. Windows에서는 `START-WINDOWS.cmd`를 엽니다.
3. macOS/Linux에서는 이 폴더의 터미널에서 `sh START-MAC-LINUX.command`를 실행합니다.
4. 같은 PC의 브라우저에서 **http://localhost:33000**을 엽니다. 실행 창을 닫으면 서버도 종료됩니다.

## 저장 확인

WORLD LAB → AHMN → Development → 문서 등록에서 `data-samples/TEST_ONLY_WORLD_LAB.md`를 선택하고 TEST ONLY를 체크하세요. 등록 후 새로고침하고 같은 문서를 다시 열어 보세요. 원본 파일과 추출 텍스트는 `saved-world-lab` 폴더에 보관됩니다. 이 폴더를 삭제하지 마세요.

TXT/MD는 Node.js로 처리합니다. PDF 텍스트 추출에는 Poppler의 `pdftotext`, 백업 ZIP 생성에는 Python 3가 추가로 필요합니다. 스캔 PDF OCR은 포함하지 않습니다. 개인 PC에서만 접속하도록 구성했습니다. 실제 정본은 사용자 승인 이후에만 등록됩니다.

Linux/Node에서 압축 해제·서버 실행·업로드·재읽기를 검사했습니다. 사용자의 PC 다운로드 및 Windows/macOS 실행은 아직 확인하지 못했습니다.

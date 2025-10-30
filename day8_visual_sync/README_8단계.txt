[Day 8] 앱 시각화 연동 테스트 — 단계별 실행 가이드
기준 폴더: day8_visual_sync/

⚠️ 주의: 터미널에서 명령 실행 전에 반드시 "파이썬 인터프리터 종료"를 확인하세요. (>>> 프롬프트가 보이면 exit())

1) Python 로컬 동기화 + 차트 생성
---------------------------------
PS> cd day8_visual_sync
PS> python visual_sync_test.py

출력물:
- synced_progress.json
- progress_chart.png
- accuracy_chart.png
- tone_chart.png

2) Electron으로 로컬 JSON 로드 확인
-----------------------------------
(처음 1회만)
PS> npm init -y
PS> npm i electron --save-dev

실행:
PS> npx electron electron_view_test.js

확인 포인트:
- 앱 창이 열리고 synced_progress.json 내용이 표시됨
- 콘솔에 JSON 데이터 로그 출력

3) 다음 단계 예고 (Day 9)
--------------------------
- Electron 창에서 Canvas 그래프 표시 추가
- Compact Feedback Logic (발음) 결과를 막대 그래프로 시각화
- tone/accuracy 임계값 경고 라벨 추가

문제 발생 시 체크리스트:
- Python 실행 전 인터프리터 종료(>>> 프롬프트 없음)
- visual_sync_test.py 실행 후 synced_progress.json이 생성됐는지
- node_modules 설치(Electron) 완료 여부

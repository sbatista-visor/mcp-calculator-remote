# Calculator MCP Remote Server

URL Integration을 위한 HTTP 기반 MCP 서버입니다.

## 🚀 실행

```bash
cd C:\AI\git_prj\mcp_calculator_remote
npm install
npm start
```

## 🔗 Claude URL Integration 설정

1. **Claude 설정** → **통합 추가** → **URL로 연결**
2. **URL**: `http://localhost:3000`
3. **이름**: "Calculator" 

## 📊 엔드포인트

- `GET /` - 서버 정보
- `POST /initialize` - MCP 초기화  
- `POST /tools/list` - 도구 목록
- `POST /tools/call` - 도구 실행

## 📋 로그 확인

모든 요청/응답이 `mcp_remote.log` 파일에 기록됩니다.

## 🧮 테스트

서버 실행 후 Claude에서:
- "15 더하기 27은 얼마야?"
- "100 나누기 4는?"

## 🔍 문제 해결

1. **포트 충돌**: PORT 환경변수로 다른 포트 사용
2. **CORS 오류**: 이미 모든 origin 허용 설정됨
3. **로그 확인**: `mcp_remote.log` 파일에서 상세 로그 확인

# 게임 개발 프레임워크

게임 프로젝트에 반복적으로 사용되는 자동화 파이프라인을 제공하는 기술 중립적 프레임워크입니다.  
클라이언트/서버 스택을 직접 선택하면서, **게임 메타 데이터 · 패킷 프로토콜 · DB 스키마** 동기화를 자동화합니다.

---

## 지원 환경

| 구분 | 지원 대상 |
|------|-----------|
| 클라이언트 | Unity (C#), 기타 |
| 서버 | ASP.NET (C#), C++ Boost.Asio, 기타 |
| 데이터베이스 | PostgreSQL, MySQL, SQLite |
| 필수 도구 | Node.js 18+ |

---

## 빠른 시작

```bash
# 1. 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 DB 접속 정보와 GitHub 토큰을 입력하세요

# 2. 의존성 설치 (DB 드라이버 선택 설치)
npm install

# 3. 전체 생성 파이프라인 실행
tools/gen-all.bat      # Windows
sh tools/gen-all.sh    # Unix / Mac
```

---

## 디렉터리 구조

```
game-development-framework/
├── shared/
│   ├── datas/         게임 메타 데이터 원본 (CSV) → 클라이언트/서버 JSON 생성
│   ├── packets/       패킷 프로토콜 정의 (JSON IDL) → 클라이언트/서버 코드 생성
│   └── types/         공통 Enum · 상수 정의
├── server/
│   └── db/            DB 런타임 스키마 (schema.json) → DB CREATE/ALTER TABLE 생성
├── client/            클라이언트 앱 (스택은 사용자 결정)
├── tools/             자동화 스크립트 (gen-data, gen-packets, gen-orm)
├── framework.ini      비밀이 아닌 설정값 (경로, 언어, 타입 매핑 등)
└── .env               비밀 설정값 (DB 패스워드, 토큰 등) — 절대 커밋 금지
```

> `_` 접두사 파일/디렉터리는 모든 gen 도구에서 자동으로 건너뜁니다 (예시·초안용).

---

## 설정 파일

### `.env` — 비밀 설정 (커밋 금지)

```bash
DB_TYPE=postgresql      # postgresql | mysql | sqlite
DB_HOST=localhost
DB_PORT=5432
DB_NAME=game_db
DB_USER=game_user
DB_PASSWORD=...

GITHUB_TOKEN=...
GITHUB_REPO_URL=https://github.com/{owner}/{repo}
GITHUB_DEFAULT_PROJECT={project-name}
GITHUB_DEFAULT_ASSIGNEE={github-username}
```

### `framework.ini` — 일반 설정 (git 관리)

```ini
[packet-gen]
client_language = csharp   ; csharp | cpp
server_language = csharp

[orm-gen]
dry_run = true   ; true=SQL 파일만 생성 | false=DB에 직접 실행
```

---

## 생성 파이프라인

| 명령 | 소스 | 출력 |
|------|------|------|
| `npm run gen:data` | `shared/datas/**/*.csv` | `*/generated/data/**/*.json` |
| `npm run gen:packets` | `shared/packets/*.packet.json` | `*/generated/packets/*` |
| `npm run gen:orm` | `server/db/schema.json` | DB `CREATE/ALTER TABLE` + 마이그레이션 SQL |
| `npm run gen:all` | 위 전체 순서 실행 | — |

> **생성된 파일(`*/generated/`)은 절대 직접 수정하지 마세요.** 소스를 수정하고 gen을 재실행하세요.

---

## CSV 포맷 (`shared/datas/`)

파일명 규칙: `[도메인]_[테이블].csv`  예) `characters_base.csv`, `items_effects.csv`

```
1행: 필드명       — camelCase, JSON 키·코드 변수로 사용
2행: 타겟 스코프  — C (클라이언트 전용) | S (서버 전용) | CS (양쪽)
3행: 정규화 타입  — int8/16/32/64, uint8/16/32/64, float, double, bool, string, string(N), [EnumName]
4행: 제약 조건    — PK, FK:[테이블], NN, UQ, IDX, AUTO (콤마 구분 조합 가능)
5행~: 실제 데이터
```

**예시 (`items/_items.csv`):**

```csv
id,name,itemType,attackPower,price,clientDisplayName,serverDropRate
CS,CS,CS,CS,S,C,S
int32,string,ItemType,int32,int32,string,float
PK,NN,NN,,,,NN
1001,iron_sword,WEAPON,15,100,Iron Sword,0.05
```

**인코딩: UTF-8 (BOM 없음)**
- Google Sheets → CSV로 다운로드 (권장)
- Excel → 다른 이름으로 저장 → `CSV UTF-8 (쉼표로 분리)` 선택

---

## 패킷 프로토콜 포맷 (`shared/packets/`)

파일명 규칙: `[도메인].packet.json`  예) `player.packet.json`

```json
{
  "namespace": "player",
  "packets": [
    {
      "id": 1001,
      "name": "PlayerMoveRequest",
      "direction": "c2s",
      "fields": [
        { "name": "x",         "type": "float" },
        { "name": "y",         "type": "float" },
        { "name": "timestamp", "type": "int64" }
      ]
    },
    {
      "id": 1002,
      "name": "PlayerMoveResponse",
      "direction": "s2c",
      "fields": [
        { "name": "playerId",  "type": "string" },
        { "name": "x",         "type": "float" },
        { "name": "y",         "type": "float" },
        { "name": "timestamp", "type": "int64" }
      ]
    }
  ]
}
```

| 필드 | 값 |
|------|----|
| `direction` | `c2s` (클라→서버) \| `s2c` (서버→클라) \| `both` |
| `id` | 프로젝트 전체에서 고유해야 함 (범위 예: 1000-1999 player, 2000-2999 inventory) |
| `type` | `int8/16/32/64`, `uint8/16/32/64`, `float`, `double`, `bool`, `string`, `[EnumName]` |

---

## DB 스키마 포맷 (`server/db/schema.json`)

```json
{
  "database": "game_db",
  "tables": [
    {
      "name": "players",
      "columns": [
        { "name": "id",       "type": "int64",      "constraints": ["PK", "AUTO", "NN"] },
        { "name": "username", "type": "string(50)",  "constraints": ["NN", "UQ"] },
        { "name": "level",    "type": "int32",       "constraints": ["NN"] }
      ]
    }
  ]
}
```

- `dry_run=true` (기본값): SQL 마이그레이션 파일만 생성 (`server/db/migrations/`)
- `dry_run=false`: 생성 후 DB에 직접 실행 (`.env`의 DB 접속 정보 사용)
- 컬럼 추가는 자동 감지해 `ALTER TABLE ADD COLUMN` 생성 · 실행
- 컬럼 삭제·변경은 **자동으로 처리하지 않음** — 마이그레이션 SQL을 직접 작성하세요

---

## Claude Code AI 스킬

[Claude Code](https://claude.ai/code)를 사용하면 아래 슬래시 커맨드를 활용할 수 있습니다.

| 커맨드 | 설명 |
|--------|------|
| `/gen` | 전체 gen 파이프라인 실행 |
| `/sync-check` | 생성 파일이 소스와 동기화됐는지 확인 |
| `/new-domain [이름]` | `shared/datas/`에 새 데이터 도메인 스캐폴딩 |
| `/git-issue [도메인]:[이슈명]` | GitHub 이슈 생성 및 프로젝트 필드 자동 설정 |
| `/git-commit [도메인]#[번호]` | 컨벤션 커밋 메시지로 커밋 |
| `/git-commitandpush [도메인]#[번호]` | 커밋 + Push 한 번에 실행 |
| `/git-push` | 원격 저장소에 Push |
| `/git-pull` | 원격 저장소에서 Pull |

---

## 규칙 요약

| 규칙 | 내용 |
|------|------|
| `*/generated/` 직접 수정 금지 | 소스 파일 수정 후 gen 재실행 |
| `.env` 커밋 금지 | `.env.example`을 참고해 로컬에서만 관리 |
| `framework.ini`에 비밀 저장 금지 | 비밀값은 반드시 `.env`에 |
| 새 디렉터리 추가 시 | `CLAUDE.md` 생성 + 상위 `## Nav` 업데이트 |
| 설정 우선순위 | `.env` > `framework.ini` > 하드코딩 기본값 |

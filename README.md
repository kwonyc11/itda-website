# ITDA 홈페이지

수도권 5개 대학 데이터사이언스 학회 연합 ITDA의 행사, 학술제 아카이브, 소속 학회를 소개하는 사이트입니다. [운영 홈페이지](https://itda-academy.kwonyc5820.chatgpt.site/) · [운영진 글 관리](https://itda-academy.kwonyc5820.chatgpt.site/admin/)

이 저장소의 첫 커밋은 2026년 11월 7일 공개한 Sites 버전 27을 기준으로 합니다. 당시 Sites 소스 커밋은 `17fb54b20d92f052405d9958c860108013a4ea58`입니다.

## 학술제 기록 수정

1. 운영진 글 관리에서 초대받은 ChatGPT 계정으로 로그인합니다. 현재 관리자는 **운영진 권한 관리**에서 다음 운영진의 로그인 이메일을 등록할 수 있습니다.
2. 회차와 글을 고르거나 **프로젝트 기록 작성**을 누릅니다. 가이드라인, 대상작, 인터뷰를 편집할 수 있습니다. 인터뷰는 제2·3회에 있습니다.
3. 제목과 메인에 표시할 요약, 본문을 작성합니다. **초안 저장**과 **작성 내용 미리보기**를 거쳐 **홈페이지에 공개**를 누르면 방문자 화면에 반영됩니다.

본문에는 문단, 소제목, 목록, 강조, 공개 자료 링크를 쓸 수 있습니다. 저장한 초안과 공개본, 변경 이력, 운영진 권한은 운영 사이트의 D1 데이터베이스에 보관됩니다. `site/content.json`은 최초 콘텐츠이며 이미 저장된 글은 D1의 공개본이 우선합니다.

## 로컬에서 실행

Node.js 22.13 이상, npm, Git을 설치하고 아래 명령으로 소스를 내려받아 빌드합니다.

```sh
git clone https://github.com/kwonyc11/itda-website.git
cd itda-website
npm run install:ci
npm run build
```

새 체크아웃의 빈 로컬 DB에는 최초 한 번 스키마를 적용합니다. 빌드가 생성한 Wrangler 설정과 로컬 저장 경로를 서버 실행 때도 함께 사용합니다.

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --config dist/server/wrangler.json --local --persist-to .wrangler/state --file drizzle/0000_grey_crystal.sql
npm run start -- --port 8774
```

[로컬 홈페이지](http://127.0.0.1:8774/)와 [제1회 대상작](http://127.0.0.1:8774/archive/1/award/)에서 확인할 수 있습니다. 서버는 `Ctrl+C`로 종료합니다. 코드를 수정한 뒤에는 다시 빌드하고 서버를 시작합니다.

## 수정할 파일

| 작업 | 파일 |
| --- | --- |
| 메인 소개, 행사 카드, 연락처 | [site/main.html](site/main.html) |
| 회차별 학술제 소개 | [site/archive-1.html](site/archive-1.html), [site/archive-2.html](site/archive-2.html), [site/archive-3.html](site/archive-3.html) |
| 학회 소개와 원본 로고 | [public/members/](public/members/), [public/assets/](public/assets/) |
| 메인과 아카이브 스타일 | [public/style.css](public/style.css), [public/archive.css](public/archive.css), [public/cms.css](public/cms.css) |
| 글의 표시 양식과 최초 콘텐츠 | [lib/render.ts](lib/render.ts), [site/content.json](site/content.json) |
| 운영진 권한, 글 저장, DB 구조 | [lib/cms.ts](lib/cms.ts), [db/schema.ts](db/schema.ts), [drizzle/](drizzle/) |

글꼴은 Pretendard를 사용합니다. 소속 학회는 CODE, DAT, DScover, IBAS, INSIGHT 순으로 같은 비중으로 표시합니다. 공개 문구와 이미지를 변경할 때에는 운영진이 확인한 자료를 사용하고 모바일 너비 375px에서도 확인합니다.

## 코드 변경과 배포

1. GitHub에서 변경할 브랜치를 만들고 코드를 수정합니다. `node --test tests/content.test.mjs`로 글 렌더링과 입력 검증을 확인합니다. 타입 검사는 `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.check.json`으로 실행합니다.
2. 로컬에서 바뀐 화면을 확인하고 pull request를 `main`에 병합합니다.
3. 공개 사이트의 배포는 기존 **ITDA Sites 프로젝트**에서 진행합니다. 배포 권한이 있는 운영진이 기존 Sites 소스의 최신 버전을 확인하고, 병합한 PR의 변경을 반영해 빌드·버전 저장·배포합니다. [.openai/hosting.json](.openai/hosting.json)의 프로젝트 ID와 D1 바인딩 `DB`는 기존 운영 사이트를 가리킵니다.
4. 배포 결과의 운영 주소에서 바뀐 페이지를 열어 확인합니다. 인계 기록에는 GitHub 커밋과 배포한 Sites 버전을 함께 남깁니다.

GitHub에 push한 뒤 온라인에 반영하려면 3단계의 Sites 배포가 필요합니다. 이 사이트는 Vinext와 Cloudflare Workers를 사용하고, 운영 데이터는 D1에서 읽습니다.

## 다음 운영진에게 넘길 때

- **소스 관리** — 다음 담당자의 GitHub 계정에 이 저장소의 쓰기 권한을 부여합니다. ITDA GitHub 조직으로 소유권을 옮길 때에는 원래 저장소 관리자 권한과 대상 조직에서 저장소를 만들 권한이 필요합니다. [GitHub의 저장소 이전 안내](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository)
- **배포 관리** — 다음 담당자가 기존 ITDA Sites 프로젝트를 열고 버전과 배포 상태를 확인할 수 있도록 프로젝트 접근 권한을 인계합니다.
- **글 관리** — 현재 관리자가 다음 운영진의 계정을 초대하고 새 계정으로 초안 저장을 확인합니다. 최초 관리자는 Sites 비밀 환경변수 `ITDA_OWNER_EMAIL`로 한 번 연결되고, 연결 이후에는 D1에 기록된 사용자 ID로 판별됩니다. 현재 관리 화면에는 최초 관리자 자체를 교체하는 기능이 없어, 소유자가 바뀔 때는 이 권한도 별도로 확인해야 합니다.

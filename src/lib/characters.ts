export const TYPE_CODES = ["problemSolver", "commander", "artisan", "developer"] as const;
export type TypeCode = (typeof TYPE_CODES)[number];

export type Character = {
  code: TypeCode;
  name: string;
  /** public/characters 아래 실제 파일명(확장자 포함)과 1:1로 대응. 이미지 매핑은 이 파일에서만 관리한다. */
  image: string;
  summary: string;
  strengths: string[];
  warnings: string[];
  brake: string;
  /** 동점 결정 문항 전용 문장 — 다른 사람에게 자신 있게 전할 수 있는 팁 */
  tieStatement: string;
};

export const CHARACTERS: Record<TypeCode, Character> = {
  problemSolver: {
    code: "problemSolver",
    name: "문제 해결사",
    image: "/characters/" + encodeURIComponent("문제 해결사") + ".png",
    summary: "문제의 핵심을 찾아 현장에 맞는 해결 방법을 만들어내는 리더",
    strengths: [
      "문제가 생기면 막히는 지점과 원인을 빠르게 찾아낸다.",
      "기존 방식에만 얽매이지 않고 가능한 해결책을 시도한다.",
      "복잡한 상황에서도 실행 가능한 방법을 만들어낸다.",
      "예상하지 못한 문제에 유연하게 대응한다.",
    ],
    warnings: [
      "문제가 생길 때마다 리더가 직접 해결하려 할 수 있다.",
      "당장의 해결에 집중해 구성원의 참여가 줄어들 수 있다.",
      "파트원이 스스로 판단하기보다 리더의 해결을 기다릴 수 있다.",
      "빠른 해결에 집중하면서 기준이나 재발 방지를 놓칠 수 있다.",
    ],
    brake: "이건 누가 맡아볼래?",
    tieStatement: "문제가 생기면 핵심부터 찾고 풀 방법을 만들어라.",
  },
  commander: {
    code: "commander",
    name: "실행 지휘자",
    image: "/characters/" + encodeURIComponent("실행 지휘자") + ".png",
    summary: "목표와 역할을 분명히 하고 실행의 흐름을 이끄는 리더",
    strengths: [
      "해야 할 일과 우선순위를 명확하게 정한다.",
      "파트원의 역할과 책임을 분명하게 나눈다.",
      "진행 상황을 확인하며 필요한 조정을 한다.",
      "여러 사람이 움직여야 하는 상황에서 실행의 흐름을 잡는다.",
    ],
    warnings: [
      "모든 일의 방향과 방법을 리더가 정하려 할 수 있다.",
      "지시와 진행 확인이 지나치게 많아질 수 있다.",
      "파트원이 스스로 판단하고 시도할 기회가 줄어들 수 있다.",
      "현장의 다양한 의견보다 계획과 통제를 앞세울 수 있다.",
    ],
    brake: "자네 생각은 어때?",
    tieStatement: "해야 할 일과 역할을 분명히 하고 흐름을 잡아라.",
  },
  artisan: {
    code: "artisan",
    name: "디테일 장인",
    image: "/characters/" + encodeURIComponent("디테일 장인") + ".png",
    summary: "기준과 작은 차이를 끝까지 살피며 완성도를 높이는 리더",
    strengths: [
      "작업 기준과 절차를 꼼꼼하게 확인한다.",
      "빠지거나 놓치기 쉬운 부분을 미리 발견한다.",
      "결과의 편차를 줄이고 안정적인 완성도를 만든다.",
      "경험과 노하우를 구체적인 기준으로 정리한다.",
    ],
    warnings: [
      "작은 부분까지 완벽하게 맞추려다 진행이 늦어질 수 있다.",
      "높은 기준이 자신과 파트원 모두에게 부담이 될 수 있다.",
      "충분한 결과에도 계속 수정과 확인을 요구할 수 있다.",
      "새로운 시도보다 기존 기준을 지키는 데 치우칠 수 있다.",
    ],
    brake: "이 정도면 기준 안에 들어왔다.",
    tieStatement: "작은 차이도 놓치지 말고 기준을 끝까지 지켜라.",
  },
  developer: {
    code: "developer",
    name: "성장 연결자",
    image: "/characters/" + encodeURIComponent("성장 연결자") + ".png",
    summary: "구성원의 가능성과 경험을 연결해 성장을 돕는 리더",
    strengths: [
      "파트원의 상황과 어려움을 주의 깊게 살핀다.",
      "직접 답을 주기보다 스스로 생각하고 시도하도록 돕는다.",
      "각자의 강점에 맞는 경험과 역할을 연결한다.",
      "실수와 경험을 다음 성장의 기회로 바꾼다.",
    ],
    warnings: [
      "구성원을 배려하다 판단 기준이 흐려질 수 있다.",
      "필요한 지적이나 결정을 미룰 수 있다.",
      "충분한 설명과 합의를 기다리다 대응이 늦어질 수 있다.",
      "개인의 상황을 고려하다 역할과 책임이 불분명해질 수 있다.",
    ],
    brake: "기준은 기준이다.",
    tieStatement: "답부터 주기보다 직접 해보고 배우게 해라.",
  },
};

export const CHARACTER_LIST = TYPE_CODES.map((c) => CHARACTERS[c]);
export const characterName = (code: TypeCode) => CHARACTERS[code].name;

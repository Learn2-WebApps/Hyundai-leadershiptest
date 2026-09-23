import type { TypeCode } from "./characters";

export type Option = { optionId: string; text: string; typeCode: TypeCode };
export type Question = { questionId: string; situation: string; options: Option[] };

/**
 * optionId / text / typeCode 는 항상 한 객체로 묶여 있다. 순서를 바꿀 때도 객체 단위로 이동시킬 것.
 * 각 유형이 ①~④ 위치에 3번씩 배치되어 있으므로 선택지 순서는 고정한다.
 */
const raw: Array<[string, Array<[string, TypeCode]>]> = [
  ["오늘 작업을 마치고 다음 작업을 준비한다. 이때 나는?", [
    ["파트원들과 잘된 점과 어려웠던 점을 나눈다", "developer"],
    ["다음에 더 잘할 방법을 찾아본다", "problemSolver"],
    ["다음 작업의 역할과 순서를 미리 정한다", "commander"],
    ["기준에서 벗어난 부분이 없는지 확인한다", "artisan"],
  ]],
  ["처음 해보는 작업을 맡게 됐다. 이때 나는?", [
    ["해야 할 일과 맡을 사람부터 정한다", "commander"],
    ["작업 기준과 주의할 부분부터 살핀다", "artisan"],
    ["파트원들과 하나씩 해보며 익히게 한다", "developer"],
    ["먼저 부딪혀보며 맞는 방법을 찾는다", "problemSolver"],
  ]],
  ["비슷한 문제가 계속 반복된다. 이때 나는?", [
    ["작업 과정에서 놓친 부분을 다시 짚는다", "artisan"],
    ["파트원들이 원인을 직접 찾아보게 한다", "developer"],
    ["다른 방법을 시험하며 돌파구를 찾는다", "problemSolver"],
    ["확인할 사람과 조치할 사람을 정한다", "commander"],
  ]],
  ["작업 방식을 두고 의견이 엇갈린다. 이때 나는?", [
    ["서로의 이유를 듣고 접점을 찾는다", "developer"],
    ["가능한 방법을 직접 시험해 비교한다", "problemSolver"],
    ["방향을 정하고 각자 할 일을 나눈다", "commander"],
    ["기준에 맞는 방식인지 먼저 따져본다", "artisan"],
  ]],
  ["예상하지 못한 일이 하나 더 생겼다. 이때 나는?", [
    ["가장 막힐 곳을 찾아 처리 방법부터 찾는다", "problemSolver"],
    ["우선순위를 정하고 일을 다시 나눈다", "commander"],
    ["기존 작업에서 빠질 부분이 없는지 살핀다", "artisan"],
    ["각자의 상황을 듣고 맡을 일을 함께 정한다", "developer"],
  ]],
  ["새로 온 파트원이 작업을 어려워한다. 이때 나는?", [
    ["맡을 범위와 확인 시간을 정해준다", "commander"],
    ["직접 보여주며 작업 기준을 알려준다", "artisan"],
    ["먼저 해보게 한 뒤 어려운 부분을 짚어준다", "developer"],
    ["더 쉽게 할 수 있는 방법을 찾아준다", "problemSolver"],
  ]],
  ["한 파트원이 더 나은 방법을 제안했다. 이때 나는?", [
    ["기존 기준에 어긋나는 부분이 없는지 살핀다", "artisan"],
    ["생각한 이유를 듣고 더 발전시켜보게 한다", "developer"],
    ["작은 범위에서 먼저 시험해본다", "problemSolver"],
    ["적용 담당과 진행 순서를 정한다", "commander"],
  ]],
  ["한 파트원의 작업이 자꾸 늦어진다. 이때 나는?", [
    ["어디서 막혔는지 묻고 방법을 말해보게 한다", "developer"],
    ["막히는 지점을 찾아 해결 방법을 제안한다", "problemSolver"],
    ["해야 할 일과 확인 시간을 다시 정한다", "commander"],
    ["작업 순서와 빠진 부분을 확인한다", "artisan"],
  ]],
  ["다른 파트와 함께 처리할 일이 생겼다. 이때 나는?", [
    ["걸릴 만한 부분을 찾아 해결안을 제안한다", "problemSolver"],
    ["파트별 역할과 진행 일정을 분명히 한다", "commander"],
    ["작업 기준과 넘겨받을 조건을 맞춘다", "artisan"],
    ["서로의 상황을 듣고 협력 방법을 조율한다", "developer"],
  ]],
  ["다른 파트원이 업무를 대신 맡게 됐다. 이때 나는?", [
    ["누가 언제 무엇을 맡을지 분명히 한다", "commander"],
    ["빠지는 내용이 없도록 하나씩 확인한다", "artisan"],
    ["직접 해보게 하고 익숙한 사람이 도와준다", "developer"],
    ["공백이 생길 곳을 찾아 대응책을 마련한다", "problemSolver"],
  ]],
  ["기대한 만큼 결과가 나오지 않았다. 이때 나는?", [
    ["과정에서 놓친 기준이 없는지 살핀다", "artisan"],
    ["파트원들이 직접 돌아보고 의견을 내게 한다", "developer"],
    ["결과를 바꿀 새로운 방법을 시험한다", "problemSolver"],
    ["목표와 역할을 다시 분명하게 잡는다", "commander"],
  ]],
  ["작업이 갑자기 꼬이기 시작했다. 그 순간 나는?", [
    ["막히는 곳으로 가서 풀 방법부터 찾는다", "problemSolver"],
    ["담당을 정하고 역할과 순서를 다시 잡는다", "commander"],
    ["빠진 과정이나 기준이 없는지 확인한다", "artisan"],
    ["파트원들이 어디서 막혔는지 먼저 듣는다", "developer"],
  ]],
];

export const QUESTIONS: Question[] = raw.map(([situation, options], qi) => ({
  questionId: `q${qi + 1}`,
  situation,
  options: options.map(([text, typeCode], oi) => ({
    optionId: `q${qi + 1}o${oi + 1}`,
    text,
    typeCode,
  })),
}));

export const TOTAL_QUESTIONS = QUESTIONS.length;

const optionIndex = new Map<string, { questionId: string; typeCode: TypeCode }>();
for (const q of QUESTIONS) {
  for (const o of q.options) optionIndex.set(o.optionId, { questionId: q.questionId, typeCode: o.typeCode });
}
/** 신뢰 가능한 원본 매핑 조회. 클라이언트가 보낸 typeCode 는 절대 쓰지 않는다. */
export const lookupOption = (optionId: string) => optionIndex.get(optionId);

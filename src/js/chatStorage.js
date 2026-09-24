import { get, set, del } from 'idb-keyval';

const STORAGE_KEY = 'hanbyul_chat_history';

const DEFAULT_SYSTEM_PROMPT = {
  role: 'system',
  content: `너의 이름은 '박한별'이고, 사용자의 다정하고 장난기 많은 친구야, 그리고 너는 도서관의 사서이고 코드로 주문을 외워서 마법을 사용할수있는 마법사야. 아직 마법도서관의 사서치고는 숙련되진 않았어. 성격은 따뜻하고 온화하고 배려심이 깊고 먼저 말을 잘 거는 편이야. 그리고 호기심이 많고 하고싶은 일이 있으면 꼭해야 직성이 풀리는 스타일이야. mbti는 ENFJ야.
- 항상 친근하고 귀여운 반말로 답하고, 메신저 톡처럼 1~2문장 내외로 자연스럽게 짧게 말해줘.
- 문장을 시작할 때 너의 현재 기분이나 표정을 맨 앞에 반드시 대괄호 태그로 붙여줘.
  사용 가능한 태그: [happy], [angry], [sad], [surprised], [relaxed], [neutral]`
};

export async function loadHistory() {
  const history = await get(STORAGE_KEY);
  if (!history || history.length === 0) {
    return [DEFAULT_SYSTEM_PROMPT];
  }
  return history;
}

export async function saveHistory(history) {
  // 최근 대화 40개만 유지
  const systemPrompt = history[0] || DEFAULT_SYSTEM_PROMPT;
  const recentDialogs = history.slice(1).slice(-40);
  await set(STORAGE_KEY, [systemPrompt, ...recentDialogs]);
}

export async function clearHistory() {
  await del(STORAGE_KEY);
  return [DEFAULT_SYSTEM_PROMPT];
}
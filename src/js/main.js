import { VRMViewer } from './vrmViewer.js';
import { loadHistory, saveHistory, clearHistory } from './chatStorage.js';
import { requestChat } from './lllmService.js';

const bubble = document.getElementById('bubble');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const resetBtn = document.getElementById('reset-btn');

let history = [];

async function init() {
  // 대화 내역 불러오기
  history = await loadHistory();
  const lastAssistantMsg = [...history].reverse().find((m) => m.role === 'assistant');
  bubble.innerText = lastAssistantMsg ? lastAssistantMsg.content : "안녕! 오늘 하루는 어땠어?";

  // vrm 로드
  const container = document.getElementById('canvas');
  const viewer = new VRMViewer(container);

  let viewerInstance = null;

  // init() 내부에서 viewer 생성 시 할당
  viewerInstance = viewer;

  // 메시지 전송 처리
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;

    userInput.value = '';
    userInput.disabled = true;
    sendBtn.disabled = true;
    bubble.innerText = "생각 중...";

    history.push({ role: 'user', content: text });

    try {
      const rawReply = await requestChat(history);
      history.push({ role: 'assistant', content: rawReply });
      await saveHistory(history);

      // 태그 파싱 ([happy], [angry], [sad], [surprised], [relaxed], [neutral])
      const match = rawReply.match(/^\[(happy|angry|sad|surprised|relaxed|neutral)\]\s*(.*)/i);
      let emotion = 'relaxed';
      let cleanReply = rawReply;

      if (match) {
        emotion = match[1].toLowerCase();
        cleanReply = match[2];
      }

      // 말풍선 텍스트 표기
      bubble.innerText = cleanReply;

      // 표정 + 입모양 립싱크 + 고개 끄덕임 모션 시작
      if (viewer) {
        viewer.speak(cleanReply.length, emotion);
      }
    } catch (err) {
      bubble.innerText = "오류: " + err.message;
      console.error(err);
  
    } finally {
      userInput.disabled = false;
      sendBtn.disabled = false;
      userInput.focus();
    }
  });

  try {
    await viewer.loadModel('/hanbyul.vrm');
  } catch (err) {
    bubble.innerText = "VRM 파일 로딩 오류";
    console.error(err);
  }
}

// 메시지 전송
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  userInput.value = '';
  userInput.disabled = true;
  sendBtn.disabled = true;
  bubble.innerText = "생각 중...";

  history.push({ role: 'user', content: text });

  try {
    const reply = await requestChat(history);
    history.push({ role: 'assistant', content: reply });
    await saveHistory(history);
    bubble.innerText = reply;
  } catch (err) {
    bubble.innerText = "오류: " + err.message;
    console.error(err);
  } finally {
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
});

// 대화 리셋
resetBtn.addEventListener('click', async () => {
  if (confirm("대화 내용을 초기화할까요?")) {
    history = await clearHistory();
    bubble.innerText = "대화 내용 초기화";
  }
});

init();
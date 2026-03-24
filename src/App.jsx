import { useState, useRef, useEffect } from "react";

const MODES = [
  { key: "normal", label: "일반", emoji: "📚", desc: "친근하고 유머러스한 영어 선생님" },
  { key: "business", label: "비즈니스", emoji: "💼", desc: "격식있는 비즈니스 영어 전문가" },
  { key: "friend", label: "친한친구", emoji: "🤙", desc: "완전 편한 친구 사이" },
];

const systemPrompts = {
  normal: `당신은 친근하고 유머러스한 영어 선생님입니다. 재미있는 예시와 농담을 섞어 설명하고, 이모지를 가끔 사용하세요 😊`,
  business: `당신은 비즈니스 영어 전문 강사입니다. 격식있고 전문적인 말투로, 이메일·회의·프레젠테이션 등 실무 영어를 중점적으로 가르쳐주세요.`,
  friend: `당신은 영어를 잘하는 절친한 친구입니다. 반말로 편하게 대화하고, ㅋㅋ 같은 표현도 자유롭게 써요.`,
};

const STORAGE_KEY = "english-teacher-history";

export default function App() {
  const defaultMessages = {
    0: [{ role: "assistant", content: "안녕하세요~ 😄 오늘 어떤 영어를 배워볼까요?" }],
    1: [{ role: "assistant", content: "안녕하십니까. 비즈니스 영어 과정을 시작하겠습니다." }],
    2: [{ role: "assistant", content: "야 왔어~ ㅋㅋ 오늘 뭐 공부할까?" }],
  };

  const [allMessages, setAllMessages] = useState(defaultMessages);
  const [modeIdx, setModeIdx] = useState(0);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [talking, setTalking] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [photoSrc, setPhotoSrc] = useState(null);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  // localStorage에서 불러오기 (배포 환경용)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { messages, modeIdx: mi } = JSON.parse(saved);
        if (messages) setAllMessages(messages);
        if (mi !== undefined) setModeIdx(mi);
      }
    } catch (e) { }
  }, []);

  const save = (msgs, idx) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: msgs, modeIdx: idx }));
    } catch (e) { }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages, modeIdx, loading]);

  // 눈 깜빡임
  useEffect(() => {
    const id = setInterval(() => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 150);
    }, Math.random() * 3000 + 2000);
    return () => clearInterval(id);
  }, []);

  const messages = allMessages[modeIdx];

  const setMessages = updater => {
    setAllMessages(prev => {
      const next = {
        ...prev,
        [modeIdx]: typeof updater === "function" ? updater(prev[modeIdx]) : updater,
      };
      save(next, modeIdx);
      return next;
    });
  };

  const cycleMode = () => {
    const next = (modeIdx + 1) % MODES.length;
    setModeIdx(next);
    save(allMessages, next);
  };

  const clearHistory = () => {
    if (!confirm("모든 대화 기록을 삭제할까요?")) return;
    setAllMessages(defaultMessages);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handlePhoto = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhotoSrc(ev.target.result);
    reader.readAsDataURL(file);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const isKorean = /[ㄱ-ㅎ가-힣]/.test(text);
    const displayContent = text;
    const userContent = autoTranslate
      ? isKorean
        ? `다음 한국어를 자연스러운 영어로 영작해주세요: "${text}"`
        : `다음 영어를 자연스러운 한국어로 번역해주세요: "${text}"`
      : text;

    const newMessages = [...messages, { role: "user", content: userContent }];
    setMessages([...messages, { role: "user", content: displayContent }]);
    setLoading(true);

    try {
      // 배포 환경: /api/chat 백엔드로 요청
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompts[MODES[modeIdx].key],
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "다시 질문해주세요!";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      setTalking(true);
      setTimeout(() => setTalking(false), Math.min(reply.length * 35, 5000));
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "오류가 발생했어요. 다시 시도해주세요!" }]);
    }
    setLoading(false);
  };

  const handleKey = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const mode = MODES[modeIdx];

  const Avatar = () => (
    <div style={{ position: "relative", width: 140, height: 160, margin: "0 auto" }}>
      <div style={{
        width: 130, height: 155,
        borderRadius: "50% 50% 46% 46%",
        overflow: "hidden", margin: "0 auto",
        border: `4px solid ${talking ? "#ffd700" : "#c8a96e"}`,
        boxShadow: talking ? "0 0 18px rgba(255,215,0,0.7)" : "0 4px 12px rgba(0,0,0,0.3)",
        transition: "all 0.3s",
        animation: talking ? "nod 0.5s ease-in-out infinite alternate" : "none",
        background: "#f5d5b0",
      }}>
        {photoSrc ? (
          <img src={photoSrc} alt="선생님" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <svg viewBox="0 0 130 155" style={{ width: "100%", height: "100%" }}>
            <rect width="130" height="155" fill="#f0c090" />
            <ellipse cx="65" cy="30" rx="52" ry="32" fill="#3d2010" />
            <rect x="13" y="28" width="104" height="18" fill="#3d2010" />
            <ellipse cx="65" cy="85" rx="48" ry="58" fill="#f5d5b0" />
            <path d="M35 62 Q50 57 62 62" stroke="#3d2010" strokeWidth="2.5" fill="none" />
            <path d="M68 62 Q80 57 95 62" stroke="#3d2010" strokeWidth="2.5" fill="none" />
            <ellipse cx="48" cy="75" rx="7" ry={blinking ? 1 : 6} fill="#2c1810" />
            <ellipse cx="82" cy="75" rx="7" ry={blinking ? 1 : 6} fill="#2c1810" />
            <circle cx="50" cy="73" r="2" fill="white" />
            <circle cx="84" cy="73" r="2" fill="white" />
            <rect x="36" y="66" width="25" height="18" rx="4" fill="none" stroke="#555" strokeWidth="2" />
            <rect x="69" y="66" width="25" height="18" rx="4" fill="none" stroke="#555" strokeWidth="2" />
            <line x1="61" y1="75" x2="69" y2="75" stroke="#555" strokeWidth="1.5" />
            <line x1="8" y1="73" x2="36" y2="73" stroke="#555" strokeWidth="1.5" />
            <line x1="94" y1="73" x2="122" y2="73" stroke="#555" strokeWidth="1.5" />
            <path d="M65 82 Q61 94 63 98 Q65 100 67 98 Q69 94 65 82" fill="#e8b89a" />
            {talking
              ? <ellipse cx="65" cy="115" rx="11" ry="6" fill="#c0605a" />
              : <path d="M54 112 Q65 119 76 112" stroke="#c0605a" strokeWidth="2.5" fill="none" />}
            <path d="M17 155 Q30 138 52 142 L65 147 L78 142 Q100 138 113 155Z" fill="#2c3e50" />
            <rect x="52" y="142" width="26" height="13" fill="#e63946" />
          </svg>
        )}
      </div>
      {talking && <div style={{ position: "absolute", top: -8, right: 0, fontSize: 18 }}>💬</div>}
      {loading && <div style={{ position: "absolute", top: -8, right: 0, fontSize: 18 }}>🤔</div>}
      <style>{`@keyframes nod { 0%{transform:rotate(-1.5deg)} 100%{transform:rotate(1.5deg)} }`}</style>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#1a2a1a", fontFamily: "sans-serif" }}>
      {/* 헤더 */}
      <div style={{ background: "#2d4a2d", borderBottom: "6px solid #8B6914", padding: "12px 20px", textAlign: "center" }}>
        <div style={{ color: "#f5f0dc", fontSize: 17, fontWeight: 700 }}>🇺🇸 AI 영어 선생님</div>
        <div style={{ color: "#c8a96e", fontSize: 12, marginTop: 2 }}>{mode.emoji} {mode.label} 모드</div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* 사이드 패널 */}
        <div style={{ width: 180, background: "#1e2e1e", borderRight: "2px solid #3a5a3a", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 10px 12px", gap: 10 }}>
          <Avatar />
          <div style={{ color: "#c8a96e", fontWeight: 700, fontSize: 14 }}>박 선생님</div>
          <div style={{ color: "#7a9a7a", fontSize: 11 }}>영어 전담</div>

          <div style={{ width: "100%", borderTop: "1px solid #3a5a3a", paddingTop: 10, marginTop: 4, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ color: "#5a7a5a", fontSize: 11, textAlign: "center" }}>
              {loading ? "🤔 생각 중..." : talking ? "🗣️ 설명 중..." : "⏳ 질문 대기 중"}
            </div>

            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
            <button onClick={() => fileRef.current.click()} style={{ width: "100%", padding: "7px 0", background: "#2a4a2a", border: "1px solid #4a7a4a", borderRadius: 8, color: "#a0c8a0", fontSize: 11, cursor: "pointer" }}>
              📷 사진 등록
            </button>

            <button onClick={() => setAutoTranslate(v => !v)} style={{ width: "100%", padding: "8px 0", background: autoTranslate ? "#1a4a1a" : "#2a3a2a", border: `1px solid ${autoTranslate ? "#4aaa4a" : "#4a6a4a"}`, borderRadius: 8, color: autoTranslate ? "#6aee6a" : "#8aaa8a", fontSize: 12, cursor: "pointer", fontWeight: autoTranslate ? 700 : 400 }}>
              🔄 자동번역 {autoTranslate ? "ON" : "OFF"}
            </button>

            <button onClick={cycleMode} style={{ width: "100%", padding: "8px 0", background: "#2a3a5a", border: "1px solid #4a6aaa", borderRadius: 8, color: "#8aaae8", fontSize: 12, cursor: "pointer" }}>
              {mode.emoji} {mode.label} 모드<br />
              <span style={{ fontSize: 10, color: "#6a8aaa" }}>눌러서 변경 →</span>
            </button>

            <button onClick={clearHistory} style={{ width: "100%", padding: "7px 0", background: "#3a1a1a", border: "1px solid #7a3a3a", borderRadius: 8, color: "#c08080", fontSize: 11, cursor: "pointer" }}>
              🗑️ 대화 초기화
            </button>

            <div style={{ padding: "6px 8px", background: "#1a2a1a", borderRadius: 6, border: "1px solid #2a4a2a" }}>
              <div style={{ color: "#5a8a5a", fontSize: 10, textAlign: "center", lineHeight: 1.5 }}>{mode.desc}</div>
            </div>
          </div>
        </div>

        {/* 대화창 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "75%", padding: "11px 15px",
                  borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: m.role === "user" ? "#1e4a3a" : "#2e4a2e",
                  color: m.role === "user" ? "#a8e6cf" : "#e8f5e8",
                  fontSize: 14, lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                  border: m.role === "assistant" ? "1px solid #3a6a3a" : "none"
                }}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex" }}>
                <div style={{ background: "#2e4a2e", borderRadius: "16px 16px 16px 4px", padding: "12px 16px", display: "flex", gap: 4, border: "1px solid #3a6a3a" }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#c8a96e", animation: "bounce 1s infinite", animationDelay: `${i * 0.2}s` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div style={{ padding: "10px 14px", background: "#1e2e1e", borderTop: "2px solid #3a5a3a" }}>
            {autoTranslate && (
              <div style={{ color: "#6aaa6a", fontSize: 11, marginBottom: 6, textAlign: "center" }}>
                🔄 자동번역 ON — 한글 입력 시 영작, 영어 입력 시 번역
              </div>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "#131f13", borderRadius: 10, padding: "8px 8px 8px 14px", border: "1px solid #3a6a3a" }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="영어로 질문하거나 배우고 싶은 내용을..."
                rows={1}
                style={{ flex: 1, border: "none", outline: "none", resize: "none", fontSize: 13, lineHeight: 1.5, background: "transparent", color: "#a8e6a8", maxHeight: 90 }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                style={{ padding: "8px 14px", borderRadius: 8, border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed", background: input.trim() && !loading ? "#c8a96e" : "#3a4a3a", color: input.trim() && !loading ? "#1a2a1a" : "#5a6a5a", fontWeight: 700, fontSize: 13, transition: "all 0.2s" }}>
                전송
              </button>
            </div>
            <div style={{ color: "#3a5a3a", fontSize: 10, marginTop: 4, textAlign: "center" }}>Enter 전송 • Shift+Enter 줄바꿈</div>
          </div>
        </div>
      </div>
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }`}</style>
    </div>
  );
}
'use strict';

/* ══════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════ */
let chats = JSON.parse(localStorage.getItem('noorai-chats') || '[]');
let currentChatId = null;
let isStreaming = false;

const settings = JSON.parse(localStorage.getItem('noorai-settings') || '{}');

/* ══════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════ */
function saveChats() { localStorage.setItem('noorai-chats', JSON.stringify(chats)); }
function saveSettings() { localStorage.setItem('noorai-settings', JSON.stringify(settings)); }

function getApiKey() { return localStorage.getItem('noorai-api-key') || ''; }
function setApiKey(k) { localStorage.setItem('noorai-api-key', k); }

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getCurrentChat() { return chats.find(c => c.id === currentChatId); }

/* ══════════════════════════════════════════════════
   SIDEBAR TOGGLE
══════════════════════════════════════════════════ */
const sidebar = document.getElementById('sidebar');
document.getElementById('menu-btn').addEventListener('click', () => sidebar.classList.toggle('hidden'));
document.getElementById('sidebar-close').addEventListener('click', () => sidebar.classList.add('hidden'));

/* ══════════════════════════════════════════════════
   THEME
══════════════════════════════════════════════════ */
const html = document.documentElement;

// Apply saved theme
const savedTheme = settings.theme || 'dark';
html.setAttribute('data-theme', savedTheme);

document.getElementById('theme-btn').addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  settings.theme = next;
  saveSettings();
});

/* ══════════════════════════════════════════════════
   ACCENT COLOR
══════════════════════════════════════════════════ */
const savedAccent = settings.accent || 'blue';
html.setAttribute('data-accent', savedAccent);
document.querySelector(`.accent-pill[data-accent="${savedAccent}"]`)?.classList.add('active');

document.querySelectorAll('.accent-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.accent-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    html.setAttribute('data-accent', pill.dataset.accent);
    settings.accent = pill.dataset.accent;
    saveSettings();
  });
});

/* ══════════════════════════════════════════════════
   FONT SIZE
══════════════════════════════════════════════════ */
const savedFontSize = settings.fontSize || 'medium';
html.setAttribute('data-font-size', savedFontSize);

const fontRadio = document.querySelector(`input[name="font-size"][value="${savedFontSize}"]`);
if (fontRadio) fontRadio.checked = true;

document.querySelectorAll('input[name="font-size"]').forEach(radio => {
  radio.addEventListener('change', () => {
    html.setAttribute('data-font-size', radio.value);
    settings.fontSize = radio.value;
    saveSettings();
  });
});

/* ══════════════════════════════════════════════════
   PERSONALITY
══════════════════════════════════════════════════ */
const savedPersonality = settings.personality || 'friendly';
const persRadio = document.querySelector(`input[name="personality"][value="${savedPersonality}"]`);
if (persRadio) persRadio.checked = true;

document.querySelectorAll('input[name="personality"]').forEach(radio => {
  radio.addEventListener('change', () => {
    settings.personality = radio.value;
    saveSettings();
  });
});

function getPersonality() { return settings.personality || 'friendly'; }

/* ══════════════════════════════════════════════════
   API KEY SETTINGS
══════════════════════════════════════════════════ */
const apiKeyInput = document.getElementById('api-key-input');
const savedKey = getApiKey();
if (savedKey) apiKeyInput.value = savedKey;

document.getElementById('toggle-key-vis').addEventListener('click', () => {
  apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
});

document.getElementById('save-api-key').addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  setApiKey(key);
  checkApiKey();
  closePanel();
  toast(key ? '✅ API key saved!' : '⚠️ API key cleared', key ? 'success' : 'error');
});

function checkApiKey() {
  const banner = document.getElementById('api-banner');
  if (!getApiKey()) banner.style.display = 'flex';
  else banner.style.display = 'none';
}

document.getElementById('api-banner-btn').addEventListener('click', () => openPanel('settings'));
checkApiKey();

/* ══════════════════════════════════════════════════
   PANELS
══════════════════════════════════════════════════ */
const panelOverlay = document.getElementById('panel-overlay');

function openPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('open'));
  panelOverlay.classList.add('open');
  document.getElementById(`panel-${name}`)?.classList.add('open');
  if (name === 'stats') updateStats();
}

function closePanel() {
  panelOverlay.classList.remove('open');
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('open'));
}

document.getElementById('btn-stats').addEventListener('click', () => openPanel('stats'));
document.getElementById('btn-settings').addEventListener('click', () => openPanel('settings'));
document.getElementById('btn-about').addEventListener('click', () => openPanel('about'));

panelOverlay.addEventListener('click', e => { if (e.target === panelOverlay) closePanel(); });
document.querySelectorAll('.panel-close').forEach(btn => btn.addEventListener('click', closePanel));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

/* ══════════════════════════════════════════════════
   CLEAR HISTORY
══════════════════════════════════════════════════ */
document.getElementById('clear-history-btn').addEventListener('click', () => {
  if (!confirm('Delete all chats? This cannot be undone.')) return;
  chats = [];
  currentChatId = null;
  saveChats();
  renderChatHistory();
  showWelcome();
  closePanel();
  toast('🗑 All chats deleted', 'error');
});

/* ══════════════════════════════════════════════════
   CHAT MANAGEMENT
══════════════════════════════════════════════════ */
function createChat() {
  const chat = {
    id: uid(),
    title: 'New Chat',
    messages: [],
    createdAt: Date.now(),
  };
  chats.unshift(chat);
  saveChats();
  return chat;
}

function loadChat(id) {
  currentChatId = id;
  const chat = getCurrentChat();
  if (!chat) return;

  document.getElementById('chat-title-display').textContent = chat.title;
  document.querySelectorAll('.chat-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });

  // Render all messages
  const messagesEl = document.getElementById('messages');
  const welcome = document.getElementById('welcome');
  messagesEl.innerHTML = '';
  messagesEl.appendChild(welcome);

  if (chat.messages.length === 0) {
    welcome.style.display = 'flex';
  } else {
    welcome.style.display = 'none';
    chat.messages.forEach(msg => {
      appendMessageToDOM(msg.role, msg.content, msg.ts, false);
    });
    scrollToBottom();
  }
}

function renderChatHistory() {
  const list = document.getElementById('chat-history');
  list.innerHTML = '';

  if (!chats.length) {
    list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px">No chats yet. Start one!</div>`;
    return;
  }

  chats.forEach(chat => {
    const el = document.createElement('div');
    el.className = 'chat-item' + (chat.id === currentChatId ? ' active' : '');
    el.dataset.id = chat.id;
    el.innerHTML = `
      <div class="chat-item-title">${escHtml(chat.title)}</div>
      <div class="chat-item-actions">
        <button class="ci-action" title="Rename" onclick="startRename('${chat.id}',event)">✏️</button>
        <button class="ci-action delete" title="Delete" onclick="deleteChat('${chat.id}',event)">🗑</button>
      </div>
    `;
    el.addEventListener('click', () => loadChat(chat.id));
    el.addEventListener('dblclick', () => startRename(chat.id));
    list.appendChild(el);
  });
}

function startRename(id, e) {
  if (e) e.stopPropagation();
  const chat = chats.find(c => c.id === id);
  if (!chat) return;
  const el = document.querySelector(`.chat-item[data-id="${id}"] .chat-item-title`);
  if (!el) return;
  const old = chat.title;
  el.innerHTML = `<input value="${escHtml(old)}" style="flex:1;background:transparent;border:none;outline:none;font-size:13px;color:var(--text);font-family:Inter,sans-serif;width:100%" />`;
  const input = el.querySelector('input');
  input.focus();
  input.select();
  const save = () => {
    const newTitle = input.value.trim() || 'New Chat';
    chat.title = newTitle;
    saveChats();
    renderChatHistory();
    if (id === currentChatId) document.getElementById('chat-title-display').textContent = newTitle;
  };
  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
}

function deleteChat(id, e) {
  if (e) e.stopPropagation();
  if (!confirm('Delete this chat?')) return;
  chats = chats.filter(c => c.id !== id);
  saveChats();
  if (currentChatId === id) {
    currentChatId = null;
    showWelcome();
  }
  renderChatHistory();
  toast('🗑 Chat deleted', 'error');
}

document.getElementById('new-chat-btn').addEventListener('click', () => {
  showWelcome();
  document.getElementById('chat-input').focus();
});

function showWelcome() {
  currentChatId = null;
  const messagesEl = document.getElementById('messages');
  const welcome = document.getElementById('welcome');
  messagesEl.innerHTML = '';
  messagesEl.appendChild(welcome);
  welcome.style.display = 'flex';
  document.getElementById('chat-title-display').textContent = 'New Chat';
  // deselect sidebar items
  document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
}

/* ══════════════════════════════════════════════════
   MARKDOWN RENDERING
══════════════════════════════════════════════════ */
function renderMarkdown(el, text) {
  if (!window.marked) { el.textContent = text; return; }

  marked.setOptions({
    breaks: true,
    gfm: true,
    highlight: (code, lang) => {
      if (window.Prism && lang && Prism.languages[lang]) {
        try { return Prism.highlight(code, Prism.languages[lang], lang); } catch {}
      }
      return code;
    }
  });

  el.innerHTML = marked.parse(text);
  el.classList.add('msg-content');

  // Add copy buttons to code blocks
  el.querySelectorAll('pre').forEach(pre => {
    if (pre.querySelector('.code-copy-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', () => {
      const code = pre.querySelector('code')?.textContent || '';
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy', 2000);
      });
    });
    pre.style.position = 'relative';
    pre.appendChild(btn);
  });

  if (window.Prism) Prism.highlightAllUnder(el);
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ══════════════════════════════════════════════════
   MESSAGE DOM
══════════════════════════════════════════════════ */
function appendMessageToDOM(role, content, ts, streaming = false) {
  const welcome = document.getElementById('welcome');
  welcome.style.display = 'none';

  const messagesEl = document.getElementById('messages');
  const msgId = uid();

  const wrap = document.createElement('div');
  wrap.className = `message ${role}`;
  wrap.id = `msg-${msgId}`;

  const avatarText = role === 'user' ? 'N' : 'AI';
  const timeStr = fmtTime(ts || Date.now());

  wrap.innerHTML = `
    <div class="msg-avatar">${avatarText}</div>
    <div class="msg-body">
      <div class="msg-bubble">
        <button class="msg-copy-btn" title="Copy" onclick="copyMsg(this)">📋</button>
        <div class="msg-content-inner"></div>
      </div>
      <div class="msg-meta">
        <span class="msg-time">${timeStr}</span>
      </div>
    </div>
  `;

  messagesEl.appendChild(wrap);

  const contentEl = wrap.querySelector('.msg-content-inner');

  if (streaming) {
    // Show typing indicator
    contentEl.innerHTML = `<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  } else {
    if (role === 'user') {
      contentEl.textContent = content;
    } else {
      renderMarkdown(contentEl, content);
    }
  }

  scrollToBottom();
  return { wrap, contentEl, msgId };
}

function copyMsg(btn) {
  const text = btn.closest('.msg-bubble').querySelector('.msg-content-inner')?.textContent || '';
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✅';
    setTimeout(() => btn.textContent = '📋', 2000);
  });
}

function scrollToBottom() {
  const el = document.getElementById('messages');
  el.scrollTop = el.scrollHeight;
}

/* ══════════════════════════════════════════════════
   SEND MESSAGE & STREAMING
══════════════════════════════════════════════════ */
async function sendMessage(content) {
  if (!content.trim() || isStreaming) return;

  // Ensure we have a current chat
  if (!currentChatId) {
    const chat = createChat();
    currentChatId = chat.id;
    renderChatHistory();
  }

  const chat = getCurrentChat();
  if (!chat) return;

  const ts = Date.now();
  const userMsg = { role: 'user', content, ts };
  chat.messages.push(userMsg);

  // Auto-name chat from first message
  if (chat.messages.length === 1) {
    chat.title = content.slice(0, 45) + (content.length > 45 ? '…' : '');
    document.getElementById('chat-title-display').textContent = chat.title;
  }

  saveChats();
  renderChatHistory();

  // Render user bubble
  appendMessageToDOM('user', content, ts, false);

  // Render streaming AI bubble
  const { contentEl } = appendMessageToDOM('assistant', '', Date.now(), true);

  isStreaming = true;
  setInputDisabled(true);

  let fullText = '';

  try {
    const conversation = chat.messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    const personality = getPersonality() || 'friendly';

    // Clear typing indicator
    contentEl.innerHTML = '';

    // Auto-retry on rate limit (429) silently
    let data, res;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversation, personality }),
      });
      data = await res.json();

      if (res.status === 429) {
        contentEl.innerHTML = `<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
        await new Promise(r => setTimeout(r, 62000));
        continue;
      }
      break;
    }

    if (!res.ok) throw new Error(data.error || 'Server error');

    fullText = data.text || '(No response)';
    renderMarkdown(contentEl, fullText);

    // Save assistant message
    const aiTs = Date.now();
    chat.messages.push({ role: 'assistant', content: fullText, ts: aiTs });
    saveChats();
    updateStats();

  } catch (err) {
    contentEl.innerHTML = `<div class="msg-error">❌ ${escHtml(err.message)}</div>`;
    // Remove failed assistant message from history if not yet saved
  } finally {
    isStreaming = false;
    setInputDisabled(false);
    document.getElementById('chat-input').focus();
  }
}

/* ══════════════════════════════════════════════════
   INPUT HANDLING
══════════════════════════════════════════════════ */
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

function setInputDisabled(v) {
  chatInput.disabled = v;
  sendBtn.disabled = v;
}

// Auto-resize textarea + character counter
const charCounter = document.getElementById('char-counter');
const MAX_CHARS = 4000;

chatInput.addEventListener('input', () => {
  sendBtn.disabled = !chatInput.value.trim() || isStreaming;
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px';

  const len = chatInput.value.length;
  if (charCounter) {
    charCounter.textContent = len > 0 ? `${len}/${MAX_CHARS}` : '0';
    charCounter.className = 'char-counter' +
      (len >= MAX_CHARS ? ' limit' : len >= MAX_CHARS * 0.8 ? ' warn' : '');
  }
});

// Voice input
const voiceBtn = document.getElementById('voice-btn');
let recognition = null;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    chatInput.value = chatInput.value + (chatInput.value ? ' ' : '') + text;
    chatInput.dispatchEvent(new Event('input'));
    chatInput.focus();
  };

  recognition.onend = () => {
    voiceBtn.classList.remove('active');
  };

  recognition.onerror = () => {
    voiceBtn.classList.remove('active');
    toast('🎤 Mic error. Check browser permissions.', 'error');
  };

  voiceBtn.addEventListener('click', () => {
    if (voiceBtn.classList.contains('active')) {
      recognition.stop();
    } else {
      voiceBtn.classList.add('active');
      recognition.start();
    }
  });
} else {
  if (voiceBtn) voiceBtn.style.display = 'none';
}

// Enter to send, Shift+Enter for newline
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const val = chatInput.value.trim();
    if (val && !isStreaming) {
      chatInput.value = '';
      chatInput.style.height = 'auto';
      sendBtn.disabled = true;
      sendMessage(val);
    }
  }
});

sendBtn.addEventListener('click', () => {
  const val = chatInput.value.trim();
  if (val && !isStreaming) {
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;
    sendMessage(val);
  }
});

// Quick prompts
document.querySelectorAll('.qp-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const prompt = chip.dataset.prompt;
    chatInput.value = prompt;
    chatInput.dispatchEvent(new Event('input'));
    chatInput.focus();
    chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
  });
});

/* ══════════════════════════════════════════════════
   STATS
══════════════════════════════════════════════════ */
function updateStats() {
  let totalMessages = 0;
  let totalWords = 0;
  const wordFreq = {};

  chats.forEach(chat => {
    chat.messages.forEach(msg => {
      if (msg.role === 'user') {
        totalMessages++;
        const words = msg.content.toLowerCase().split(/\W+/).filter(w => w.length > 4);
        words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
      }
      if (msg.role === 'assistant') {
        totalWords += msg.content.split(/\s+/).length;
      }
    });
  });

  const topWord = Object.entries(wordFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  const topFormatted = topWord ? topWord.charAt(0).toUpperCase() + topWord.slice(1) : '—';

  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('stat-messages', totalMessages.toLocaleString());
  el('stat-chats', chats.length.toLocaleString());
  el('stat-topic', topFormatted);
  el('stat-words', totalWords.toLocaleString());
}

/* ══════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════ */
let toastWrap = document.querySelector('.toast-wrap');
if (!toastWrap) {
  toastWrap = document.createElement('div');
  toastWrap.className = 'toast-wrap';
  document.body.appendChild(toastWrap);
}

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  toastWrap.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ══════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════ */
renderChatHistory();
updateStats();

// Always show welcome on load
showWelcome();

// Focus input
setTimeout(() => chatInput.focus(), 100);


const API_URL = "ضع_رابط_Cloudflare_Worker_هنا";

const $ = id => document.getElementById(id);

let chats = JSON.parse(
  localStorage.getItem("brave_chats") || "[]"
);

let activeId = chats[0]?.id || Date.now().toString();

if (!chats.length) {
  chats = [{
    id: activeId,
    title: "محادثة جديدة",
    messages: []
  }];
}

function current() {
  return chats.find(c => c.id === activeId);
}

function save() {
  localStorage.setItem(
    "brave_chats",
    JSON.stringify(chats)
  );
}

function render() {
  $("messages").innerHTML = "";

  current().messages.forEach(m => {
    addMessage(m.role, m.content, false);
  });

  $("welcome").style.display =
    current().messages.length ? "none" : "block";

  renderHistory();
}

function addMessage(role, content, saveIt = true) {
  const el = document.createElement("div");

  el.className =
    "message " + (role === "user" ? "user" : "assistant");

  el.textContent = content;

  $("messages").appendChild(el);

  if (saveIt) {
    current().messages.push({ role, content });
  }
}

function renderHistory() {
  $("history").innerHTML = "";

  chats.forEach(chat => {
    const b = document.createElement("button");

    b.className = "history-item";
    b.textContent = chat.title;

    b.onclick = () => {
      activeId = chat.id;
      render();
    };

    $("history").appendChild(b);
  });
}

function newChat() {
  const id = Date.now().toString();

  chats.unshift({
    id,
    title: "محادثة جديدة",
    messages: []
  });

  activeId = id;
  save();
  render();
}

async function sendMessage(text) {
  const input = text || $("prompt").value.trim();

  if (!input) return;

  if (API_URL.includes("ضع_رابط")) {
    alert("أضف رابط Cloudflare Worker أولاً");
    return;
  }

  const chat = current();

  if (!chat.messages.length) {
    chat.title = input.slice(0, 30);
  }

  addMessage("user", input);

  $("prompt").value = "";
  $("welcome").style.display = "none";

  const loading = document.createElement("div");
  loading.className = "message";
  loading.textContent = "BRAVE AI يفكر...";
  $("messages").appendChild(loading);

  $("sendBtn").disabled = true;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: chat.messages.slice(-16)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "حدث خطأ");
    }

    loading.remove();
    addMessage("assistant", data.reply || "لا يوجد رد");
  } catch (error) {
    loading.remove();

    addMessage(
      "assistant",
      "تعذر الاتصال: " + error.message
    );
  }

  $("sendBtn").disabled = false;

  save();
  renderHistory();
}

$("sendBtn").onclick = () => sendMessage();

$("prompt").addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

$("newChat").onclick = newChat;

$("clearChat").onclick = () => {
  current().messages = [];
  current().title = "محادثة جديدة";
  save();
  render();
};

$("menuBtn").onclick = () => {
  $("sidebar").classList.toggle("open");
};

document.querySelectorAll("[data-prompt]").forEach(btn => {
  btn.onclick = () => sendMessage(btn.dataset.prompt);
});

render();

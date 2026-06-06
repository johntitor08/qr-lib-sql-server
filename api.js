if (!window.API_BASE) {
  throw new Error("API_BASE tanımlı değil");
}

const state = {
  user: null,
  demoMode: false,
  books: [],
  highlights: [],
  loans: [],
};

const tokenStore = {
  get: () => localStorage.getItem("bib_token"),
  set: (t) => localStorage.setItem("bib_token", t),
  clear: () => localStorage.removeItem("bib_token"),
};

function getAuthHeader() {
  if (state.demoMode) return {};

  const token = tokenStore.get();
  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function forceLogout(message = "Oturum sona erdi") {
  tokenStore.clear();

  state.user = null;
  state.books = [];
  state.highlights = [];
  state.loans = [];

  toast(message, "warning");

  document.getElementById("authScreen")?.classList.remove("hidden");
}

async function apiFetch(path, options = {}) {
  const headers = {
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  const hasBody = !!options.body;

  try {
    const res = await fetch(API_BASE + path, {
      ...options,
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
    });

    if (res.status === 401) {
      forceLogout("Oturum süresi doldu");
      throw new Error("Unauthorized");
    }

    if (!res.ok) {
      const err = await safeJson(res);
      throw new Error(err?.error || res.statusText);
    }

    return await safeJson(res);
  } catch (err) {
    if (err.name === "TypeError") {
      throw new Error("Backend bağlantısı yok veya ağ hatası");
    }
    throw err;
  }
}

const api = {
  get: (p) => apiFetch(p),

  post: (p, b) =>
    apiFetch(p, {
      method: "POST",
      body: JSON.stringify(b),
    }),

  put: (p, b) =>
    apiFetch(p, {
      method: "PUT",
      body: JSON.stringify(b),
    }),

  patch: (p, b) =>
    apiFetch(p, {
      method: "PATCH",
      body: JSON.stringify(b),
    }),

  delete: (p) => apiFetch(p, { method: "DELETE" }),
};

async function submitAuth(mode, email, password) {
  if (!email || !password) {
    throw new Error("Email ve şifre gerekli");
  }

  const endpoint = mode === "login" ? "/users/login" : "/users/register";

  const data = await api.post(endpoint, {
    email,
    password,
  });

  if (data?.token) {
    tokenStore.set(data.token);
    state.user = { email: data.email };
    return { ok: true, approved: true };
  }

  return {
    ok: true,
    approved: false,
  };
}

async function onLoginSuccess() {
  document.getElementById("authScreen").classList.add("hidden");

  const email = state.user?.email;

  const avatar = document.getElementById("sidebarUserAvatar");
  const emailEl = document.getElementById("sidebarUserEmail");

  if (avatar) avatar.textContent = email?.[0]?.toUpperCase();

  if (emailEl) emailEl.textContent = email;

  setConnStatus(true, "Bağlı");

  await loadBooks();
  await loadHighlights();
  await loadLoans();

  toast("Giriş başarılı", "success");
}

async function signOut() {
  const ok = await appConfirm({
    icon: "🚪",
    title: "Çıkış",
    msg: "Oturum kapatılsın mı?",
    okLabel: "Çıkış",
    okClass: "btn-danger",
  });

  if (!ok) return;

  forceLogout("Çıkış yapıldı");
}

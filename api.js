if (typeof API_BASE === "undefined" || !API_BASE) {
  throw new Error("API_BASE tanımlı değil — index.html içindeki API_BASE sabitini ayarlayın");
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

  // keep index.html's _currentUser in sync
  if (typeof _currentUser !== "undefined") _currentUser = null;

  toast(message, "warning");

  document.getElementById("authScreen")?.classList.remove("hidden");

  // restore sidebar / settings UI to logged-out state
  const strip = document.getElementById("sidebarUserStrip");
  if (strip) strip.style.display = "none";

  const authSec = document.getElementById("settingsAuthSection");
  if (authSec) authSec.style.display = "none";

  const connForm = document.getElementById("settingsConnForm");
  if (connForm) connForm.style.display = "";

  const adminNav = document.getElementById("adminNavItem");
  if (adminNav) adminNav.style.display = "none";

  const authEmail = document.getElementById("authEmail");
  if (authEmail) authEmail.value = "";

  const authPassword = document.getElementById("authPassword");
  if (authPassword) authPassword.value = "";

  const authPending = document.getElementById("authPendingMsg");
  if (authPending) authPending.style.display = "none";

  const authError = document.getElementById("authError");
  if (authError) authError.classList.remove("show");

  const authSuccess = document.getElementById("authSuccess");
  if (authSuccess) authSuccess.classList.remove("show");

  setConnStatus(false, "Oturum Yok");
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

    const body = await safeJson(res);
    if (body === null) throw new Error("Sunucudan geçersiz yanıt alındı");
    return body;
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
      body: b !== undefined ? JSON.stringify(b) : undefined,
    }),

  delete: (p) => apiFetch(p, { method: "DELETE" }),
};

// ── Auth UI state ─────────────────────────────────────────────────────────────

let _authTab = "login";

function switchAuthTab(tab) {
  _authTab = tab;
  document
    .getElementById("authTabLogin")
    .classList.toggle("active", tab === "login");
  document
    .getElementById("authTabRegister")
    .classList.toggle("active", tab === "register");
  document.getElementById("authSubmitBtn").textContent =
    tab === "login" ? "Giriş Yap" : "Kayıt Ol";
  document.getElementById("authError").classList.remove("show");
  document.getElementById("authSuccess").classList.remove("show");
  document.getElementById("authPendingMsg").style.display = "none";
}

function showAuthError(msg) {
  const el = document.getElementById("authError");
  el.textContent = msg;
  el.classList.add("show");
  document.getElementById("authSuccess").classList.remove("show");
}

function showAuthSuccess(msg) {
  const el = document.getElementById("authSuccess");
  el.textContent = msg;
  el.classList.add("show");
  document.getElementById("authError").classList.remove("show");
}

// ── Auth actions ──────────────────────────────────────────────────────────────

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
    // data.email is present for login and admin-register; fall back to the
    // email the user typed so the sidebar is never blank
    state.user = { email: data.email ?? email };
    return { ok: true, approved: true };
  }

  return {
    ok: true,
    approved: false,
  };
}

// Called by HTML onclick / onkeydown — reads values from DOM then delegates
async function handleAuthSubmit() {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;

  const btn = document.getElementById("authSubmitBtn");
  btn.disabled = true;
  btn.textContent =
    _authTab === "login" ? "Giriş yapılıyor..." : "Kayıt yapılıyor...";

  try {
    const result = await submitAuth(_authTab, email, password);
    if (result.approved) {
      await onLoginSuccess();
    } else {
      showAuthSuccess("Kayıt alındı! Admin onayından sonra giriş yapabilirsiniz.");
      switchAuthTab("login");
      document.getElementById("authPendingMsg").style.display = "";
    }
  } catch (e) {
    showAuthError(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = _authTab === "login" ? "Giriş Yap" : "Kayıt Ol";
  }
}

// Loans are fetched here (loadBooks / loadHighlights live in index.html and
// share the same global scope). onLoginSuccess depends on this existing.
async function loadLoans() {
  if (demoMode || !_currentUser) return;
  try {
    const data = await api.get("/loans");
    loans = (Array.isArray(data) ? data : []).map((l) => ({
      ...l,
      bookName: l.book_name,
    }));
    renderLoans();
    updateLoansBadge();
  } catch (e) {
    /* ödünçler yüklenemedi, sessizce geç */
  }
}

async function onLoginSuccess() {
  document.getElementById("authScreen").classList.add("hidden");

  const email = state.user?.email;

  // keep index.html's _currentUser in sync so its guards work
  if (typeof _currentUser !== "undefined") _currentUser = { email };

  const avatar = document.getElementById("sidebarUserAvatar");
  const emailEl = document.getElementById("sidebarUserEmail");

  if (avatar) avatar.textContent = email?.[0]?.toUpperCase() ?? "?";
  if (emailEl) emailEl.textContent = email ?? "";

  const strip = document.getElementById("sidebarUserStrip");
  if (strip) strip.style.display = "";

  const authSec = document.getElementById("settingsAuthSection");
  if (authSec) authSec.style.display = "";

  const connForm = document.getElementById("settingsConnForm");
  if (connForm) connForm.style.display = "none";

  const sAvatar = document.getElementById("settingsUserAvatar");
  if (sAvatar) sAvatar.textContent = email?.[0]?.toUpperCase() ?? "?";

  const sEmail = document.getElementById("settingsUserEmail");
  if (sEmail) sEmail.textContent = email ?? "";

  setConnStatus(true, "Bağlı");

  await loadBooks();
  await loadHighlights();
  await loadLoans();

  if (email === ADMIN_EMAIL) {
    const adminNav = document.getElementById("adminNavItem");
    if (adminNav) adminNav.style.display = "";
  }

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

// ── Startup bootstrap ─────────────────────────────────────────────────────────
// Restore the saved theme and, if a token is present, validate it and auto
// log the user back in. On network failure fall back to demo mode. The auth
// screen is visible by default, so no token simply leaves it shown.
window.addEventListener("load", async () => {
  if (typeof applyTheme === "function") applyTheme(currentTheme);

  const token = tokenStore.get();
  if (!token) {
    setConnStatus(false, "Oturum Yok");
    return;
  }

  try {
    const me = await api.get("/users/me");
    state.user = { email: me.email };
    await onLoginSuccess();
  } catch (e) {
    const msg = e?.message || "";
    if (msg.includes("ağ") || msg.includes("bağlantı")) {
      toast("Backend bağlantısı yok — Demo modda devam ediliyor", "info");
      document.getElementById("authScreen")?.classList.add("hidden");
      if (typeof useDemoMode === "function") useDemoMode();
    } else {
      // invalid/expired token (401 already cleared it via forceLogout)
      tokenStore.clear();
      setConnStatus(false, "Oturum Yok");
    }
  }
});

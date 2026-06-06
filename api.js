const api = {
  get: (path) => apiFetch(path),
  post: (path, body) =>
    apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) =>
    apiFetch(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: (path, body) =>
    apiFetch(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (path) => apiFetch(path, { method: "DELETE" }),
};

function getToken() {
  return localStorage.getItem("bib_token");
}
function setToken(token) {
  localStorage.setItem("bib_token", token);
}
function clearToken() {
  localStorage.removeItem("bib_token");
}

async function getAuthHeader() {
  if (demoMode) return {};
  const token = getToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function apiFetch(path, options = {}) {
  const headers = { ...(await getAuthHeader()), ...(options.headers || {}) };
  const res = await fetch(API_BASE + path, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    _currentUser = null;
    document.getElementById("authScreen")?.classList.remove("hidden");
    throw new Error("Oturum sona erdi, lütfen tekrar giriş yapın");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

function normalizeHighlight(hl) {
  hl.bookId = hl.bookId || hl.book_id;
  return hl;
}

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

async function submitAuth() {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  if (!email || !password) {
    showAuthError("E-posta ve şifre gereklidir.");
    return;
  }
  if (password.length < 6) {
    showAuthError("Şifre en az 6 karakter olmalıdır.");
    return;
  }

  const btn = document.getElementById("authSubmitBtn");
  btn.disabled = true;
  btn.textContent =
    _authTab === "login" ? "Giriş yapılıyor..." : "Kayıt yapılıyor...";

  try {
    if (_authTab === "login") {
      const data = await apiFetch("/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      _currentUser = { email: data.email };
      await onLoginSuccess();
    } else {
      const data = await apiFetch("/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (data.token) {
        setToken(data.token);
        _currentUser = { email };
        await onLoginSuccess();
      } else {
        showAuthSuccess(
          "Kayıt alındı! Admin onayından sonra giriş yapabilirsiniz.",
        );
        switchAuthTab("login");
      }
    }
  } catch (e) {
    showAuthError(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = _authTab === "login" ? "Giriş Yap" : "Kayıt Ol";
  }
}

async function onLoginSuccess() {
  document.getElementById("authScreen").classList.add("hidden");
  const strip = document.getElementById("sidebarUserStrip");
  const avatar = document.getElementById("sidebarUserAvatar");
  const email = document.getElementById("sidebarUserEmail");
  if (strip) strip.style.display = "";
  if (avatar) avatar.textContent = (_currentUser.email || "?")[0].toUpperCase();
  if (email) email.textContent = _currentUser.email || "";
  const authSec = document.getElementById("settingsAuthSection");
  const connForm = document.getElementById("settingsConnForm");
  const sAvatar = document.getElementById("settingsUserAvatar");
  const sEmail = document.getElementById("settingsUserEmail");
  const sApiBase = document.getElementById("settingsApiBase");
  if (authSec) authSec.style.display = "";
  if (connForm) connForm.style.display = "none";
  if (sAvatar)
    sAvatar.textContent = (_currentUser.email || "?")[0].toUpperCase();
  if (sEmail) sEmail.textContent = _currentUser.email || "";
  if (sApiBase) sApiBase.textContent = API_BASE;
  setConnStatus(true, "Bağlı");
  await loadBooks();
  await loadHighlights();
  await loadLoans();
  if (_currentUser.email === ADMIN_EMAIL) {
    const el = document.getElementById("adminNavItem");
    if (el) el.style.display = "";
  }
}

async function signOut() {
  const ok = await appConfirm({
    icon: "🚪",
    title: "Çıkış Yap",
    msg: "Oturumu kapatmak istiyor musunuz?",
    okLabel: "Çıkış Yap",
    okClass: "btn-danger",
    cancelLabel: "İptal",
  });
  if (!ok) return;
  clearToken();
  books = [];
  highlights = [];
  loans = [];
  demoMode = false;
  _currentUser = null;
  document.getElementById("sidebarUserStrip").style.display = "none";
  const sec = document.getElementById("settingsAuthSection");
  if (sec) sec.style.display = "none";
  const form = document.getElementById("settingsConnForm");
  if (form) form.style.display = "";
  document.getElementById("authScreen").classList.remove("hidden");
  document.getElementById("authError").classList.remove("show");
  document.getElementById("authSuccess").classList.remove("show");
  document.getElementById("authEmail").value = "";
  document.getElementById("authPassword").value = "";
  document.getElementById("authPendingMsg").style.display = "none";
  setConnStatus(false, "Oturum Yok");
}

window.addEventListener("load", async () => {
  applyTheme(currentTheme);
  const token = getToken();
  if (!token) {
    document.getElementById("authScreen")?.classList.remove("hidden");
    setConnStatus(false, "Oturum Yok");
    return;
  }
  try {
    const me = await apiFetch("/users/me");
    _currentUser = { email: me.email };
    await onLoginSuccess();
  } catch (e) {
    clearToken();
    document.getElementById("authScreen")?.classList.remove("hidden");
    if (e.message.includes("fetch") || e.message.includes("network")) {
      toast("Backend bağlantısı yok — Demo modda devam ediliyor", "info");
      useDemoMode();
    } else {
      setConnStatus(false, "Oturum Yok");
    }
  }
});

async function loadBooks(page = 1) {
  if (demoMode) {
    renderAll();
    return;
  }
  const grid = document.getElementById("booksGrid");
  if (grid)
    grid.innerHTML = [1, 2, 3, 4]
      .map(
        () =>
          `<div style="background:var(--ink2);border:1px solid var(--border);border-radius:var(--r2);height:180px;animation:shimmer 1.4s infinite linear"></div>`,
      )
      .join("");
  try {
    const res = await apiFetch(`/books?page=${page}&limit=50`);
    books = Array.isArray(res) ? res : res.data || [];
    renderAll();
  } catch (e) {
    toast("Kitaplar yüklenemedi: " + e.message, "error");
  }
}

async function saveBook() {
  const book = getFormData();
  if (!book.title || !book.author) {
    toast("Kitap adı ve yazar zorunlu", "error");
    return;
  }
  if (book.isbn && !validateISBN(book.isbn)) {
    toast("Geçersiz ISBN formatı", "error");
    return;
  }
  const btn = document.getElementById("saveBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Kaydediliyor...';
  try {
    if (demoMode) {
      book.id = "bk_" + Date.now();
      book.created_at = new Date().toISOString();
      books.unshift(book);
      saveDemo();
      clearForm();
      renderAll();
      toast("Kitap eklendi!", "success");
      setTimeout(() => showQR(book.id), 400);
    } else {
      const saved = await apiFetch("/books", {
        method: "POST",
        body: JSON.stringify(book),
      });
      books.unshift(saved);
      clearForm();
      renderAll();
      toast("Kitap kaydedildi!", "success");
      setTimeout(() => showQR(saved.id), 400);
    }
  } catch (e) {
    toast("Kayıt hatası: " + e.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "💾 Kaydet & QR Oluştur";
  }
}

function editBook(bookId) {
  const book = books.find((b) => b.id === bookId);
  if (!book) return;
  showPage("add");
  document.getElementById("f_title").value = book.title || "";
  document.getElementById("f_author").value = book.author || "";
  document.getElementById("f_isbn").value = book.isbn || "";
  document.getElementById("f_publisher").value = book.publisher || "";
  document.getElementById("f_year").value = book.year || "";
  document.getElementById("f_pages").value = book.pages || "";
  document.getElementById("f_genre").value = book.genre || "";
  document.getElementById("f_location").value = book.location || "";
  document.getElementById("f_status").value = book.status || "available";
  document.getElementById("f_copies").value = book.copies || 1;
  document.getElementById("f_desc").value = book.description || "";
  document.getElementById("f_notes").value = book.notes || "";
  document.getElementById("f_lang").value = book.language || "Türkçe";
  document.getElementById("f_read_status").value = book.read_status || "unread";
  document.getElementById("f_current_page").value = book.current_page || "";
  document.getElementById("f_cover_url").value = book.cover_url || "";
  document.getElementById("f_buy_url").value = book.buy_url || "";
  const b64el = document.getElementById("f_cover_b64");
  if (b64el) b64el.value = "";
  previewCover(book.cover_url || "");
  setAddStar(book.rating || 0);

  const btn = document.getElementById("saveBtn");
  btn.innerHTML = "✅ Güncelle";
  btn.onclick = async () => {
    const updated = getFormData();
    if (!updated.title || !updated.author) {
      toast("Kitap adı ve yazar zorunlu", "error");
      return;
    }
    if (updated.isbn && !validateISBN(updated.isbn)) {
      toast("Geçersiz ISBN formatı", "error");
      return;
    }
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Güncelleniyor...';
    const snapshot = { ...book };
    try {
      Object.assign(book, updated);
      if (demoMode) {
        saveDemo();
      } else {
        await apiFetch("/books/" + bookId, {
          method: "PUT",
          body: JSON.stringify(updated),
        });
      }
      clearForm();
      renderAll();
      toast("Kitap güncellendi!", "success");
    } catch (e) {
      Object.assign(book, snapshot);
      toast("Güncelleme hatası: " + e.message, "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = "✅ Güncelle";
    }
  };
}

async function deleteBook(bookId) {
  const book = books.find((b) => b.id === bookId);
  const ok = await appConfirm({
    icon: "🗑️",
    title: "Kitabı Sil",
    msg: book
      ? `"<strong>${esc(book.title)}</strong>" kalıcı olarak silinecek.`
      : "Bu kitabı silmek istiyor musunuz?",
    okLabel: "Evet, Sil",
    okClass: "btn-danger",
  });
  if (!ok) return;
  try {
    if (demoMode) {
      books = books.filter((b) => b.id !== bookId);
      saveDemo();
    } else {
      await apiFetch("/books/" + bookId, { method: "DELETE" });
      books = books.filter((b) => b.id !== bookId);
    }
    renderAll();
    toast("Kitap silindi");
  } catch (e) {
    toast("Silme hatası: " + e.message, "error");
  }
}

async function loadHighlights() {
  if (demoMode) return;
  try {
    const raw = await apiFetch("/highlights");
    highlights = raw.map(normalizeHighlight);
  } catch (e) {
    console.warn("Alıntılar yüklenemedi:", e.message);
  }
}

async function saveHighlight() {
  const text = document.getElementById("hl_text").value.trim();
  if (!text) {
    toast("Alıntı boş olamaz", "error");
    return;
  }
  const bookId = document.getElementById("hl_book").value;
  if (!bookId) {
    toast("Lütfen bir kitap seçin", "error");
    document.getElementById("hl_book_search").focus();
    return;
  }

  const payload = {
    book_id: bookId,
    text,
    page: parseInt(document.getElementById("hl_page").value) || null,
    type: document.getElementById("hl_type").value,
  };

  try {
    let hl;
    if (demoMode) {
      hl = {
        id: "hl_" + Date.now(),
        bookId,
        ...payload,
        createdAt: new Date().toISOString(),
      };
      highlights.unshift(hl);
      saveDemo();
    } else {
      hl = await apiFetch("/highlights", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      highlights.unshift(normalizeHighlight(hl));
    }
    document.getElementById("hl_text").value = "";
    document.getElementById("hl_page").value = "";
    document.getElementById("hl_book").value = "";
    document.getElementById("hl_book_search").value = "";
    closeModal("addHighlightModal");
    renderHighlights();
    toast("Alıntı kaydedildi!", "success");
  } catch (e) {
    toast("Alıntı kaydedilemedi: " + e.message, "error");
  }
}

async function deleteHighlight(id) {
  highlights = highlights.filter((h) => h.id !== id);
  if (demoMode) {
    saveDemo();
  } else {
    try {
      await apiFetch("/highlights/" + id, { method: "DELETE" });
    } catch (e) {
      console.warn(e.message);
    }
  }
  renderHighlights();
}

async function loadLoans() {
  if (demoMode) return;
  try {
    loans = await apiFetch("/loans");
  } catch (e) {
    console.warn("Ödünçler yüklenemedi:", e.message);
  }
}

async function saveLoan() {
  const borrower = document.getElementById("loan_borrower").value.trim();
  if (!borrower) {
    toast("Ödünç alan kişiyi girin", "error");
    return;
  }

  const payload = {
    book_name: document.getElementById("loan_book_name").value.trim() || null,
    borrower_name: borrower,
    borrower_contact:
      document.getElementById("loan_contact").value.trim() || null,
    lent_date: document.getElementById("loan_lent_date").value || null,
    due_date: document.getElementById("loan_due_date").value || null,
    notes: document.getElementById("loan_notes").value.trim() || null,
  };

  try {
    if (demoMode) {
      const loan = {
        id: "ln_" + Date.now(),
        ...payload,
        bookName: payload.book_name,
        returned_date: null,
        created_at: new Date().toISOString(),
      };
      loans.unshift(loan);
      saveLoanStorage();
    } else {
      const loan = await apiFetch("/loans", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      loan.bookName = loan.book_name;
      loans.unshift(loan);
      saveLoanStorage();
    }
    closeModal("addLoanModal");
    renderLoans();
    updateLoansBadge();
    ["loan_book_name", "loan_borrower", "loan_contact", "loan_notes"].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      },
    );
    toast("Ödünç kaydı oluşturuldu!", "success");
  } catch (e) {
    toast("Ödünç kaydedilemedi: " + e.message, "error");
  }
}

async function markLoanReturned(id) {
  const l = loans.find((x) => x.id === id);
  if (!l) return;
  l.returned_date = new Date().toISOString().slice(0, 10);
  if (demoMode) {
    saveLoanStorage();
  } else {
    try {
      await apiFetch("/loans/" + id + "/return", { method: "PATCH" });
      saveLoanStorage();
    } catch (e) {
      toast("Hata: " + e.message, "error");
      return;
    }
  }
  renderLoans();
  updateLoansBadge();
  toast("İade kaydedildi ✅", "success");
}

async function deleteLoan(id) {
  const ok = await appConfirm({
    icon: "🗑️",
    title: "Kaydı Sil",
    msg: "Bu ödünç kaydını silmek istiyor musunuz?",
    okLabel: "Evet, Sil",
    okClass: "btn-danger",
  });
  if (!ok) return;
  loans = loans.filter((l) => l.id !== id);
  if (demoMode) {
    saveLoanStorage();
  } else {
    try {
      await apiFetch("/loans/" + id, { method: "DELETE" });
      saveLoanStorage();
    } catch (e) {
      toast("Hata: " + e.message, "error");
      return;
    }
  }
  renderLoans();
  updateLoansBadge();
  toast("Kayıt silindi");
}

async function renderAdminPanel() {
  if (!_currentUser || _currentUser.email !== ADMIN_EMAIL) {
    showPage("dashboard");
    toast("Bu sayfaya erişim yetkiniz yok", "error");
    return;
  }

  document.getElementById("adminPendingList").innerHTML =
    '<div style="font-size:13px;color:var(--text3);padding:12px;background:var(--ink3);border-radius:var(--r)">⏳ Yükleniyor...</div>';
  document.getElementById("adminApprovedList").innerHTML =
    '<div style="font-size:13px;color:var(--text3);padding:12px;background:var(--ink3);border-radius:var(--r)">⏳ Yükleniyor...</div>';

  try {
    const users = await apiFetch("/users/all");
    const pending = users.filter((u) => !u.approved);
    const approved = users.filter((u) => u.approved);

    document.getElementById("adminPendingList").innerHTML = pending.length
      ? pending
          .map(
            (u) => `
        <div style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--ink3);border:1px solid var(--amber-faint);border-radius:var(--r);margin-bottom:8px;flex-wrap:wrap">
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600;color:var(--text)">${esc(u.email)}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">⏳ Onay bekliyor</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="btn btn-primary" style="height:34px;padding:0 12px;font-size:12px" onclick="adminApproveUser('${u.id}','${esc(u.email)}')">✅ Onayla</button>
            <button class="btn btn-danger"  style="height:34px;padding:0 12px;font-size:12px" onclick="adminRejectUser('${u.id}','${esc(u.email)}')">🗑 Reddet</button>
          </div>
        </div>`,
          )
          .join("")
      : '<div style="font-size:13px;color:var(--green);padding:12px;background:var(--green-bg);border-radius:var(--r)">✅ Onay bekleyen kullanıcı yok</div>';

    document.getElementById("adminApprovedList").innerHTML = approved.length
      ? approved
          .map(
            (u) => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--ink2);border:1px solid var(--border);border-radius:var(--r);margin-bottom:6px;flex-wrap:wrap">
          <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--text)">${esc(u.email)}</div></div>
          <button class="btn btn-ghost" style="height:30px;padding:0 10px;font-size:11px;color:var(--red);border-color:rgba(196,95,95,0.3);flex-shrink:0" onclick="adminRevokeUser('${u.id}','${esc(u.email)}')">Erişimi Kaldır</button>
        </div>`,
          )
          .join("")
      : '<div style="font-size:13px;color:var(--text3);padding:8px">Henüz onaylı kullanıcı yok</div>';
  } catch (e) {
    document.getElementById("adminPendingList").innerHTML =
      `<div style="color:var(--red);font-size:13px;padding:12px;background:var(--red-bg);border-radius:var(--r)">❌ Hata: ${esc(e.message)}</div>`;
    document.getElementById("adminApprovedList").innerHTML = "";
  }
}

async function adminApproveUser(userId, email) {
  try {
    await apiFetch("/users/" + userId + "/approve", { method: "PATCH" });
    toast(`${email} onaylandı ✅`, "success");
    renderAdminPanel();
  } catch (e) {
    toast("Hata: " + e.message, "error");
  }
}

async function adminRevokeUser(userId, email) {
  const ok = await appConfirm({
    icon: "⚠️",
    title: "Erişimi Kaldır",
    msg: `${email} kullanıcısının erişimi kaldırılacak.`,
    okLabel: "Kaldır",
    okClass: "btn-danger",
  });
  if (!ok) return;
  try {
    await apiFetch("/users/" + userId + "/revoke", { method: "PATCH" });
    toast(`${email} erişimi kaldırıldı`, "info");
    renderAdminPanel();
  } catch (e) {
    toast("Hata: " + e.message, "error");
  }
}

async function adminRejectUser(userId, email) {
  const ok = await appConfirm({
    icon: "🗑",
    title: "Reddet",
    msg: `${email} kullanıcısını reddet ve sil?`,
    okLabel: "Sil",
    okClass: "btn-danger",
  });
  if (!ok) return;
  try {
    await apiFetch("/users/" + userId, { method: "DELETE" });
    toast(`${email} reddedildi`, "info");
    renderAdminPanel();
  } catch (e) {
    toast("Hata: " + e.message, "error");
  }
}

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { auth } from "./firebase.js";
import { initConfiguration } from "./configuracion.js";

const loginView = document.querySelector("#login-view");
const appView = document.querySelector("#app-view");
const loginForm = document.querySelector("#login-form");
const loginButton = document.querySelector("#login-button");
const logoutButton = document.querySelector("#logout-button");
const loginStatus = document.querySelector("#login-status");
const sidebarUserEmail = document.querySelector("#sidebar-user-email");
const sidebarUserRole = document.querySelector("#sidebar-user-role");
const openSidebarButton = document.querySelector("#open-sidebar-button");
const closeSidebarButton = document.querySelector("#close-sidebar-button");
const sidebarBackdrop = document.querySelector("#sidebar-backdrop");
const appTitle = document.querySelector("#app-title");
const navItems = [...document.querySelectorAll(".nav-item")];
const contentViews = [...document.querySelectorAll(".content-view")];

function setLoginStatus(message = "", type = "") {
  loginStatus.textContent = message;
  loginStatus.className = `status ${type}`.trim();
}

function setLoading(isLoading) {
  loginButton.disabled = isLoading;
  loginButton.textContent = isLoading ? "Verificando…" : "Entrar";
}

function setSidebarOpen(isOpen) {
  appView.classList.toggle("sidebar-open", isOpen);
  openSidebarButton.setAttribute("aria-expanded", String(isOpen));
}

function closeSidebar() { setSidebarOpen(false); }

function showView(viewId) {
  contentViews.forEach((view) => view.classList.toggle("hidden", view.id !== viewId));
  navItems.forEach((item) => {
    const active = item.dataset.view === viewId;
    item.classList.toggle("active", active);
    if (active) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
  const activeItem = navItems.find((item) => item.dataset.view === viewId);
  appTitle.textContent = activeItem?.textContent.trim() || "Inicio";
  closeSidebar();
}

function showAuthenticatedUser(user) {
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
  sidebarUserEmail.textContent = user.email ?? "Usuario autenticado";
  showView("home-view");
  initConfiguration(user, {
    onRoleChange(role) {
      sidebarUserRole.textContent = role || "Perfil";
    },
  });
}

function showUnauthenticatedUser() {
  appView.classList.add("hidden");
  loginView.classList.remove("hidden");
  sidebarUserEmail.textContent = "";
  sidebarUserRole.textContent = "Perfil";
  closeSidebar();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoginStatus();
  if (!loginForm.reportValidity()) return;
  const formData = new FormData(loginForm);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  setLoading(true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.warn("Authentication attempt failed", { code: error?.code });
    setLoginStatus("No fue posible iniciar sesión. Verifica tus datos o contacta al administrador.", "error");
  } finally {
    setLoading(false);
  }
});

openSidebarButton.addEventListener("click", () => setSidebarOpen(!appView.classList.contains("sidebar-open")));
closeSidebarButton.addEventListener("click", closeSidebar);
sidebarBackdrop.addEventListener("click", closeSidebar);
navItems.forEach((item) => item.addEventListener("click", () => showView(item.dataset.view)));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeSidebar(); });

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  try { await signOut(auth); }
  catch (error) { console.error("Logout failed", { code: error?.code }); }
  finally { logoutButton.disabled = false; }
});

onAuthStateChanged(auth, (user) => {
  if (user) showAuthenticatedUser(user);
  else showUnauthenticatedUser();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("Service worker registration failed", error));
  });
}

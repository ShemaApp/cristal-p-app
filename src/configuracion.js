import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { auth, db } from "./firebase.js";

const DEFAULT_ORGANIZATION_ID = "org_flutt_water";
const DEFAULT_BRANDING = {
  applicationName: "Flutt-Water",
  welcomeTemplate: "Bienvenido a {applicationName}, {displayName}",
  whatsappCreditPhone: "",
};

let currentUser = null;
let currentProfile = null;
let currentBranding = { ...DEFAULT_BRANDING };
let roleCallback = () => {};

const configStatus = document.querySelector("#config-status");
const profileForm = document.querySelector("#profile-form");
const brandingForm = document.querySelector("#branding-form");
const passwordForm = document.querySelector("#password-form");
const profileName = document.querySelector("#profile-name");
const profilePhone = document.querySelector("#profile-phone");
const profileEmail = document.querySelector("#profile-email");
const companyName = document.querySelector("#company-name");
const ticketPhone = document.querySelector("#ticket-phone");
const welcomeTemplate = document.querySelector("#welcome-template");
const configRoleLabel = document.querySelector("#config-role-label");
const currentRole = document.querySelector("#current-role");
const usersSection = document.querySelector("#users-section");

function showStatus(message = "", type = "") {
  configStatus.textContent = message;
  configStatus.className = `status ${type}`.trim();
}

function isAdmin() {
  return currentProfile?.role === "admin" && currentProfile?.active !== false;
}

function renderRole(role = "pendiente") {
  const normalizedRole = String(role || "pendiente");
  configRoleLabel.textContent = normalizedRole;
  currentRole.textContent = normalizedRole;
  roleCallback(normalizedRole);
  usersSection.classList.toggle("hidden", normalizedRole !== "admin");
  brandingForm.querySelector("button").disabled = !isAdmin();
  [...brandingForm.querySelectorAll("input")].forEach((input) => { input.disabled = !isAdmin(); });
}

async function loadProfile() {
  const profileRef = doc(db, "users", currentUser.uid);
  const snapshot = await getDoc(profileRef);
  currentProfile = snapshot.exists() ? snapshot.data() : {
    email: currentUser.email ?? "",
    displayName: currentUser.displayName ?? "",
    role: "pendiente",
    active: true,
    organizationId: DEFAULT_ORGANIZATION_ID,
  };

  profileName.value = currentProfile.displayName || currentUser.displayName || "";
  profilePhone.value = currentProfile.phone || "";
  profileEmail.value = currentUser.email || currentProfile.email || "";
  renderRole(currentProfile.role);
}

async function loadBranding() {
  const organizationId = currentProfile?.organizationId || DEFAULT_ORGANIZATION_ID;
  const organizationSnapshot = await getDoc(doc(db, "organizations", organizationId));
  currentBranding = organizationSnapshot.exists()
    ? { ...DEFAULT_BRANDING, ...organizationSnapshot.data() }
    : { ...DEFAULT_BRANDING };
  companyName.value = currentBranding.applicationName || "Flutt-Water";
  ticketPhone.value = currentBranding.whatsappCreditPhone || "";
  welcomeTemplate.value = currentBranding.welcomeTemplate || DEFAULT_BRANDING.welcomeTemplate;
}

export async function initConfiguration(user, options = {}) {
  currentUser = user;
  roleCallback = options.onRoleChange || (() => {});
  showStatus();
  try {
    await loadProfile();
    await loadBranding();
  } catch (error) {
    // La interfaz conserva defaults si las Rules todavía no permiten leer la estructura.
    console.warn("Configuration data unavailable", { code: error?.code });
    currentProfile = currentProfile || { role: "pendiente", active: true, organizationId: DEFAULT_ORGANIZATION_ID };
    renderRole(currentProfile.role);
    showStatus("Perfil cargado localmente. La lectura de configuración requiere sus reglas de Firestore.", "error");
  }
}

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || !profileForm.reportValidity()) return;
  const displayName = profileName.value.trim();
  const phone = profilePhone.value.trim();
  if (!displayName) return;

  const organizationId = currentProfile?.organizationId || DEFAULT_ORGANIZATION_ID;
  const profileUpdate = {
    email: currentUser.email || "",
    displayName,
    phone,
    organizationId,
    role: currentProfile?.role || "pending",
    active: currentProfile?.active !== false,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, "users", currentUser.uid), profileUpdate, { merge: true });
    currentProfile = { ...currentProfile, ...profileUpdate, displayName, phone };
    showStatus("Perfil guardado correctamente.", "success");
  } catch (error) {
    console.error("Profile save failed", { code: error?.code });
    showStatus("No se pudo guardar el perfil. Verifica las reglas de Firestore.", "error");
  }
});

brandingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || !isAdmin() || !brandingForm.reportValidity()) return;

  const organizationId = currentProfile.organizationId || DEFAULT_ORGANIZATION_ID;
  const brandingUpdate = {
    applicationName: companyName.value.trim() || "Flutt-Water",
    whatsappCreditPhone: ticketPhone.value.trim(),
    welcomeTemplate: welcomeTemplate.value.trim() || DEFAULT_BRANDING.welcomeTemplate,
    updatedBy: currentUser.uid,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, "organizations", organizationId), brandingUpdate, { merge: true });
    currentBranding = { ...currentBranding, ...brandingUpdate };
    showStatus("Configuración de empresa guardada correctamente.", "success");
  } catch (error) {
    console.error("Branding save failed", { code: error?.code });
    showStatus("No se pudo guardar la configuración. Verifica tus permisos de administrador.", "error");
  }
});

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || !passwordForm.reportValidity()) return;
  const formData = new FormData(passwordForm);
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword !== confirmPassword) {
    showStatus("La nueva contraseña y su confirmación no coinciden.", "error");
    return;
  }
  if (newPassword === currentPassword) {
    showStatus("La nueva contraseña debe ser diferente.", "error");
    return;
  }

  try {
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
    passwordForm.reset();
    showStatus("Contraseña actualizada correctamente.", "success");
  } catch (error) {
    console.warn("Password update failed", { code: error?.code });
    showStatus("No se pudo actualizar la contraseña. Verifica la contraseña actual.", "error");
  }
});

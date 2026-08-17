/*
 * Flutt-Water — Firebase web initialization.
 *
 * Esta configuración identifica la aplicación web, pero no es una credencial
 * administrativa. Las autorizaciones reales deben imponerse en Firestore Rules.
 * Nunca colocar aquí service accounts, Admin SDK keys ni tokens de proveedores.
 */
const firebaseConfig = {
  apiKey: "AIzaSyAyKEEz2MkzalMcxJlvHGq9dknJ6XWfR-o",
  authDomain: "flutt-water.firebaseapp.com",
  projectId: "flutt-water",
  storageBucket: "flutt-water.firebasestorage.app",
  messagingSenderId: "700966779244",
  appId: "1:700966779244:web:533e5740b515a5bd0edb49"
};

if (typeof firebase === "undefined") {
  throw new Error("No se pudo cargar Firebase SDK");
}

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// App Check se activará cuando se registre el dominio definitivo en Firebase.
// No se incluye ningún token de depuración ni clave de reCAPTCHA en producción.
if (typeof firebase.appCheck === "function" && window.FLUTT_WATER_APP_CHECK_SITE_KEY) {
  firebase.appCheck().activate(
    new firebase.appCheck.ReCaptchaV3Provider(window.FLUTT_WATER_APP_CHECK_SITE_KEY),
    true
  );
}

// La persistencia solo se aplica a Firestore. No se cachean respuestas de Auth.
db.enablePersistence({ synchronizeTabs: true }).catch((error) => {
  if (error.code === "failed-precondition") {
    console.warn("Firestore offline: otra pestaña ya utiliza la persistencia.");
  } else if (error.code === "unimplemented") {
    console.warn("Firestore offline: el navegador no soporta persistencia.");
  } else {
    console.warn("Firestore offline no disponible.");
  }
});

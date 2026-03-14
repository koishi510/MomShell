import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";

import "./styles/reset.css";
import "./styles/variables.css";
import "./styles/animations.css";
import "./styles/mobile.css";

const app = createApp(App);
app.use(createPinia());
app.mount("#app");

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

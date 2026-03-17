<template>
  <div class="neutral-landing">
    <!-- Dynamic background elements -->
    <div class="ambient-glow glow-1"></div>
    <div class="ambient-glow glow-2"></div>
    <div class="ambient-glow glow-3"></div>

    <div class="landing-content">
      <div class="logo-container">
        <h1 class="title">MomShell</h1>
        <p class="subtitle">贝壳回响 · 家庭情感中枢</p>
      </div>

      <div class="action-group">
        <button class="btn-primary" @click="openAuth('login')">
          <span>账号登录</span>
        </button>
        <button class="btn-secondary" @click="openAuth('register')">
          <span>注册新家庭</span>
        </button>
        <button class="btn-text" @click="openAuth('guest')">
          以游客身份体验 &rarr;
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()

function openAuth(mode: 'login' | 'register' | 'guest') {
  uiStore.openAuth(mode)
}
</script>

<style scoped>
.neutral-landing {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background-color: #0f1115;
  background-image: radial-gradient(circle at 50% 0%, #1a1d24 0%, #0f1115 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  z-index: 10;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* Ambient background glows for a neutral, calm tech feel */
.ambient-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.5;
  pointer-events: none;
  animation: float 20s ease-in-out infinite alternate;
}

.glow-1 {
  width: 500px;
  height: 500px;
  background: rgba(142, 161, 225, 0.15); /* Soft slate blue */
  top: -10%;
  left: -10%;
  animation-delay: 0s;
}

.glow-2 {
  width: 400px;
  height: 400px;
  background: rgba(225, 182, 142, 0.1); /* Soft warm sand */
  bottom: 10%;
  right: -5%;
  animation-delay: -5s;
  animation-duration: 25s;
}

.glow-3 {
  width: 600px;
  height: 600px;
  background: rgba(150, 220, 210, 0.08); /* Soft teal */
  top: 40%;
  left: 30%;
  animation-delay: -10s;
  animation-duration: 30s;
}

@keyframes float {
  0% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0, 0) scale(1); }
}

.landing-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 64px;
  text-align: center;
  padding: 40px;
}

.logo-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.title {
  font-size: 56px;
  font-weight: 700;
  letter-spacing: 2px;
  margin: 0;
  background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.subtitle {
  font-size: 18px;
  font-weight: 400;
  letter-spacing: 6px;
  color: #94a3b8;
  margin: 0;
  text-transform: uppercase;
}

.action-group {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 280px;
  animation: fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
  opacity: 0;
}

button {
  appearance: none;
  border: none;
  outline: none;
  background: none;
  font-family: inherit;
  cursor: pointer;
  border-radius: 100px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-primary {
  height: 52px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 1px;
  backdrop-filter: blur(10px);
}

.btn-primary:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-secondary {
  height: 52px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 1px;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.btn-text {
  margin-top: 12px;
  color: #64748b;
  font-size: 14px;
  letter-spacing: 1px;
}

.btn-text:hover {
  color: #94a3b8;
}

@keyframes fadeUp {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* Responsive */
@media (max-width: 768px) {
  .title {
    font-size: 42px;
  }
  .subtitle {
    font-size: 14px;
    letter-spacing: 4px;
  }
  .btn-primary, .btn-secondary {
    height: 48px;
    font-size: 15px;
  }
}
</style>

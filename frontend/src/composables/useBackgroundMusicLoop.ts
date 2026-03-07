import { onMounted, onUnmounted, readonly, ref } from 'vue'
import shoreAndYou from '@/assets/audio/The Shore and You.mp3'
import travelogue from '@/assets/audio/Travelogue.mp3'

const TRACKS = [shoreAndYou, travelogue]
const UNLOCK_EVENTS: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart']
const DEFAULT_VOLUME = 0.45

const currentTrackIndex = ref(0)
const isBackgroundMusicPlaying = ref(false)
const backgroundMusicVolume = ref(DEFAULT_VOLUME)

let activeConsumers = 0
let isInitialized = false
let audioPlayers: HTMLAudioElement[] = []
let endedHandlers: Array<() => void> = []

function clampVolume(volume: number) {
  return Math.min(1, Math.max(0, volume))
}

function applyVolume() {
  audioPlayers.forEach((audio) => {
    audio.volume = backgroundMusicVolume.value
  })
}

function removeUnlockListeners() {
  UNLOCK_EVENTS.forEach((eventName) => {
    window.removeEventListener(eventName, unlockPlayback)
  })
}

function addUnlockListeners() {
  removeUnlockListeners()
  UNLOCK_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, unlockPlayback, { passive: true })
  })
}

function stopOtherTracks(activeIndex: number) {
  audioPlayers.forEach((audio, audioIndex) => {
    if (audioIndex !== activeIndex) {
      audio.pause()
      audio.currentTime = 0
    }
  })
}

async function playTrack(index: number, restart = false) {
  if (!audioPlayers.length) {
    return
  }

  currentTrackIndex.value = index
  stopOtherTracks(index)

  const currentAudio = audioPlayers[index]
  if (restart) {
    currentAudio.currentTime = 0
  }

  try {
    await currentAudio.play()
    isBackgroundMusicPlaying.value = true
    removeUnlockListeners()
  } catch {
    isBackgroundMusicPlaying.value = false
    addUnlockListeners()
  }
}

function playNextTrack() {
  const nextTrackIndex = (currentTrackIndex.value + 1) % TRACKS.length
  void playTrack(nextTrackIndex, true)
}

function unlockPlayback() {
  removeUnlockListeners()
  void playTrack(currentTrackIndex.value)
}

function ensureAudioPlayers() {
  if (isInitialized) {
    return
  }

  endedHandlers = TRACKS.map((_, index) => () => {
    if (index === currentTrackIndex.value && isBackgroundMusicPlaying.value) {
      playNextTrack()
    }
  })

  audioPlayers = TRACKS.map((src, index) => {
    const audio = new Audio(src)
    audio.preload = 'auto'
    audio.loop = false
    audio.volume = backgroundMusicVolume.value
    audio.addEventListener('ended', endedHandlers[index])
    return audio
  })

  isInitialized = true
}

function destroyAudioPlayers() {
  removeUnlockListeners()

  audioPlayers.forEach((audio, index) => {
    audio.pause()
    audio.currentTime = 0
    audio.removeEventListener('ended', endedHandlers[index])
    audio.src = ''
    audio.load()
  })

  audioPlayers = []
  endedHandlers = []
  currentTrackIndex.value = 0
  isBackgroundMusicPlaying.value = false
  isInitialized = false
}

export function playBackgroundMusic() {
  void playTrack(currentTrackIndex.value)
}

export function pauseBackgroundMusic() {
  removeUnlockListeners()
  audioPlayers.forEach((audio, index) => {
    audio.pause()
    if (index !== currentTrackIndex.value) {
      audio.currentTime = 0
    }
  })
  isBackgroundMusicPlaying.value = false
}

export function toggleBackgroundMusic() {
  if (isBackgroundMusicPlaying.value) {
    pauseBackgroundMusic()
    return
  }

  playBackgroundMusic()
}

export function setBackgroundMusicVolume(volume: number) {
  backgroundMusicVolume.value = clampVolume(volume)
  applyVolume()
}

export function useBackgroundMusicControls() {
  return {
    backgroundMusicVolume: readonly(backgroundMusicVolume),
    isBackgroundMusicPlaying: readonly(isBackgroundMusicPlaying),
    playBackgroundMusic,
    pauseBackgroundMusic,
    toggleBackgroundMusic,
    setBackgroundMusicVolume,
  }
}

export function useBackgroundMusicLoop() {
  onMounted(() => {
    activeConsumers += 1
    ensureAudioPlayers()
    applyVolume()
    void playTrack(currentTrackIndex.value, currentTrackIndex.value === 0)
  })

  onUnmounted(() => {
    activeConsumers -= 1

    if (activeConsumers <= 0) {
      activeConsumers = 0
      destroyAudioPlayers()
    }
  })

  return useBackgroundMusicControls()
}

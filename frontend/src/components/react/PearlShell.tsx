import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { Hands, Results } from "@mediapipe/hands";
import gsap from "gsap";

// --- Performance Tuning Constants ---
const MEDIAPIPE_MODEL_COMPLEXITY = 0; // 0=lite (fast), 1=standard
const MEDIAPIPE_FRAME_INTERVAL_MS = 100; // ms between inference calls (~10fps)
const CAMERA_WIDTH = 320;
const CAMERA_HEIGHT = 240;
const RENDER_THROTTLE_MS = 33; // ~30fps cap when hand tracking active
const CAMERA_FOLLOW_THROTTLE_MS = 100;

// --- Seeded PRNG (mulberry32) for deterministic visual randomness ---
// Used instead of rand() to satisfy static analysis (S2245).
// This is purely cosmetic (particle positions, rotations); no security context.
function createSeededRandom(seed: number) {
  let s = Math.trunc(seed);
  return () => {
    s = Math.trunc(s + 0x6d2b79f5);
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Props Interface ---
export interface PearlShellProps {
  photoUrls: string[];
  isFullscreen: boolean;
  onRequestFullscreen?: () => void;
  onExitFullscreen?: () => void;
  showDebug?: boolean;
}

// --- Helper: Create Texture Atlas for Particles ---
const createAtlasTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, 512, 512);
  ctx.fillStyle = "#ffffff";
  ctx.font = "120px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText("★", 128, 128);
  ctx.fillText("●", 384, 128);
  ctx.fillText("✦", 128, 384);
  ctx.fillText("✿", 384, 384);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
};

// --- Shaders ---
const shellVertexShader = `
  attribute vec3 targetPos;
  attribute float randomOffset;
  attribute float shapeIndex;
  attribute float surfaceV;

  uniform float time;
  uniform float scatterProgress;
  uniform vec3 cometTailDir;

  varying vec2 vUv;
  varying float vScatter;
  varying float vShapeIndex;
  varying float vSurfaceV;
  varying float vTrailFade;

  void main() {
    vUv = uv;
    vScatter = scatterProgress;
    vShapeIndex = shapeIndex;
    vSurfaceV = surfaceV;
    vTrailFade = 1.0;

    vec3 instanceCenter = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec3 vertexOffset = (instanceMatrix * vec4(position, 1.0)).xyz - instanceCenter;

    if (scatterProgress > 0.01) {
      float t = fract(randomOffset / 6.28318);
      float tailDist = pow(t, 1.5) * 55.0;
      float spread = t * 8.0;
      vec3 spreadDir = normalize(targetPos);
      vec3 cometPos = cometTailDir * tailDist
        + spreadDir * spread * (0.6 + 0.4 * sin(time * 0.5 + randomOffset));
      vTrailFade = 1.0 - t;
      float sizeScale = mix(2.0, 0.3, t);
      vec3 scaledOffset = vertexOffset * mix(1.0, sizeScale, scatterProgress);
      vec3 center = mix(instanceCenter, cometPos, scatterProgress);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(center + scaledOffset, 1.0);
    } else {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(instanceCenter + vertexOffset, 1.0);
    }
  }
`;

const shellFragmentShader = `
  uniform sampler2D atlas;
  varying vec2 vUv;
  varying float vScatter;
  varying float vShapeIndex;
  varying float vSurfaceV;
  varying float vTrailFade;

  void main() {
    float col = mod(vShapeIndex, 2.0);
    float row = floor(vShapeIndex / 2.0);
    vec2 atlasUv = (vUv * 0.5) + vec2(col * 0.5, 0.5 - row * 0.5);
    vec4 texColor = texture2D(atlas, atlasUv);

    vec3 shellColor = mix(vec3(1.0, 0.95, 0.8), vec3(1.0, 0.7, 0.4), vSurfaceV);
    float edgeGlow = pow(vSurfaceV, 2.0);
    shellColor += vec3(1.0, 0.8, 0.5) * edgeGlow * 0.8;
    float shellAlpha = (0.8 + edgeGlow * 0.4) * texColor.a;

    vec3 headColor = vec3(1.0, 1.0, 0.9);
    vec3 midColor  = vec3(1.0, 0.7, 0.3);
    vec3 tailColor = vec3(0.8, 0.25, 0.05);
    vec3 cometColor = mix(tailColor, midColor, smoothstep(0.0, 0.5, vTrailFade));
    cometColor = mix(cometColor, headColor, smoothstep(0.5, 1.0, vTrailFade));
    cometColor += vec3(0.5, 0.4, 0.2) * pow(vTrailFade, 3.0);
    float cometAlpha = pow(vTrailFade, 0.5) * 0.9 * texColor.a;

    vec3 color = mix(shellColor, cometColor, vScatter);
    float alpha = mix(shellAlpha, cometAlpha, vScatter);

    float thresh = mix(0.1, 0.01, vScatter);
    if (alpha < thresh) discard;

    gl_FragColor = vec4(color, alpha);
  }
`;

// --- Gesture Helpers (module-level to avoid deep nesting) ---
type Landmark = { x: number; y: number };

const getDist2D = (p1: Landmark, p2: Landmark) => {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
};

const isFingerExtended = (
  landmarks: Landmark[],
  tipIdx: number,
  pipIdx: number,
) => {
  return (
    getDist2D(landmarks[tipIdx], landmarks[0]) >
    getDist2D(landmarks[pipIdx], landmarks[0])
  );
};

const detectGesture = (landmarks: Landmark[]): string => {
  const palmSize = getDist2D(landmarks[0], landmarks[9]);

  const indexExt = isFingerExtended(landmarks, 8, 6);
  const middleExt = isFingerExtended(landmarks, 12, 10);
  const ringExt = isFingerExtended(landmarks, 16, 14);
  const pinkyExt = isFingerExtended(landmarks, 20, 18);

  const allExt = indexExt && middleExt && ringExt && pinkyExt;
  const noneExt = !indexExt && !middleExt && !ringExt && !pinkyExt;
  const peaceExt = indexExt && middleExt && !ringExt && !pinkyExt;

  const thumbFingerDists = [
    getDist2D(landmarks[4], landmarks[8]),
    getDist2D(landmarks[4], landmarks[12]),
    getDist2D(landmarks[4], landmarks[16]),
    getDist2D(landmarks[4], landmarks[20]),
  ];
  const minThumbFingerDist = Math.min(...thumbFingerDists) / palmSize;

  if (noneExt) return "FIST";
  if (peaceExt) return "PEACE";
  if (minThumbFingerDist < 0.3) return "OK";
  if (allExt) return "OPEN";
  return "UNKNOWN";
};

const computeShellTarget = (landmark9: Landmark) => {
  const posX = Math.max(-15, Math.min(15, -(landmark9.x - 0.5) * 30));
  const posY = Math.max(-10, Math.min(10, -(landmark9.y - 0.5) * 20));
  const targetY = (landmark9.x - 0.5) * Math.PI * 2;
  const targetX = (landmark9.y - 0.5) * Math.PI;
  return {
    position: { x: posX, y: posY, z: 0 },
    rotation: { x: targetX, y: targetY },
  };
};

// --- Animation helpers (extracted to reduce cognitive complexity) ---
const updateCometTail = (
  shellGroup: THREE.Group | null,
  state: { scatterProgress: number },
  shellMat: THREE.ShaderMaterial,
  prevShellPos: THREE.Vector3,
) => {
  if (!shellGroup || state.scatterProgress <= 0.01) return;
  const sp = shellGroup.position;
  const dx = sp.x - prevShellPos.x;
  const dy = sp.y - prevShellPos.y;
  const spd = Math.hypot(dx, dy);

  if (spd > 0.05) {
    const tailVal = shellMat.uniforms.cometTailDir.value;
    tailVal.x += (-dx / spd - tailVal.x) * 0.08;
    tailVal.y += (-dy / spd - tailVal.y) * 0.08;
    tailVal.normalize();
  }

  prevShellPos.set(sp.x, sp.y, sp.z);
};

const renderPhotosWithoutBloom = (
  photoGroup: THREE.Group | null,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
) => {
  if (!photoGroup || photoGroup.children.length === 0) return;
  camera.layers.set(1);
  renderer.autoClear = false;
  renderer.clearDepth();
  const bg = scene.background;
  scene.background = null;
  renderer.render(scene, camera);
  scene.background = bg;
  renderer.autoClear = true;
};

// --- Main Component ---
export default function PearlShell({
  photoUrls,
  isFullscreen,
  onRequestFullscreen,
  onExitFullscreen,
  showDebug = false,
}: Readonly<PearlShellProps>) {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [gesture, setGesture] = useState<string>("UNKNOWN");
  const processedPhotosCount = useRef(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const upperShellRef = useRef<THREE.InstancedMesh | null>(null);
  const lowerShellRef = useRef<THREE.InstancedMesh | null>(null);
  const photoGroupRef = useRef<THREE.Group | null>(null);
  const shellGroupRef = useRef<THREE.Group | null>(null);
  const targetShellRotationRef = useRef({ x: 0, y: 0 });
  const targetShellPositionRef = useRef({ x: 0, y: 0, z: 0 });
  const handPositionRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const gestureBufferRef = useRef<string[]>([]);
  const stableGestureRef = useRef<string>("UNKNOWN");
  const streamRef = useRef<MediaStream | null>(null);
  const handTrackingActiveRef = useRef(false);
  const lastCameraFollowTimeRef = useRef(0);
  const GESTURE_STABILITY_FRAMES = 3;

  // Debug refs
  const rawGestureRef = useRef<string>("UNKNOWN");
  const landmark9Ref = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [debugInfo, setDebugInfo] = useState({
    rawGesture: "UNKNOWN",
    stableGesture: "UNKNOWN",
    landmark9: { x: 0, y: 0 },
    targetPos: { x: 0, y: 0, z: 0 },
    shellPos: { x: 0, y: 0, z: 0 },
  });

  const stateRef = useRef({
    currentState: "CLOSED",
    scatterProgress: 0,
    shellOpenAngle: 0,
    bloomIntensity: 0.2,
    time: 0,
  });

  const isAnimatingCameraRef = useRef(false);
  const currentZoomIndexRef = useRef(0);
  const zoomedPhotoDataRef = useRef<{
    mesh: THREE.Mesh;
    originalPosition: THREE.Vector3;
    originalQuaternion: THREE.Quaternion;
  } | null>(null);

  // Auto-open ref
  const hasAutoOpened = useRef(false);

  // transitionTo ref so it can be called from effects
  const transitionToRef = useRef<(newState: string) => void>(() => {});

  // Initialize Three.js
  useEffect(() => {
    if (!mountRef.current) return;

    const rand = createSeededRandom(42);

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd48a56);
    scene.fog = new THREE.FogExp2(0xd48a56, 0.015);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 28);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Post-processing
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.4,
      0.5,
      0.85,
    );
    bloomPass.threshold = 0.5;
    bloomPass.strength = 0.6;
    bloomPass.radius = 0.7;

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composerRef.current = composer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffeedd, 1);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    // Shell Group
    const shellGroup = new THREE.Group();
    scene.add(shellGroup);
    shellGroupRef.current = shellGroup;

    // Shells
    const particleCount = 8000;
    const scaleGeo = new THREE.PlaneGeometry(0.15, 0.15);

    const atlasTex = createAtlasTexture();

    const shellMat = new THREE.ShaderMaterial({
      vertexShader: shellVertexShader,
      fragmentShader: shellFragmentShader,
      uniforms: {
        time: { value: 0 },
        scatterProgress: { value: 0 },
        atlas: { value: atlasTex },
        cometTailDir: { value: new THREE.Vector3(0, -1, 0) },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const createShellHalf = (isUpper: boolean) => {
      const instancedMesh = new THREE.InstancedMesh(
        scaleGeo,
        shellMat,
        particleCount,
      );
      const dummy = new THREE.Object3D();

      const targetPosArray = new Float32Array(particleCount * 3);
      const randomOffsetArray = new Float32Array(particleCount);
      const shapeIndexArray = new Float32Array(particleCount);
      const surfaceVArray = new Float32Array(particleCount);

      const numRibs = 13;
      const thetaMax = Math.PI * 0.4;

      for (let i = 0; i < particleCount; i++) {
        let u = rand();
        let v = rand();

        const type = rand();
        if (type < 0.5) {
          const ribU = u * (numRibs - 1);
          u = (Math.floor(ribU + 0.5) + (rand() - 0.5) * 0.15) / (numRibs - 1);
          u = Math.max(0, Math.min(1, u));
        } else if (type < 0.7) {
          v = 1 - Math.pow(rand(), 4);
        } else if (type < 0.8) {
          v = Math.pow(rand(), 4);
        }

        const theta = -thetaMax + u * (2 * thetaMax);
        const L = 14 + 2 * Math.cos(theta);

        const exactRibU = u * (numRibs - 1);
        const exactRibFraction = exactRibU - Math.floor(exactRibU);
        const bulge = Math.sin(exactRibFraction * Math.PI) * 1.2 * v;

        const R = v * L + bulge;

        const taper = Math.pow(Math.sin(u * Math.PI), 0.5);
        let z = Math.sin(v * Math.PI) * taper * 3.5;

        let x = R * Math.sin(theta);
        let y = -6 + R * Math.cos(theta);

        x += (rand() - 0.5) * 0.3;
        y += (rand() - 0.5) * 0.3;
        z += (rand() - 0.5) * 0.3;

        if (!isUpper) {
          z = -z;
        }

        dummy.position.set(x, y, z);
        dummy.lookAt(x * 2, y * 2, z * 2 + (isUpper ? 10 : -10));
        dummy.rotateZ(rand() * Math.PI * 2);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);

        targetPosArray[i * 3] = (rand() - 0.5) * 60;
        targetPosArray[i * 3 + 1] = (rand() - 0.5) * 60;
        targetPosArray[i * 3 + 2] = (rand() - 0.5) * 60;

        randomOffsetArray[i] = rand() * Math.PI * 2;
        shapeIndexArray[i] = Math.floor(rand() * 4);
        surfaceVArray[i] = v;
      }

      instancedMesh.geometry.setAttribute(
        "targetPos",
        new THREE.InstancedBufferAttribute(targetPosArray, 3),
      );
      instancedMesh.geometry.setAttribute(
        "randomOffset",
        new THREE.InstancedBufferAttribute(randomOffsetArray, 1),
      );
      instancedMesh.geometry.setAttribute(
        "shapeIndex",
        new THREE.InstancedBufferAttribute(shapeIndexArray, 1),
      );
      instancedMesh.geometry.setAttribute(
        "surfaceV",
        new THREE.InstancedBufferAttribute(surfaceVArray, 1),
      );

      instancedMesh.position.set(0, 0, 0);
      for (let i = 0; i < particleCount; i++) {
        instancedMesh.getMatrixAt(i, dummy.matrix);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
        dummy.position.y -= -6;
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
      }
      instancedMesh.position.y = -6;

      return instancedMesh;
    };

    const upperShell = createShellHalf(true);
    const lowerShell = createShellHalf(false);

    shellGroup.add(upperShell);
    shellGroup.add(lowerShell);
    upperShellRef.current = upperShell;
    lowerShellRef.current = lowerShell;

    // Photo Group
    const photoGroup = new THREE.Group();
    shellGroup.add(photoGroup);
    photoGroupRef.current = photoGroup;

    // Animation Loop
    const clock = new THREE.Clock();
    let animFrameId: number;
    const prevShellPos = new THREE.Vector3();
    let lastRenderTime = 0;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);

      // Throttle to ~30fps when hand tracking is active to reduce GPU contention
      if (handTrackingActiveRef.current) {
        const now = performance.now();
        if (now - lastRenderTime < RENDER_THROTTLE_MS) return;
        lastRenderTime = now;
      }

      const time = clock.getElapsedTime();
      stateRef.current.time = time;

      if (!isAnimatingCameraRef.current) {
        controls.update();
      }

      shellMat.uniforms.time.value = time;
      shellMat.uniforms.scatterProgress.value =
        stateRef.current.scatterProgress;

      // Interpolate shell group rotation and position
      const shellGroup = shellGroupRef.current;
      if (shellGroup) {
        shellGroup.rotation.x +=
          (targetShellRotationRef.current.x - shellGroup.rotation.x) * 0.1;
        shellGroup.rotation.y +=
          (targetShellRotationRef.current.y - shellGroup.rotation.y) * 0.1;

        shellGroup.position.x +=
          (targetShellPositionRef.current.x - shellGroup.position.x) * 0.2;
        shellGroup.position.y +=
          (targetShellPositionRef.current.y - shellGroup.position.y) * 0.2;
        shellGroup.position.z +=
          (targetShellPositionRef.current.z - shellGroup.position.z) * 0.2;
      }

      if (upperShellRef.current) {
        upperShellRef.current.rotation.x = stateRef.current.shellOpenAngle;
      }
      if (lowerShellRef.current) {
        lowerShellRef.current.rotation.x = -stateRef.current.shellOpenAngle;
      }

      // Comet tail direction
      updateCometTail(shellGroup, stateRef.current, shellMat, prevShellPos);

      // Animate Photos
      if (photoGroupRef.current) {
        const zData = zoomedPhotoDataRef.current;
        if (stateRef.current.currentState === "PHOTO_ZOOM" && zData) {
          zData.mesh.position.y += Math.sin(time * 1.5) * 0.003;
          zData.mesh.rotation.y = Math.sin(time * 0.8) * 0.03;
        }
      }

      // Bloom pass
      camera.layers.set(0);
      composer.render();

      // Photos without bloom
      renderPhotosWithoutBloom(photoGroupRef.current, camera, renderer, scene);

      camera.layers.enableAll();
    };

    animate();

    // ResizeObserver instead of window resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mountRef.current);

    return () => {
      cancelAnimationFrame(animFrameId);
      controls.dispose();
      resizeObserver.disconnect();
      renderer.domElement.remove();
      renderer.dispose();
    };
  }, []);

  // Update Photos from props
  useEffect(() => {
    if (!photoGroupRef.current || photoUrls.length === 0) return;

    const rand = createSeededRandom(137 + processedPhotosCount.current);
    const group = photoGroupRef.current;
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin("anonymous");

    const newPhotos = photoUrls.slice(processedPhotosCount.current);
    if (newPhotos.length === 0) return;

    newPhotos.forEach((photoUrl) => {
      textureLoader.load(
        photoUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          const aspect = texture.image.width / texture.image.height;
          const geo = new THREE.PlaneGeometry(2 * aspect, 2);
          const mat = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            fog: false,
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.layers.set(1);

          const angle = rand() * Math.PI * 2;
          const radius = 6 + rand() * 4;
          const height = (rand() - 0.5) * 8;

          mesh.position.set(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius,
          );
          mesh.lookAt(0, 0, 0);

          group.add(mesh);

          const currentState = stateRef.current.currentState;
          if (currentState === "OPEN") {
            mat.opacity = 1;
          } else if (currentState === "PHOTO_ZOOM") {
            mat.opacity = 0.3;
          }
        },
        undefined,
        (err) => {
          console.error("Failed to load photo texture:", err);
        },
      );
    });

    processedPhotosCount.current = photoUrls.length;
  }, [photoUrls]);

  // Helper: put back zoomed photo
  const putBackZoomedPhoto = () => {
    const data = zoomedPhotoDataRef.current;
    if (!data) return;
    const { mesh, originalPosition, originalQuaternion } = data;
    gsap.to(mesh.position, {
      x: originalPosition.x,
      y: originalPosition.y,
      z: originalPosition.z,
      duration: 0.5,
      ease: "power2.inOut",
    });
    gsap.to(mesh.quaternion, {
      x: originalQuaternion.x,
      y: originalQuaternion.y,
      z: originalQuaternion.z,
      w: originalQuaternion.w,
      duration: 0.5,
      ease: "power2.inOut",
    });
    gsap.to(mesh.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.5,
      ease: "power2.inOut",
    });
    zoomedPhotoDataRef.current = null;
  };

  // State Transition Helpers
  const animateToClosed = (
    state: typeof stateRef.current,
    prevState: string,
  ) => {
    const photosVisible = prevState === "OPEN" || prevState === "PHOTO_ZOOM";
    const shellDelay = photosVisible ? 1.5 : 0;

    gsap.to(state, {
      shellOpenAngle: 0,
      duration: 1.5,
      delay: shellDelay,
      ease: "power2.inOut",
    });
    gsap.to(state, { scatterProgress: 0, duration: 2, ease: "power2.inOut" });
    gsap.to(state, { bloomIntensity: 0.2, duration: 1, delay: shellDelay });

    if (photoGroupRef.current) {
      photoGroupRef.current.children.forEach((child) => {
        const mat = (child as THREE.Mesh).material;
        gsap.killTweensOf(mat, "opacity");
        gsap.to(mat, { opacity: 0, duration: 1 });
      });
    }

    if (cameraRef.current && controlsRef.current) {
      isAnimatingCameraRef.current = true;
      gsap.to(cameraRef.current.position, {
        x: 0,
        y: 0,
        z: 28,
        duration: 2,
        delay: shellDelay,
      });
      gsap.to(controlsRef.current.target, {
        x: 0,
        y: 0,
        z: 0,
        duration: 2,
        delay: shellDelay,
        onComplete: () => {
          isAnimatingCameraRef.current = false;
        },
      });
    }
  };

  const animateToOpen = (state: typeof stateRef.current) => {
    gsap.to(state, {
      shellOpenAngle: (Math.PI / 180) * 60,
      duration: 2,
      ease: "power2.inOut",
    });
    gsap.to(state, { scatterProgress: 0, duration: 2, ease: "power2.inOut" });
    gsap.to(state, { bloomIntensity: 0.8, duration: 2 });

    if (photoGroupRef.current) {
      photoGroupRef.current.children.forEach((child) => {
        gsap.to((child as THREE.Mesh).material, {
          opacity: 1,
          duration: 2,
          delay: 1.5,
        });
      });
    }
  };

  const animateToScattered = (state: typeof stateRef.current) => {
    gsap.to(state, { shellOpenAngle: 0, duration: 1, ease: "power2.inOut" });
    gsap.to(state, { scatterProgress: 1, duration: 3, ease: "power2.inOut" });
    gsap.to(state, { bloomIntensity: 0.3, duration: 2 });

    if (photoGroupRef.current) {
      photoGroupRef.current.children.forEach((child) => {
        gsap.to((child as THREE.Mesh).material, {
          opacity: 0,
          duration: 1.5,
        });
      });
    }

    if (cameraRef.current && controlsRef.current) {
      isAnimatingCameraRef.current = true;
      gsap.to(cameraRef.current.position, { x: 0, y: 5, z: 35, duration: 2 });
      gsap.to(controlsRef.current.target, {
        x: 0,
        y: 0,
        z: 0,
        duration: 2,
        onComplete: () => {
          isAnimatingCameraRef.current = false;
        },
      });
    }
  };

  const animateToPhotoZoom = (state: typeof stateRef.current) => {
    targetShellPositionRef.current = { x: 0, y: 0, z: 0 };
    targetShellRotationRef.current = { x: 0, y: 0 };

    gsap.to(state, {
      shellOpenAngle: (Math.PI / 180) * 60,
      duration: 1,
      ease: "power2.inOut",
    });
    gsap.to(state, { scatterProgress: 0, duration: 1, ease: "power2.inOut" });

    const children = photoGroupRef.current!.children;
    const count = children.length;
    if (count === 0) return;

    putBackZoomedPhoto();

    const index = currentZoomIndexRef.current % count;
    currentZoomIndexRef.current = (index + 1) % count;
    const photo = children[index] as THREE.Mesh;

    const originalPosition = photo.position.clone();
    const originalQuaternion = photo.quaternion.clone();
    zoomedPhotoDataRef.current = {
      mesh: photo,
      originalPosition,
      originalQuaternion,
    };

    children.forEach((child) => {
      gsap.to((child as THREE.Mesh).material, {
        opacity: 0.3,
        duration: 0.5,
      });
    });

    gsap.to(photo.position, {
      x: 0,
      y: 0,
      z: 18,
      duration: 0.8,
      ease: "back.out(1.4)",
    });
    gsap.to(photo.quaternion, {
      x: 0,
      y: 0,
      z: 0,
      w: 1,
      duration: 0.8,
      ease: "power2.out",
    });
    gsap.to(photo.scale, {
      x: 2.5,
      y: 2.5,
      z: 2.5,
      duration: 0.8,
      ease: "back.out(1.2)",
    });
    gsap.to(photo.material, { opacity: 1, duration: 0.5 });
  };

  // State Transitions
  const transitionTo = (newState: string) => {
    const state = stateRef.current;
    if (state.currentState === newState) return;

    if (state.currentState === "PHOTO_ZOOM" && newState !== "PHOTO_ZOOM") {
      putBackZoomedPhoto();
      if (photoGroupRef.current) {
        photoGroupRef.current.children.forEach((child) => {
          gsap.to(child.scale, { x: 1, y: 1, z: 1, duration: 0.5 });
        });
      }
    }

    if (
      newState === "PHOTO_ZOOM" &&
      (!photoGroupRef.current || photoGroupRef.current.children.length === 0)
    ) {
      return;
    }

    const prevState = state.currentState;
    state.currentState = newState;

    if (newState === "CLOSED") {
      animateToClosed(state, prevState);
    } else if (newState === "OPEN") {
      animateToOpen(state);
    } else if (newState === "SCATTERED") {
      animateToScattered(state);
    } else if (newState === "PHOTO_ZOOM") {
      animateToPhotoZoom(state);
    }
  };

  // Keep transitionToRef in sync
  transitionToRef.current = transitionTo;

  // Auto-open animation
  useEffect(() => {
    if (photoUrls.length > 0 && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      setTimeout(() => transitionToRef.current("OPEN"), 800);
    }
  }, [photoUrls]);

  // Initialize MediaPipe Hands
  useEffect(() => {
    if (!videoRef.current) return;

    let cancelled = false;
    let handsInstance: Hands | null = null;
    let inferenceFrameId: number | null = null;

    const initMediaPipe = async () => {
      const hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      if (cancelled) {
        hands.close();
        return;
      }
      handsInstance = hands;

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: MEDIAPIPE_MODEL_COMPLEXITY,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults((results: Results) => {
        if (cancelled) return;
        handTrackingActiveRef.current = true;
        if (
          !results.multiHandLandmarks ||
          results.multiHandLandmarks.length === 0
        ) {
          return;
        }

        const landmarks = results.multiHandLandmarks[0];
        const detectedGesture = detectGesture(landmarks);

        rawGestureRef.current = detectedGesture;
        landmark9Ref.current = { x: landmarks[9].x, y: landmarks[9].y };

        // Stabilize gesture via buffer
        const buffer = gestureBufferRef.current;
        buffer.push(detectedGesture);
        if (buffer.length > GESTURE_STABILITY_FRAMES) buffer.shift();

        const isStable =
          buffer.length === GESTURE_STABILITY_FRAMES &&
          buffer.every((g) => g === detectedGesture);

        if (isStable && stableGestureRef.current !== detectedGesture) {
          stableGestureRef.current = detectedGesture;
          setGesture(detectedGesture);
        }

        // Update shell position/rotation based on hand
        if (stateRef.current.currentState === "PHOTO_ZOOM") {
          targetShellPositionRef.current = { x: 0, y: 0, z: 0 };
          targetShellRotationRef.current = { x: 0, y: 0 };
        } else {
          const target = computeShellTarget(landmarks[9]);
          targetShellPositionRef.current = target.position;
          targetShellRotationRef.current = target.rotation;
        }

        if (detectedGesture === "OK") {
          handPositionRef.current = { x: landmarks[9].x, y: landmarks[9].y };
        }

        // Camera follow in scattered mode
        const shouldFollowCamera =
          stateRef.current.currentState === "SCATTERED" &&
          detectedGesture !== "OK" &&
          detectedGesture !== "FIST" &&
          detectedGesture !== "PEACE";

        if (shouldFollowCamera && cameraRef.current && controlsRef.current) {
          const now = performance.now();
          if (now - lastCameraFollowTimeRef.current < CAMERA_FOLLOW_THROTTLE_MS)
            return;
          lastCameraFollowTimeRef.current = now;

          const x = (landmarks[9].x - 0.5) * 2;
          const y = -(landmarks[9].y - 0.5) * 2;
          const targetX = x * 20;
          const targetY = Math.max(2, y * 20 + 10);
          gsap.to(cameraRef.current.position, {
            x: targetX,
            y: targetY,
            duration: 0.5,
            ease: "power1.out",
            overwrite: true,
          });
        }
      });

      if (cancelled || !videoRef.current) {
        hands.close();
        return;
      }

      // Custom getUserMedia + rAF loop (replaces @mediapipe/camera_utils Camera)
      // Lower resolution + throttled inference to reduce GPU contention
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: CAMERA_WIDTH, height: CAMERA_HEIGHT },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          hands.close();
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();

        let lastInferenceTime = 0;
        let inferenceInFlight = false;
        const processFrame = async () => {
          if (cancelled) return;
          inferenceFrameId = requestAnimationFrame(processFrame);

          const now = performance.now();
          if (now - lastInferenceTime < MEDIAPIPE_FRAME_INTERVAL_MS) return;
          if (inferenceInFlight) return;
          lastInferenceTime = now;

          if (video.readyState >= 2) {
            inferenceInFlight = true;
            try {
              await hands.send({ image: video });
            } catch (err) {
              console.warn("MediaPipe hands.send failed:", err);
            } finally {
              inferenceInFlight = false;
            }
          }
        };
        inferenceFrameId = requestAnimationFrame(processFrame);
      } catch (err: unknown) {
        console.error("Camera start failed:", err);
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "";
          setCameraError(
            message ||
              "Failed to access camera. Please ensure permissions are granted.",
          );
        }
      }

      if (cancelled) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        hands.close();
      }
    };

    initMediaPipe();

    return () => {
      cancelled = true;
      if (inferenceFrameId !== null) cancelAnimationFrame(inferenceFrameId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (handsInstance) handsInstance.close();
      handTrackingActiveRef.current = false;
      gestureBufferRef.current = [];
    };
  }, []);

  // Gesture → state transitions
  useEffect(() => {
    const currentState = stateRef.current.currentState;

    if (gesture === "FIST") {
      transitionTo("CLOSED");
    } else if (currentState === "PHOTO_ZOOM") {
      if (gesture === "OPEN") {
        transitionTo("OPEN");
      }
      return;
    } else if (gesture === "PEACE") {
      transitionTo("OPEN");
    } else if (gesture === "OPEN") {
      if (currentState !== "OPEN") {
        transitionTo("SCATTERED");
      }
    } else if (gesture === "OK") {
      if (currentState === "OPEN") {
        transitionTo("PHOTO_ZOOM");
      }
    }
  }, [gesture]);

  // Debug info update
  useEffect(() => {
    if (!showDebug) return;
    const interval = setInterval(() => {
      const shellGroup = shellGroupRef.current;
      setDebugInfo({
        rawGesture: rawGestureRef.current,
        stableGesture: stableGestureRef.current,
        landmark9: { ...landmark9Ref.current },
        targetPos: { ...targetShellPositionRef.current },
        shellPos: shellGroup
          ? {
              x: shellGroup.position.x,
              y: shellGroup.position.y,
              z: shellGroup.position.z,
            }
          : { x: 0, y: 0, z: 0 },
      });
    }, 200);
    return () => clearInterval(interval);
  }, [showDebug]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: isFullscreen ? "100vh" : "100%",
        overflow: "hidden",
        backgroundColor: "#d48a56",
      }}
    >
      {/* Three.js mount point */}
      <div
        ref={mountRef}
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
      />

      {/* Fullscreen toggle button */}
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 20 }}>
        {isFullscreen ? (
          <button
            onClick={onExitFullscreen}
            style={{
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.3)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "50%",
              color: "#fff",
              cursor: "pointer",
              fontSize: 18,
            }}
            aria-label="Exit fullscreen"
          >
            ✕
          </button>
        ) : (
          <button
            onClick={onRequestFullscreen}
            style={{
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.3)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "50%",
              color: "#fff",
              cursor: "pointer",
              fontSize: 14,
            }}
            aria-label="Expand to fullscreen"
          >
            ⛶
          </button>
        )}
      </div>

      {/* Gesture hints */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 12,
          zIndex: 10,
          pointerEvents: "none",
          color: "#fff",
          fontSize: 11,
          background: "rgba(0,0,0,0.2)",
          padding: "8px 12px",
          borderRadius: 10,
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.15)",
          lineHeight: 1.8,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4 }}>GESTURE CONTROLS</div>
        <div>
          <span
            style={{ display: "inline-block", width: 80, color: "#ffd8a8" }}
          >
            ✊ FIST
          </span>{" "}
          Close Shell
        </div>
        <div>
          <span
            style={{ display: "inline-block", width: 80, color: "#ffd8a8" }}
          >
            ✌️ PEACE
          </span>{" "}
          Open Shell
        </div>
        <div>
          <span
            style={{ display: "inline-block", width: 80, color: "#ffd8a8" }}
          >
            🖐️ OPEN
          </span>{" "}
          Scatter
        </div>
        <div>
          <span
            style={{ display: "inline-block", width: 80, color: "#ffd8a8" }}
          >
            👌 OK
          </span>{" "}
          Zoom Photo
        </div>
      </div>

      {/* Debug panel */}
      {showDebug && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 10,
            pointerEvents: "none",
            color: "#fff",
            fontSize: 10,
            background: "rgba(0,0,0,0.3)",
            padding: "8px 12px",
            borderRadius: 10,
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.15)",
            fontFamily: "monospace",
            lineHeight: 1.6,
          }}
        >
          <div>Raw: {debugInfo.rawGesture}</div>
          <div>Stable: {debugInfo.stableGesture}</div>
          <div>State: {stateRef.current.currentState}</div>
          <div>
            Lm9: ({debugInfo.landmark9.x.toFixed(3)},{" "}
            {debugInfo.landmark9.y.toFixed(3)})
          </div>
          <div>
            Target: ({debugInfo.targetPos.x.toFixed(1)},{" "}
            {debugInfo.targetPos.y.toFixed(1)})
          </div>
          <div>
            Shell: ({debugInfo.shellPos.x.toFixed(1)},{" "}
            {debugInfo.shellPos.y.toFixed(1)})
          </div>
        </div>
      )}

      {/* Camera error */}
      {cameraError && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(220,50,50,0.9)",
            color: "#fff",
            padding: "24px 32px",
            borderRadius: 16,
            textAlign: "center",
            zIndex: 50,
            backdropFilter: "blur(12px)",
            maxWidth: 360,
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Camera Access Denied
          </h3>
          <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 12 }}>
            {cameraError}
          </p>
          <button
            onClick={() => globalThis.location.reload()}
            style={{
              background: "#fff",
              color: "#c33",
              fontWeight: 700,
              padding: "8px 24px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Refresh Page
          </button>
        </div>
      )}

      {/* Hidden video element for MediaPipe hand tracking */}
      <video
        ref={videoRef}
        style={{ display: "none" }}
        playsInline
        autoPlay
        muted
      />
    </div>
  );
}

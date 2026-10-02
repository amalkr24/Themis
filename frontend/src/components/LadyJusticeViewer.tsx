import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface LadyJusticeViewerProps {
  scrollProgress?: number; // 0.0 to 1.0 continuous scroll
  currentSection?: number;  // 0 to 4
}

export default function LadyJusticeViewer({ scrollProgress }: LadyJusticeViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loadPercent, setLoadPercent] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const modelRef = useRef<THREE.Group | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Liquid-smooth scroll tracking refs
  const currentScrollProgress = useRef(0);
  const targetScrollProgress = useRef(0);

  const currentRotationY = useRef(0.28);
  const currentPositionX = useRef(1.38);
  const currentPositionY = useRef(-0.58);

  const mouseParallax = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof scrollProgress === 'number') {
      targetScrollProgress.current = scrollProgress;
    }
  }, [scrollProgress]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      38,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0.35, 5.2);
    camera.lookAt(0, 0.2, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // --- Museum Studio Lighting (Clean, No Halo, Balanced for Dark Statue on #edf0f5 Clay) ---
    // Pure white ambient light for soft shadow definition
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    // Main Studio Key Light (Upper Front-Right, sculpts dark drapery and scales)
    const keyLight = new THREE.DirectionalLight(0xfffbf5, 3.2);
    keyLight.position.set(4.5, 7.5, 4.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    // Soft Fill Light (Upper Front-Left, subtle slate tone matching #edf0f5 canvas)
    const fillLight = new THREE.DirectionalLight(0xdde3ed, 1.6);
    fillLight.position.set(-4.5, 4.0, 3.5);
    scene.add(fillLight);

    // (NOTE: Backlight/rim light remains removed to ensure NO halo effect)

    // Subtle Ground Shadow Plane (soft grounding contact shadow)
    const shadowPlaneGeo = new THREE.PlaneGeometry(8, 8);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.12 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.6;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // --- Load Lady Justice GLB Model ---
    const loader = new GLTFLoader();
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelRef.current = modelGroup;

    loader.load(
      '/models/lady-justice.glb',
      (gltf) => {
        const loadedModel = gltf.scene;

        // Auto compute bounding box to normalize scale and center
        const box = new THREE.Box3().setFromObject(loadedModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Center model geometry
        loadedModel.position.x -= center.x;
        loadedModel.position.y -= center.y;
        loadedModel.position.z -= center.z;

        // Normalize height to standard world units for balanced editorial framing
        const maxDim = Math.max(size.x, size.y, size.z);
        const normScale = 4.50 / maxDim;
        loadedModel.scale.set(normScale, normScale, normScale);

        // Apply rich dark bronze/obsidian texture with satin metallic highlights (Reference Lourve style)
        loadedModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            if (mesh.material) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              // Dark charcoal/obsidian bronze finish preserving surface relief & normals
              mat.color.setHex(0x23262f);
              mat.roughness = 0.38;
              mat.metalness = 0.65;
              mat.needsUpdate = true;
            }
          }
        });

        modelGroup.add(loadedModel);
        modelGroup.position.set(currentPositionX.current, currentPositionY.current, 0);
        modelGroup.rotation.y = currentRotationY.current;

        setIsLoaded(true);
      },
      (xhr) => {
        if (xhr.total > 0) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100);
          setLoadPercent(percent);
        }
      },
      (error) => {
        console.error('Error loading Lady Justice GLB model:', error);
      }
    );

    // --- Direct High-Performance Passive Scroll Listener ---
    const updateScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        targetScrollProgress.current = Math.min(Math.max(window.scrollY / docHeight, 0), 1);
      }
    };
    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();

    // --- Mouse Parallax & Drag Handling ---
    let isDragging = false;
    let previousMouseX = 0;
    let dragDeltaY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseParallax.current.x = normX * 0.08;
      mouseParallax.current.y = normY * 0.05;

      if (isDragging) {
        const deltaX = e.clientX - previousMouseX;
        dragDeltaY += deltaX * 0.007;
        previousMouseX = e.clientX;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMouseX = e.clientX;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    // --- Resize Handler ---
    const handleResize = () => {
      if (!container || !cameraRef.current) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Keyframes for the 5 editorial stations across the landing page (Placed toward the right)
    const getKeyframes = () => {
      const isMobile = window.innerWidth < 1024;
      return [
        // 0.0 - Hero: 3/4 classical profile view, positioned right with clear negative space for text
        { rotY: 0.28, rotX: 0.01, posX: isMobile ? 0 : 1.38, posY: -0.58, scale: 1.05 },
        // 0.25 - BNS 2024 Transition: Rotates dynamically toward the scales & sword
        { rotY: -0.42, rotX: -0.03, posX: isMobile ? 0 : 1.45, posY: -0.54, scale: 1.10 },
        // 0.50 - Assessments: Poised standing with balanced scales
        { rotY: 0.40, rotX: 0.04, posX: isMobile ? 0 : 1.35, posY: -0.62, scale: 1.08 },
        // 0.75 - Advocates: Noble frontal framing
        { rotY: -0.18, rotX: 0.01, posX: isMobile ? 0 : 1.40, posY: -0.56, scale: 1.05 },
        // 1.00 - Action/Footer: Majestic perspective
        { rotY: 0.24, rotX: 0.06, posX: isMobile ? 0 : 1.36, posY: -0.60, scale: 1.02 },
      ];
    };

    // --- Animation Loop with Buttery Smooth Damping ---
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Liquid smooth interpolation of scroll progress (factor 0.06 for effortless gliding)
      currentScrollProgress.current = THREE.MathUtils.lerp(
        currentScrollProgress.current,
        targetScrollProgress.current,
        0.065
      );

      // Compute interpolated target transform from keyframes
      const keyframes = getKeyframes();
      const clampedProgress = Math.min(Math.max(currentScrollProgress.current, 0), 1);
      const totalSegments = keyframes.length - 1;
      const progressSegment = clampedProgress * totalSegments;
      const index = Math.min(Math.floor(progressSegment), totalSegments - 1);
      const rawT = progressSegment - index;

      // Smooth Hermite cubic ease-in-out: t * t * (3 - 2 * t)
      const smoothT = rawT * rawT * (3 - 2 * rawT);

      const kfStart = keyframes[index];
      const kfEnd = keyframes[index + 1];

      const targetRotY = kfStart.rotY + (kfEnd.rotY - kfStart.rotY) * smoothT;
      const targetRotX = kfStart.rotX + (kfEnd.rotX - kfStart.rotX) * smoothT;
      const targetPosX = kfStart.posX + (kfEnd.posX - kfStart.posX) * smoothT;
      const targetPosY = kfStart.posY + (kfEnd.posY - kfStart.posY) * smoothT;
      const targetScl = kfStart.scale + (kfEnd.scale - kfStart.scale) * smoothT;

      // Gentle organic breathing float
      const breath = Math.sin(elapsed * 1.3) * 0.012;

      // Smooth Model Transformation with damping
      if (modelRef.current) {
        const mg = modelRef.current;

        // Smooth rotation with mouse parallax and user drag
        const destRotY = targetRotY + mouseParallax.current.x + dragDeltaY;
        const destRotX = targetRotX - mouseParallax.current.y;
        mg.rotation.y = THREE.MathUtils.lerp(mg.rotation.y, destRotY, 0.08);
        mg.rotation.x = THREE.MathUtils.lerp(mg.rotation.x, destRotX, 0.08);

        // Smooth position
        mg.position.x = THREE.MathUtils.lerp(mg.position.x, targetPosX, 0.08);
        mg.position.y = THREE.MathUtils.lerp(mg.position.y, targetPosY + breath, 0.08);

        // Smooth scale
        const curScale = mg.scale.x;
        const newScale = THREE.MathUtils.lerp(curScale, targetScl, 0.06);
        mg.scale.set(newScale, newScale, newScale);
      }

      renderer.render(scene, camera);
    };

    animate();

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      resizeObserver.disconnect();

      scene.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) {
          const mesh = object as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-auto select-none overflow-hidden">
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Model Loading Screen (Tactile Clay Neomorphic Minimal Loader) */}
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#edf0f5]/90 backdrop-blur-md z-30 transition-opacity">
          <div className="neo-card p-6 md:p-8 space-y-4 text-center max-w-xs w-full">
            <div className="w-10 h-10 rounded-2xl neo-btn-black flex items-center justify-center mx-auto text-white shadow-md">
              <span className="animate-spin text-base">⚖️</span>
            </div>
            <div className="space-y-1">
              <span className="font-extrabold text-xs uppercase tracking-wider text-[#0f172a]">
                Statutory 3D Monument
              </span>
              <p className="text-[11px] text-slate-500 font-semibold">
                Loading Lady Justice.glb ({loadPercent || 25}%)
              </p>
            </div>
            {/* Neomorphic Inset Progress Bar */}
            <div className="w-full h-2 neo-inset rounded-full overflow-hidden">
              <div
                className="h-full bg-[#111317] transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(loadPercent, 12)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

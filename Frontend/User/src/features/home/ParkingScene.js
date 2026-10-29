import React from "react";
import * as THREE from "three";
import { getParkingScrollView } from "./parkingScroll";
import { createParkingLot } from "./parkingModels";

// A lightweight parking diorama. All geometry is local; no model downloads.
function ParkingScene({ scrollStateRef }) {
  const containerRef = React.useRef(null);
  const motionRef = React.useRef(true);
  const [hasDetailedCar, setHasDetailedCar] = React.useState(false);
  const [stage, setStage] = React.useState("Arriving");
  const [paused, setPaused] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [unavailable, setUnavailable] = React.useState(false);
  motionRef.current = !paused && !reducedMotion;

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(preference.matches);
    const updatePreference = () => setReducedMotion(preference.matches);
    preference.addEventListener("change", updatePreference);
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
    catch {
      setUnavailable(true);
      const story = container.closest(".home-scroll-story");
      if (story) story.dataset.staticScene = "true";
      preference.removeEventListener("change", updatePreference);
      return undefined;
    }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 80);
    camera.position.set(9, 9, 11);
    camera.lookAt(0, 0, 0);
    const model = createParkingLot(scene);
    const { lot } = model;
    scene.add(new THREE.HemisphereLight(0xe3efff, 0x3d4c3c, 2.2));
    const light = new THREE.DirectionalLight(0xffedce, 4);
    light.position.set(-4, 9, 6);
    light.castShadow = true;
    if (light.shadow) {
      light.shadow.mapSize.set(1024, 1024);
      Object.assign(light.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: .5, far: 30 });
      light.shadow.normalBias = .035;
      light.shadow.bias = -.0003;
    }
    scene.add(light);
    const rim = new THREE.DirectionalLight(0x9ec8ed, 1.6);
    rim.position.set(6, 4, -5);
    scene.add(rim);
    if (renderer.shadowMap) {
      // Lower-cost lighting on small screens keeps the driving animation responsive.
      renderer.shadowMap.enabled = !window.matchMedia("(max-width: 600px)").matches;
      renderer.shadowMap.type = THREE.PCFShadowMap;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    let disposed = false;
    let detailedAsset;
    if (!preference.matches && window.matchMedia("(min-width: 1000px)").matches && !navigator.connection?.saveData) {
      import("./loadDetailedCar").then(({ loadDetailedCar }) => {
        if (disposed) return undefined;
        return loadDetailedCar(renderer, () => disposed);
      }).then((asset) => {
        if (!asset) return;
        if (disposed) { asset.dispose(); return; }
        detailedAsset = asset;
        scene.environment = asset.environment.texture;
        model.setDetailedCar(asset.group);
        setHasDetailedCar(true);
        draw();
      }).catch(() => { /* The lightweight local car stays available if the detailed asset cannot load. */ });
    }
    let frame = 0;
    let visible = true;
    let last = 0;
    let phase = 3;
    let previousStage = "Arriving";
    let displayedScroll = scrollStateRef?.current?.progress || 0;
    const pointer = { x: 0, y: 0 };
    function draw() { renderer.render(scene, camera); }
    function resetClock() { last = window.performance.now(); }
    document.addEventListener("visibilitychange", resetClock);
    function resize() {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.set(10, 9.5, width < 400 ? 15.5 : 13);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      draw();
    }
    function animate(now) {
      frame = window.requestAnimationFrame(animate);
      if (!visible || document.hidden || !motionRef.current) { last = now - last > 100 ? now : last; return; }
      const delta = Math.max(0, (now - last) / 1000);
      last = now;
      phase += delta;
      // Stable framing keeps the driving sequence readable; pointer parallax stays subtle.
      lot.rotation.y += (pointer.x * .06 - lot.rotation.y) * .035;
      lot.rotation.x += (pointer.y * .02 - lot.rotation.x) * .035;
      const scrolling = scrollStateRef?.current?.enabled;
      let currentStage;
      if (scrolling) {
        const targetScroll = scrollStateRef.current.progress;
        displayedScroll += (targetScroll - displayedScroll) * (1 - Math.exp(-Math.min(delta, .1) * 5));
        const view = getParkingScrollView(displayedScroll);
        camera.position.set(...view.camera);
        camera.lookAt(...view.target);
        currentStage = model.updateShowcase(view);
      } else {
        camera.position.set(10, 9.5, container.clientWidth < 400 ? 15.5 : 13);
        camera.lookAt(0, 0, 0);
        currentStage = model.update(phase);
      }
      if (currentStage !== previousStage) { previousStage = currentStage; setStage(currentStage); }
      draw();
    }
    function onPointer(event) {
      if (event.pointerType === "touch") return;
      const bounds = container.getBoundingClientRect();
      pointer.x = (event.clientX - bounds.left) / bounds.width - .5;
      pointer.y = (event.clientY - bounds.top) / bounds.height - .5;
    }
    function resetPointer() { pointer.x = 0; pointer.y = 0; }
    const sizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    sizeObserver?.observe(container);
    const visibilityObserver = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resetClock(); }) : null;
    visibilityObserver?.observe(container);
    container.addEventListener("pointermove", onPointer);
    container.addEventListener("pointerleave", resetPointer);
    window.addEventListener("resize", resize);
    resize();
    frame = window.requestAnimationFrame(animate);
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      sizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      preference.removeEventListener("change", updatePreference);
      container.removeEventListener("pointermove", onPointer);
      container.removeEventListener("pointerleave", resetPointer);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", resetClock);
      const materials = new Set();
      scene.traverse((object) => {
        object.geometry?.dispose();
        if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => materials.add(material));
      });
      materials.forEach((material) => material.dispose());
      model.texture.dispose();
      detailedAsset?.disposeTextures();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [scrollStateRef]);

  return (
    <div className="parking-scene-shell">
      <div className="parking-scene" ref={containerRef} aria-hidden="true" />
      {!unavailable && <div className="parking-scene-status" aria-hidden="true"><i /><span>{stage}</span><small>Illustrative sequence</small></div>}
      {hasDetailedCar && <a className="parking-model-credit" href={`${process.env.PUBLIC_URL}/models/CarConcept-ATTRIBUTION.txt`} target="_blank" rel="noreferrer">3D car: Eric Chadwick / DGG - CC BY 4.0</a>}
      <p className="parking-scene-description">Illustrative 3D parking scene. On desktop, scroll to rotate a featured car from a three-quarter view to an overhead view and reveal its parking space. On smaller screens, cars arrive, park and leave in an automatic animation.</p>
      {unavailable ? <div className="parking-scene-fallback"><span aria-hidden="true">P</span><p>Your next space, one step closer.</p></div> : (
        <button className="parking-scene-toggle" type="button" disabled={reducedMotion} aria-pressed={paused || reducedMotion} onClick={() => setPaused((value) => !value)}>
          {reducedMotion ? "Static view - reduced motion" : paused ? "Play 3D animation" : "Pause 3D animation"}
        </button>
      )}
    </div>
  );
}
export default ParkingScene;

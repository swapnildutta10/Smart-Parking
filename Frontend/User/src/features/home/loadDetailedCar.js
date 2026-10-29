import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Loaded separately on desktop so booking controls never wait for the model.
export async function loadDetailedCar(renderer, isDisposed = () => false) {
  const gltf = await new GLTFLoader().loadAsync(`${process.env.PUBLIC_URL}/models/parking-car.glb`);
  const variants = gltf.parser.json.extensions?.KHR_materials_variants?.variants || [];
  const pearl = variants.findIndex((variant) => variant.name === "Pearly Swirly");
  const assignments = [];
  gltf.scene.traverse((object) => {
    if (!object.isMesh) return;
    const mapping = object.userData.gltfExtensions?.KHR_materials_variants?.mappings?.find((item) => item.variants.includes(pearl));
    if (mapping) assignments.push(gltf.parser.getDependency("material", mapping.material).then((paint) => { object.material = paint; }));
  });
  await Promise.all(assignments);
  const source = gltf.scene;
  let bounds = new THREE.Box3().setFromObject(source);
  const size = bounds.getSize(new THREE.Vector3());
  if (size.x > size.z) source.rotation.y += Math.PI / 2;
  source.updateMatrixWorld(true);
  bounds = new THREE.Box3().setFromObject(source);
  const dimensions = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 1.8 / Math.max(dimensions.x, dimensions.z);
  const group = new THREE.Group();
  group.add(source);
  group.scale.setScalar(scale);
  group.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  const textures = new Set();
  const materials = new Set();
  const geometries = new Set();
  source.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    geometries.add(object.geometry);
    for (const paint of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(paint);
      // Tinted glass keeps the vehicle readable without an expensive transmission pass.
      if (paint.transmission > 0) { paint.transmission = 0; paint.transparent = true; paint.opacity = .55; paint.depthWrite = false; }
      paint.envMapIntensity = .9;
      for (const value of Object.values(paint)) if (value?.isTexture) textures.add(value);
    }
  });
  function disposeSource() {
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((paint) => paint.dispose());
    textures.forEach((texture) => texture.dispose());
  }
  if (isDisposed()) { disposeSource(); return undefined; }
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, .04);
  room.dispose();
  pmrem.dispose();
  function disposeTextures() { textures.forEach((texture) => texture.dispose()); environment.dispose(); }
  function dispose() {
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((paint) => paint.dispose());
    disposeTextures();
  }
  return { group, environment, dispose, disposeTextures };
}

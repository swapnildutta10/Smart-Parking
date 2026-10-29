import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getParkingSequence } from "./parkingMotion";

export function createParkingLot(scene) {
  const lot = new THREE.Group();
  scene.add(lot);
  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .6, metalness: .15, ...extra });
  const mint = material(0x9ddbbd);
  const ivory = material(0xd4d6c8);
  const dark = material(0x111c24);
  function mesh(geometry, paint, x, y, z, parent = lot) {
    const item = new THREE.Mesh(geometry, paint);
    item.position.set(x, y, z);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  function box(w, h, d, paint, x, y, z, parent = lot) {
    return mesh(new THREE.BoxGeometry(w, h, d), paint, x, y, z, parent);
  }
  function rounded(w, h, d, paint, x, y, z, parent) {
    const radius = Math.min(.1, w / 5, d / 5);
    const shape = new THREE.Shape();
    const left = -w / 2, right = w / 2, bottom = -d / 2, top = d / 2;
    shape.moveTo(left + radius, bottom);
    shape.lineTo(right - radius, bottom);
    shape.quadraticCurveTo(right, bottom, right, bottom + radius);
    shape.lineTo(right, top - radius);
    shape.quadraticCurveTo(right, top, right - radius, top);
    shape.lineTo(left + radius, top);
    shape.quadraticCurveTo(left, top, left, top - radius);
    shape.lineTo(left, bottom + radius);
    shape.quadraticCurveTo(left, bottom, left + radius, bottom);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .035, bevelThickness: .025, curveSegments: 5 });
    const item = mesh(geometry, paint, x, y, z, parent);
    item.rotation.x = -Math.PI / 2;
    return item;
  }
  // Fine deterministic asphalt grain, with no external textures to download.
  const pixels = new Uint8Array(64 * 64 * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    const grain = 72 + ((i * 13 + (i >> 5) * 7) % 20);
    pixels[i] = grain; pixels[i + 1] = grain + 5; pixels[i + 2] = grain + 8; pixels[i + 3] = 255;
  }
  const asphaltTexture = new THREE.DataTexture(pixels, 64, 64, THREE.RGBAFormat);
  asphaltTexture.needsUpdate = true;
  const road = material(0x79868b, { map: asphaltTexture, roughness: .98, metalness: 0 });
  rounded(10.6, .22, 7.4, material(0x293e43), 0, -.48, 0, lot);
  box(10.3, .22, 7.1, material(0x83998c), 0, -.23, 0);
  box(10, .08, 6.8, road, 0, -.065, 0);
  // Short access aprons support cars before they enter and after they leave the lot.
  for (const x of [-5.55, 5.55]) {
    box(1.2, .16, 1.65, material(0x60736b), x, -.2, 0);
    box(1.2, .08, 1.6, road, x, -.065, 0);
  }
  box(10.3, .06, .22, material(0xc9cab7), 0, .02, -3.43);
  box(10.3, .06, .22, material(0xc9cab7), 0, .02, 3.43);
  for (let x = -4.4; x < 4.8; x += .6) {
    box(.32, .015, .035, ivory, x, .005, 0);
  }
  // Crossing at the entrance and a pedestrian edge.
  for (let x = -4.7; x < -3.9; x += .18) box(.09, .012, 1.3, ivory, x, .01, 0);
  box(10, .025, .025, material(0xc8ac68), 0, .005, 3.05);
  let bayIndicator;
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const x = -3.2 + col * 1.28;
      const z = row === 0 ? -2.25 : 2.25;
      box(.025, .012, 1.8, ivory, x - .61, .01, z);
      box(1.22, .012, .025, ivory, x, .01, row === 0 ? -3.13 : 3.13);
      box(.42, .07, .09, dark, x, .04, row === 0 ? -2.95 : 2.95);
      if ((col + row * 2) % 3 === 0 || (row === 0 && col === 4)) {
        const ring = mesh(new THREE.RingGeometry(.18, .20, 24), mint, x, .015, z);
        ring.rotation.x = -Math.PI / 2;
        ring.castShadow = false;
        if (row === 0 && col === 4) bayIndicator = ring;
        continue;
      }
      const parked = makeCar([0xd5dedf, 0x647c91, 0xb66d53, 0xe0d4ae, 0x394f62][(col + row) % 5]);
      parked.group.position.set(x, .015, z);
      parked.group.rotation.y = row === 0 ? Math.PI : 0;
    }
  }
  function makeCar(color) {
    const group = new THREE.Group();
    lot.add(group);
    const paint = material(color, { metalness: .55, roughness: .28 });
    const glass = material(0x18313e, { metalness: .5, roughness: .18 });
    const trim = material(0x263138);
    const silver = material(0xabbac1, { metalness: .8, roughness: .3 });
    const brake = material(0xb22c26, { emissive: 0xff3425, emissiveIntensity: .25 });
    const indicator = material(0xf6aa44, { emissive: 0xff9519, emissiveIntensity: .2 });
    const indicatorOff = material(0xc78b3d, { emissive: 0xff9519, emissiveIntensity: .03 });
    const reverseLamp = material(0xd3d6ce, { emissive: 0xf2fff5, emissiveIntensity: .05 });
    const lamp = material(0xffedc8, { emissive: 0xffe8bd, emissiveIntensity: 1 });
    rounded(.82, .22, 1.72, paint, 0, .2, 0, group);
    rounded(.65, .26, .86, glass, 0, .42, -.08, group);
    rounded(.61, .045, .48, paint, 0, .7, -.12, group);
    // Sloped screens, window pillars, hood panel and separate bumpers.
    const frontScreen = box(.6, .25, .035, glass, 0, .56, .35, group);
    frontScreen.rotation.x = -.42;
    const rearScreen = box(.6, .23, .035, glass, 0, .55, -.51, group);
    rearScreen.rotation.x = .4;
    for (const side of [-1, 1]) {
      box(.018, .26, .035, paint, side * .34, .56, -.12, group);
      box(.018, .025, .09, silver, side * .43, .39, -.18, group);
      rounded(.07, .045, .13, paint, side * .46, .48, .25, group);
      box(.19, .055, .025, lamp, side * .25, .37, .88, group);
      box(.19, .05, .025, brake, side * .25, .36, -.88, group);
      box(.055, .04, .03, side > 0 ? indicator : indicatorOff, side * .36, .33, .88, group);
      box(.055, .04, .03, side > 0 ? indicator : indicatorOff, side * .36, .33, -.88, group);
      box(.06, .03, .026, reverseLamp, side * .13, .36, -.88, group);
    }
    box(.69, .07, .055, trim, 0, .23, .87, group);
    box(.69, .065, .055, trim, 0, .23, -.87, group);
    box(.3, .045, .015, silver, 0, .29, .91, group);
    box(.25, .055, .012, ivory, 0, .3, -.91, group);
    box(.58, .012, .015, trim, 0, .43, .58, group);
    const wheels = [];
    const steering = [];
    for (const side of [-1, 1]) {
      for (const end of [-.52, .52]) {
        const pivot = new THREE.Group();
        pivot.position.set(side * .42, .16, end);
        group.add(pivot);
        const axle = new THREE.Group();
        axle.rotation.z = Math.PI / 2;
        pivot.add(axle);
        const roller = new THREE.Group();
        axle.add(roller);
        mesh(new THREE.CylinderGeometry(.16, .16, .12, 16), trim, 0, 0, 0, roller);
        mesh(new THREE.CylinderGeometry(.1, .1, .124, 12), silver, 0, 0, 0, roller);
        for (let spoke = 0; spoke < 3; spoke += 1) {
          const bar = box(.025, .13, .18, dark, 0, 0, 0, roller);
          bar.rotation.y = spoke * Math.PI / 3;
        }
        wheels.push(roller);
        if (end > 0) steering.push(pivot);
      }
    }
    return { group, wheels, steering, brake, indicator, reverseLamp, travel: 0, previous: null };
  }
  const hero = makeCar(0xc7d7dd);
  const passing = makeCar(0xb97c56);
  const gate = new THREE.Group();
  gate.position.set(-4.9, .48, .75);
  lot.add(gate);
  box(.14, .9, .14, mint, -4.9, .43, .75);
  box(.08, .08, 1.45, ivory, 0, 0, -.7, gate);
  for (let z = -.25; z > -1.4; z -= .25) box(.085, .085, .12, material(0xbd7354), 0, 0, z, gate);
  for (const x of [-4.7, 4.7]) {
    for (const z of [-3.2, 3.2]) {
      rounded(.45, .16, .45, material(0x36564b), x, .05, z, lot);
      box(.065, .55, .065, material(0x82765a), x, .45, z);
      for (let crown = 0; crown < 3; crown += 1) {
        mesh(new THREE.IcosahedronGeometry(.32 - crown * .035, 2), material([0x50775b, 0x6e9670, 0x84a37a][crown]), x + (crown - 1) * .11, .84 + crown * .17, z);
      }
    }
  }
  const halo = mesh(new THREE.TorusGeometry(.33, .08, 10, 32), mint, 1.92, 1.9, -2.25);
  const pinTip = mesh(new THREE.ConeGeometry(.14, .35, 3), mint, 1.92, 1.48, -2.25);
  pinTip.rotation.z = Math.PI;
  function updateCar(car, pose, time) {
    car.group.position.set(pose.x, .015, pose.z);
    car.group.rotation.y = pose.yaw;
    car.group.visible = pose.visible;
    if (car.previous && Math.abs(car.previous.x - pose.x) < 1) {
      car.travel += Math.hypot(pose.x - car.previous.x, pose.z - car.previous.z) * (pose.reverse ? -1 : 1) * (time < car.previousTime ? -1 : 1);
    }
    car.wheels.forEach((wheel) => { wheel.rotation.y = car.travel / .16; });
    car.steering.forEach((pivot) => { pivot.rotation.y = pose.steer || 0; });
    car.brake.emissiveIntensity = pose.braking ? 1.4 : .25;
    car.reverseLamp.emissiveIntensity = pose.reverse ? 1.7 : .05;
    car.indicator.emissiveIntensity = pose.indicator && Math.sin(time * 8) > 0 ? 2 : .05;
    car.previous = pose;
    car.previousTime = time;
  }
  function update(time) {
    environment.visible = true;
    environment.scale.setScalar(1);
    showcaseShadow.visible = false;
    hero.group.scale.setScalar(1);
    const sequence = getParkingSequence(time);
    updateCar(hero, sequence.main, time);
    updateCar(passing, sequence.passing, time);
    const gateAngle = (sequence.time < 5 || (sequence.time > 15 && sequence.time < 21)) ? Math.PI / 2 : .02;
    gate.rotation.x += (gateAngle - gate.rotation.x) * .08;
    halo.position.y = 1.9 + Math.sin(time * 1.2) * .06;
    halo.rotation.y = Math.sin(time * .5) * .2;
    pinTip.position.y = halo.position.y - .42;
    bayIndicator.visible = sequence.stage !== "Parked";
    return sequence.stage;
  }
  // Static cars, bay lines and landscaping can share draw calls. Moving parts stay independent.
  for (const object of [hero.group, passing.group, gate, halo, pinTip, bayIndicator]) object.userData.motion = true;
  if (lot.updateMatrixWorld) {
    lot.updateMatrixWorld(true);
    const batches = new Map();
    lot.traverse((object) => {
      if (!object.isMesh || Array.isArray(object.material)) return;
      for (let ancestor = object; ancestor && ancestor !== lot; ancestor = ancestor.parent) {
        if (ancestor.userData.motion) return;
      }
      const key = object.material.uuid;
      if (!batches.has(key)) batches.set(key, { material: object.material, meshes: [] });
      batches.get(key).meshes.push(object);
    });
    for (const batch of batches.values()) {
      if (batch.meshes.length < 2) continue;
      const geometries = batch.meshes.map((object) => {
        const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
        geometry.applyMatrix4(object.matrixWorld);
        geometry.clearGroups();
        return geometry;
      });
      const combined = mergeGeometries(geometries, false);
      geometries.forEach((geometry) => geometry.dispose());
      if (!combined) continue;
      for (const object of batch.meshes) { object.parent.remove(object); object.geometry.dispose(); }
      mesh(combined, batch.material, 0, 0, 0);
    }
  }
  const environment = new THREE.Group();
  for (const child of [...lot.children]) {
    if (child === hero.group) continue;
    lot.remove(child);
    environment.add(child);
  }
  lot.add(environment);
  const showcaseShadow = mesh(new THREE.PlaneGeometry(18, 18), new THREE.ShadowMaterial({ opacity: .22 }), 0, -.012, 0);
  showcaseShadow.rotation.x = -Math.PI / 2;
  showcaseShadow.castShadow = false;
  showcaseShadow.visible = false;
  function updateShowcase(view) {
    update(view.sequenceTime);
    environment.visible = view.reveal > .005;
    environment.scale.setScalar(Math.max(.001, view.reveal));
    showcaseShadow.visible = view.reveal < .15;
    hero.group.visible = true;
    hero.group.position.set(1.92 * view.reveal, .015, -2.25 * view.reveal);
    hero.group.rotation.y = view.carYaw;
    hero.group.scale.setScalar(view.carScale);
    hero.wheels.forEach((wheel) => { wheel.rotation.y = view.reveal * Math.PI; });
    hero.steering.forEach((pivot) => { pivot.rotation.y = 0; });
    hero.brake.emissiveIntensity = .25;
    hero.indicator.emissiveIntensity = .05;
    hero.reverseLamp.emissiveIntensity = .05;
    return view.reveal > .98 ? "Parked" : view.reveal > .01 ? "Your parking space" : "Car preview";
  }
  update(3);
  function setDetailedCar(group) {
    hero.group.children.forEach((child) => { child.visible = false; });
    hero.group.add(group);
  }
  return { lot, update, updateShowcase, setDetailedCar, texture: asphaltTexture };
}

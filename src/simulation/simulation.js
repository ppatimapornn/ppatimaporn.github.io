// src/simulation/simulation.js
export function createSimulation(config) {
  const { THREE, scene, cars = [], trafficLights = [] } = config;

  let zones = [];

  // วงแหวนแสดงตัวอย่างขนาดพื้นที่ตามตำแหน่งเมาส์
  const previewGeo = new THREE.RingGeometry(0.92, 1, 64);
  const previewMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    depthTest: false
  });
  const previewRing = new THREE.Mesh(previewGeo, previewMat);
  previewRing.rotation.x = -Math.PI / 2;
  previewRing.position.y = 1.5;
  previewRing.visible = false;
  scene.add(previewRing);

  function updatePreview(position, radius, visible) {
    if (!visible || !position) {
      previewRing.visible = false;
      return;
    }
    previewRing.visible = true;
    previewRing.position.set(position.x, 1.5, position.z);
    previewRing.scale.set(radius, radius, 1);
  }

  // สร้างเหตุการณ์เฉพาะจุดตามรัศมี (radius) ที่เลือก
  function addZone(type, position, radius = 100) {
    const zone = {
      id: Date.now() + Math.random(),
      type: type,
      position: position.clone(),
      radius: radius,
      meshes: [],
      particles: null
    };

    // 1. น้ำท่วม
    if (type === 'flood') {
      const geo = new THREE.CylinderGeometry(radius, radius, 15, 48);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x3a7ca5, transparent: true, opacity: 0.6, depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      mesh.position.y = -10;
      scene.add(mesh);
      zone.meshes.push(mesh);
    } 
    // 2. อุบัติเหตุ (แสดงกรวยตรงกลาง + วงขอบเขตกั้นถนนตามขนาด)
    else if (type === 'accident') {
      const coneScale = Math.max(1, radius / 80);
      const geo = new THREE.ConeGeometry(4 * coneScale, 8 * coneScale, 16);
      const mat = new THREE.MeshStandardMaterial({ color: 0xff5500, emissive: 0xff2200 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      mesh.position.y = 4 * coneScale;
      scene.add(mesh);
      zone.meshes.push(mesh);

      const zoneRingGeo = new THREE.RingGeometry(radius * 0.94, radius, 48);
      const zoneRingMat = new THREE.MeshBasicMaterial({
        color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.7
      });
      const zoneRing = new THREE.Mesh(zoneRingGeo, zoneRingMat);
      zoneRing.rotation.x = -Math.PI / 2;
      zoneRing.position.set(position.x, 1.2, position.z);
      scene.add(zoneRing);
      zone.meshes.push(zoneRing);
    } 
    // 3. พายุฝนเฉพาะจุด (ปรับความหนาแน่นฝนตามพื้นที่)
    else if (type === 'weather') {
      const cloudGeo = new THREE.CylinderGeometry(radius, radius, 20, 48);
      const cloudMat = new THREE.MeshStandardMaterial({ color: 0x444455, transparent: true, opacity: 0.8 });
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      cloud.position.copy(position);
      cloud.position.y = 150;
      scene.add(cloud);
      zone.meshes.push(cloud);

      const rainGeo = new THREE.BufferGeometry();
      const rainCount = Math.floor(20 * radius); // ปรับจำนวนเม็ดฝนตามขนาดรัศมี
      const pos = new Float32Array(rainCount * 3);
      for (let i = 0; i < rainCount * 3; i += 3) {
        const r = radius * Math.sqrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        pos[i] = r * Math.cos(theta);
        pos[i + 1] = Math.random() * 150;
        pos[i + 2] = r * Math.sin(theta);
      }
      rainGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const rainMat = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 1.0, transparent: true, opacity: 0.6 });
      const rain = new THREE.Points(rainGeo, rainMat);
      rain.position.copy(position);
      rain.position.y = 0;
      scene.add(rain);
      zone.particles = rain;
      zone.meshes.push(rain);
    } 
    // 4. ไฟฟ้าขัดข้อง
    else if (type === 'power') {
      const geo = new THREE.CylinderGeometry(radius, radius, 100, 48);
      const mat = new THREE.MeshStandardMaterial({ color: 0x050510, transparent: true, opacity: 0.45, depthWrite: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      mesh.position.y = 50;
      scene.add(mesh);
      zone.meshes.push(mesh);
    }

    zones.push(zone);
  }

  function clearZones() {
    zones.forEach(zone => {
      zone.meshes.forEach(mesh => {
        scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
      });
    });
    zones = [];
    cars.forEach(car => car.userData.speed = 18);
  }

  function update(delta) {
    zones.forEach(zone => {
      if (zone.type === 'flood') {
        const mesh = zone.meshes[0];
        if (mesh.position.y < 3.5) mesh.position.y += delta * 5;
      } 
      else if (zone.type === 'accident') {
        const mesh = zone.meshes[0];
        mesh.rotation.y += delta * 5;
      } 
      else if (zone.type === 'weather' && zone.particles) {
        const positions = zone.particles.geometry.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] -= 150 * delta;
          if (positions[i] < 0) positions[i] = 150;
        }
        zone.particles.geometry.attributes.position.needsUpdate = true;
      } 
      else if (zone.type === 'power') {
        trafficLights.forEach(light => {
          if (light.group.position.distanceTo(zone.position) <= zone.radius) {
            light.lamps.forEach(lamp => lamp.material.emissiveIntensity = 0);
          }
        });
      }
    });

    cars.forEach(car => {
      let isInAccident = false;

      zones.forEach(zone => {
        const distance = car.position.distanceTo(zone.position);
        if (distance <= zone.radius) {
          if (zone.type === 'flood' && car.userData.speed > 4) {
            car.userData.speed -= delta * 15;
          } 
          else if (zone.type === 'weather' && car.userData.speed > 8) {
            car.userData.speed -= delta * 8;
          } 
          else if (zone.type === 'power' && car.userData.speed > 12) {
            car.userData.speed -= delta * 5;
          } 
          else if (zone.type === 'accident') {
            isInAccident = true;
            car.userData.state = 'stopping';
            car.userData.speed = Math.max(0, car.userData.speed - (delta * 25));
          }
        }
      });

      if (!isInAccident && car.userData.state === 'stopping' && car.userData.speed === 0) {
        car.userData.state = 'driving';
      }
    });
  }

  return { addZone, clearZones, updatePreview, update };
}

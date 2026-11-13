import * as THREE from 'three';

/**
 * ระบบจำลองสถานการณ์เบื้องต้นสำหรับ Chatuchak 3D City
 * เป็นการแสดงผลเชิงสาธิต ไม่ใช่แบบจำลองพยากรณ์ภัยพิบัติจริง
 */
export function createSimulation({ scene, buildings = [], roads = [] }) {
  const state = {
    active: null,
    objects: [],
    rain: null,
    rainVelocity: [],
    originalBackground: scene.background?.clone?.() ?? new THREE.Color(0xb8d9ed),
    affectedBuildings: [],
    affectedRoads: [],
    floodRadius: 0,
    elapsed: 0
  };

  const resultText = document.getElementById('resultText');
  const resultStats = document.getElementById('resultStats');
  const severity = document.getElementById('simulationSeverity');
  const severityValue = document.getElementById('severityValue');

  function report(title, lines = []) {
    if (resultText) resultText.textContent = title;
    if (resultStats) {
      resultStats.replaceChildren();
      lines.forEach(line => {
        const li = document.createElement('li');
        li.textContent = line;
        resultStats.appendChild(li);
      });
    }
  }

  function addObject(object) {
    scene.add(object);
    state.objects.push(object);
    return object;
  }

  function clearObjects() {
    state.objects.forEach(object => {
      scene.remove(object);
      object.traverse?.(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          const materials = Array.isArray(child.material)
            ? child.material : [child.material];
          materials.forEach(material => {
            if (material !== child.userData?.sharedMaterial) material.dispose?.();
          });
        }
      });
    });
    state.objects = [];
    state.rain = null;
  }

  function restoreMaterials() {
    state.affectedBuildings.forEach(mesh => {
      if (mesh.userData.simOriginalColor !== undefined) {
        mesh.material.color.setHex(mesh.userData.simOriginalColor);
        mesh.material.emissive?.setHex(0x000000);
        mesh.material.emissiveIntensity = 0;
      }
    });
    state.affectedRoads.forEach(mesh => {
      if (mesh.userData.simOriginalColor !== undefined) {
        mesh.material.color.setHex(mesh.userData.simOriginalColor);
        mesh.material.emissive?.setHex(0x000000);
      }
    });
    state.affectedBuildings = [];
    state.affectedRoads = [];
  }

  function reset() {
    clearObjects();
    restoreMaterials();
    scene.background = state.originalBackground.clone();
    state.active = null;
    state.elapsed = 0;
    report('เมืองกลับสู่สภาวะปกติ', [
      `อาคารในโมเดล ${buildings.length.toLocaleString('th-TH')} หลัง`,
      `ถนน/แนวถนนในโมเดล ${roads.length.toLocaleString('th-TH')} เส้น`
    ]);
    document.querySelectorAll('[data-scenario]').forEach(button => {
      button.classList.remove('active');
    });
  }

  function markRoad(mesh, color = 0xff3030) {
    if (!mesh?.material?.color) return;
    if (mesh.userData.simOriginalColor === undefined) {
      mesh.userData.simOriginalColor = mesh.material.color.getHex();
    }
    mesh.material.color.setHex(color);
    mesh.material.emissive?.setHex(color);
    mesh.material.emissiveIntensity = 0.18;
    state.affectedRoads.push(mesh);
  }

  function simulateFlood() {
    reset();
    state.active = 'flood';
    const level = Number(severity?.value ?? 2);
    const radius = [55, 95, 140][level - 1] ?? 95;
    state.floodRadius = radius;

    const water = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 64),
      new THREE.MeshStandardMaterial({
        color: 0x168cff,
        transparent: true,
        opacity: 0.58,
        roughness: 0.25,
        metalness: 0.05,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 1.15, 0);
    addObject(water);

    // ไฮไลต์ถนนบางส่วนเป็นตัวอย่างของถนนที่ได้รับผลกระทบ
    roads.slice(0, Math.max(1, Math.ceil(roads.length * (0.08 + level * 0.04))))
      .forEach(mesh => markRoad(mesh, 0x168cff));

    report('กำลังจำลองสถานการณ์น้ำท่วม', [
      `ระดับความรุนแรง: ${['น้อย', 'ปานกลาง', 'รุนแรง'][level - 1]}`,
      `รัศมีพื้นที่แสดงผลจำลอง: ${radius} หน่วยของโมเดล`,
      `ถนนที่ไฮไลต์: ${state.affectedRoads.length} เส้น`,
      'พื้นที่น้ำเป็นภาพจำลอง ไม่ใช่ระดับน้ำจากข้อมูลภูมิประเทศจริง'
    ]);
  }

  function simulateAccident() {
    reset();
    state.active = 'accident';
    const road = roads[Math.floor(roads.length / 2)] || roads[0];

    if (road) {
      markRoad(road, 0xff2525);
      const box = new THREE.Box3().setFromObject(road);
      const center = box.getCenter(new THREE.Vector3());
      const marker = new THREE.Group();

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(2.8, 2.8, 0.8, 20),
        new THREE.MeshStandardMaterial({ color: 0xff2525 })
      );
      base.position.y = 1.4;
      marker.add(base);

      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(2.2, 20, 20),
        new THREE.MeshBasicMaterial({ color: 0xffd400 })
      );
      beacon.position.y = 4;
      marker.add(beacon);
      marker.position.set(center.x, 0, center.z);
      addObject(marker);
    }

    report('จำลองอุบัติเหตุและการปิดถนน', [
      road ? 'แสดงจุดเหตุการณ์บนแนวถนนตัวอย่าง 1 จุด' : 'ยังไม่มีข้อมูลถนนสำหรับแสดงเหตุการณ์',
      road ? 'ไฮไลต์ถนนที่ได้รับผลกระทบ 1 เส้น' : 'กรุณาตรวจสอบข้อมูล roads.geojson',
      'ยังไม่ได้คำนวณเส้นทางอ้อมหรือการจราจรแบบเรียลไทม์'
    ]);
  }

  function makeRain() {
    const count = 900;
    const positions = new Float32Array(count * 3);
    state.rainVelocity = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 650;
      positions[i * 3 + 1] = 30 + Math.random() * 180;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 650;
      state.rainVelocity.push(45 + Math.random() * 65);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const rain = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0xd9efff,
        size: 1.8,
        transparent: true,
        opacity: 0.8
      })
    );
    addObject(rain);
    state.rain = rain;
  }

  function simulateWeather() {
    reset();
    state.active = 'weather';
    scene.background = new THREE.Color(0x52677c);
    makeRain();

    report('กำลังจำลองสภาพอากาศรุนแรง', [
      'แสดงฝนตกบนพื้นที่โมเดล',
      'เปลี่ยนบรรยากาศท้องฟ้าให้มืดลง',
      'เอฟเฟกต์นี้เป็นภาพประกอบ ไม่ใช่การพยากรณ์อากาศ'
    ]);
  }

  function simulatePowerOutage() {
    reset();
    state.active = 'power';
    const ratio = [0.15, 0.3, 0.5][Number(severity?.value ?? 2) - 1] ?? 0.3;
    const count = Math.max(1, Math.floor(buildings.length * ratio));

    // เลือกอาคารเป็นกลุ่มตัวอย่างแบบกระจาย ไม่ได้อ้างอิงโครงข่ายไฟฟ้าจริง
    buildings.forEach((mesh, index) => {
      if (index % Math.max(1, Math.floor(1 / ratio)) !== 0) return;
      if (!mesh.material?.color) return;

      if (mesh.userData.simOriginalColor === undefined) {
        mesh.userData.simOriginalColor = mesh.material.color.getHex();
      }
      mesh.material.color.setHex(0x30343b);
      if (mesh.material.emissive) {
        mesh.material.emissive.setHex(0x080808);
        mesh.material.emissiveIntensity = 0.15;
      }
      state.affectedBuildings.push(mesh);
    });

    report('จำลองสถานการณ์ไฟฟ้าขัดข้อง', [
      `สัดส่วนอาคารเป้าหมายโดยประมาณ: ${Math.round(ratio * 100)}%`,
      `อาคารที่เปลี่ยนการแสดงผล: ${state.affectedBuildings.length} หลัง`,
      'เป็นการสุ่มกลุ่มอาคารเพื่อสาธิต ยังไม่ได้เชื่อมข้อมูลสายส่งไฟฟ้าจริง'
    ]);
  }

  const actions = {
    flood: simulateFlood,
    accident: simulateAccident,
    weather: simulateWeather,
    power: simulatePowerOutage
  };

  document.querySelectorAll('[data-scenario]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-scenario]').forEach(item => {
        item.classList.toggle('active', item === button);
      });
      actions[button.dataset.scenario]?.();
    });
  });

  document.getElementById('resetSimulation')?.addEventListener('click', reset);

  if (severity && severityValue) {
    const labels = ['น้อย', 'ปานกลาง', 'รุนแรง'];
    const updateLabel = () => {
      severityValue.textContent = labels[Number(severity.value) - 1] || 'ปานกลาง';
    };
    severity.addEventListener('input', updateLabel);
    updateLabel();
  }

  function update(delta) {
    if (!state.rain) return;
    state.elapsed += delta;
    const positions = state.rain.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      let y = positions.getY(i) - state.rainVelocity[i] * delta;
      if (y < 0) {
        y = 100 + Math.random() * 100;
        positions.setX(i, (Math.random() - 0.5) * 650);
        positions.setZ(i, (Math.random() - 0.5) * 650);
      }
      positions.setY(i, y);
    }
    positions.needsUpdate = true;
  }

  report('พร้อมจำลองสถานการณ์', [
    `อาคาร ${buildings.length.toLocaleString('th-TH')} หลัง`,
    `แนวถนน ${roads.length.toLocaleString('th-TH')} เส้น`,
    'เลือกสถานการณ์จากเมนูเพื่อเริ่มต้น'
  ]);

  return { reset, update };
}

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createSimulation } from './src/simulation/simulation.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb8d9ed);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 650, 850);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 1.5));
const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(300, 600, 300);
scene.add(light);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const planeZero = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let activeTool = null;
let selectedRadius = 100;
let lastMousePos = null;

const radiusSlider = document.getElementById('zoneRadiusSlider');
const radiusValueText = document.getElementById('radiusValueText');

// อัปเดตขนาดเมื่อเลื่อนแถบ Slider
radiusSlider.addEventListener('input', (e) => {
  selectedRadius = Number(e.target.value);
  radiusValueText.textContent = `${selectedRadius} ม.`;
  if (activeTool && lastMousePos && simulationController) {
    simulationController.updatePreview(lastMousePos, selectedRadius, true);
  }
});

// ผูกปุ่ม UI เครื่องมือ
document.querySelectorAll('.sim-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const tool = e.target.getAttribute('data-tool');
    document.querySelectorAll('.sim-btn').forEach(b => b.classList.remove('active'));
    
    if (tool) {
      if (activeTool === tool) {
        activeTool = null;
        document.body.classList.remove('placing-mode');
        document.getElementById('activeToolText').textContent = 'เลือกปุ่มแล้วคลิกบนแผนที่';
        simulationController?.updatePreview(null, 0, false);
      } else {
        activeTool = tool;
        e.target.classList.add('active');
        document.body.classList.add('placing-mode');
        document.getElementById('activeToolText').textContent = 'คลิกพื้นที่บนเมืองเพื่อวางเหตุการณ์';
        if (lastMousePos) {
          simulationController?.updatePreview(lastMousePos, selectedRadius, true);
        }
      }
    } else if (e.target.id === 'btn-reset') {
      simulationController?.clearZones();
      simulationController?.updatePreview(null, 0, false);
      activeTool = null;
      document.body.classList.remove('placing-mode');
      document.getElementById('activeToolText').textContent = 'ล้างเหตุการณ์เรียบร้อยแล้ว';
    }
  });
});

// แสดงวงแหวนขนาดเหตุการณ์ตามเมาส์เมื่อเลือกเครื่องมืออยู่
renderer.domElement.addEventListener('pointermove', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const target = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(planeZero, target)) {
    lastMousePos = target.clone();
    if (activeTool && simulationController) {
      simulationController.updatePreview(lastMousePos, selectedRadius, true);
    }
  }
});

// คลิกเพื่อวางโซนตามขนาดที่เลือก หรือดูข้อมูลอาคาร
renderer.domElement.addEventListener('click', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  if (activeTool && simulationController) {
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(planeZero, target);
    if (target) {
      simulationController.addZone(activeTool, target, selectedRadius);
    }
    return;
  }

  const hits = raycaster.intersectObjects(clickableBuildings, false);
  const panel = document.getElementById('buildingInfo');

  if (hits.length > 0) {
    const info = hits[0].object.userData.buildingInfo;
    document.getElementById('buildingName').textContent = 'ชื่อ: ' + info.name;
    document.getElementById('buildingType').textContent = 'ประเภท: ' + info.type;
    document.getElementById('buildingLevels').textContent = 'จำนวนชั้น: ' + info.levels;
    document.getElementById('buildingHeight').textContent = 'ความสูง: ' + info.height + ' เมตร (โดยประมาณ)';
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
});



const clickableBuildings = [];
const clickablePlaces = [];
const simulationBuildings = [];
const simulationRoads = [];
let simulationController = null;

// UI Interactions
renderer.domElement.addEventListener('click', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const hits = raycaster.intersectObjects(clickableBuildings, false);
  const panel = document.getElementById('buildingInfo');

  if (hits.length > 0) {
    const info = hits[0].object.userData.buildingInfo;
    document.getElementById('buildingName').textContent = 'ชื่อ: ' + info.name;
    document.getElementById('buildingType').textContent = 'ประเภท: ' + info.type;
    document.getElementById('buildingLevels').textContent = 'จำนวนชั้น: ' + info.levels;
    document.getElementById('buildingHeight').textContent = 'ความสูง: ' + info.height + ' เมตร (โดยประมาณ)';
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
});

document.getElementById('closeBuildingInfo').addEventListener('click', () => {
  document.getElementById('buildingInfo').style.display = 'none';
});

renderer.domElement.addEventListener('dblclick', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const hits = raycaster.intersectObjects(clickablePlaces, false);
  if (hits.length > 0) {
    const info = hits[0].object.userData.placeInfo;
    alert(`สถานที่: ${info.name}\nละติจูด: ${info.latitude}\nลองจิจูด: ${info.longitude}`);
  }
});

// Materials
const materials = {
  ground: new THREE.MeshStandardMaterial({ color: 0x91c98b, side: THREE.DoubleSide }),
  road: new THREE.MeshStandardMaterial({ color: 0x45494e, side: THREE.DoubleSide }),
  park: new THREE.MeshStandardMaterial({ color: 0x4eaa65, side: THREE.DoubleSide }),
  water: new THREE.MeshStandardMaterial({ color: 0x39a9df, side: THREE.DoubleSide, roughness: 0.35 }),
  mrt: new THREE.MeshStandardMaterial({ color: 0x1769aa, side: THREE.DoubleSide }),
  bts: new THREE.MeshStandardMaterial({ color: 0x00a651, side: THREE.DoubleSide }),
  srt: new THREE.MeshStandardMaterial({ color: 0xd62828, side: THREE.DoubleSide }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xf5d000, side: THREE.DoubleSide }),
  rail: new THREE.MeshStandardMaterial({ color: 0x777777, side: THREE.DoubleSide }),
  building: new THREE.MeshStandardMaterial({ color: 0xc9c5b9 }),
  buildingResidential: new THREE.MeshStandardMaterial({ color: 0xe8d5b5 }),
  buildingCommercial: new THREE.MeshStandardMaterial({ color: 0x80b1c8 }),
  buildingPublic: new THREE.MeshStandardMaterial({ color: 0xd6a6c8 }),
  buildingIndustrial: new THREE.MeshStandardMaterial({ color: 0x999999 })
};

let centerLon = 100.56, centerLat = 13.82, scale = 1;

function project(coord) {
  const x = (coord[0] - centerLon) * 111320 * Math.cos(centerLat * Math.PI / 180) * scale;
  const z = -(coord[1] - centerLat) * 111320 * scale;
  return [x, z];
}

function getPoints(obj, result = []) {
  if (Array.isArray(obj) && typeof obj[0] === 'number' && typeof obj[1] === 'number') {
    if (Number.isFinite(obj[0]) && Number.isFinite(obj[1])) result.push(obj);
  } else if (Array.isArray(obj)) {
    obj.forEach(item => getPoints(item, result));
  } else if (obj && typeof obj === 'object') {
    Object.values(obj).forEach(value => getPoints(value, result));
  }
  return result;
}

function makeShape(rings) {
  if (!rings?.length || !rings[0]?.length) return null;
  const shape = new THREE.Shape();
  rings[0].forEach((coord, i) => {
    const [x, z] = project(coord);
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  for (let r = 1; r < rings.length; r++) {
    const hole = new THREE.Path();
    rings[r].forEach((coord, i) => {
      const [x, z] = project(coord);
      if (i === 0) hole.moveTo(x, -z);
      else hole.lineTo(x, -z);
    });
    shape.holes.push(hole);
  }
  return shape;
}

function addPolygon(rings, material, height = 0, y = 0.1, buildingInfo = null) {
  const shape = makeShape(rings);
  if (!shape) return;

  const extrudeSettings = { depth: height, bevelEnabled: false };
  const geometry = height > 0 
    ? new THREE.ExtrudeGeometry(shape, extrudeSettings)
    : new THREE.ShapeGeometry(shape);

  const mesh = new THREE.Mesh(geometry, buildingInfo ? material.clone() : material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;

  if (buildingInfo) {
    mesh.userData.buildingInfo = buildingInfo;
    clickableBuildings.push(mesh);
    simulationBuildings.push(mesh);
  }

  scene.add(mesh);
}

function addGeometry(geometry, material, height = 0, y = 0.1, buildingInfo = null) {
  if (!geometry) return;
  if (geometry.type === 'Polygon') {
    addPolygon(geometry.coordinates, material, height, y, buildingInfo);
  }
  if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(polygon => addPolygon(polygon, material, height, y, buildingInfo));
  }
}

function addRibbon(coords, width, material, y = 0.5) {
  const points = coords
    .filter(c => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]))
    .map(c => {
      const [x, z] = project(c);
      return new THREE.Vector3(x, y, z);
    });

  if (points.length < 2) return null;
  const positions = [], indices = [];

  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dz = next.z - prev.z;
    const length = Math.hypot(dx, dz);
    if (length === 0) continue;

    const offsetX = (-dz / length) * width / 2;
    const offsetZ = (dx / length) * width / 2;

    positions.push(
      points[i].x + offsetX, y, points[i].z + offsetZ,
      points[i].x - offsetX, y, points[i].z - offsetZ
    );
  }

  const count = positions.length / 6;
  for (let i = 0; i < count - 1; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    indices.push(a, b, c, b, d, c);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.material.side = THREE.DoubleSide;
  scene.add(mesh);
  return mesh;
}

function addPlaceLabel(name, lon, lat, color = '#263238', y = 8) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 108, 20);
  ctx.fill();

  ctx.font = 'bold 42px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const label = new THREE.Sprite(material);

  const [x, z] = project([lon, lat]);
  label.position.set(x, y, z);
  label.scale.set(22, 5.5, 1);
  label.userData.placeInfo = { name, longitude: lon, latitude: lat };
  clickablePlaces.push(label);
  scene.add(label);
}

function getRoadWidth(type) {
  const widths = { motorway: 14, trunk: 12, primary: 10, secondary: 8, tertiary: 6, residential: 4.5, service: 3, footway: 1.5, path: 1.5 };
  return widths[type] || 3;
}

async function loadGeoJSON(file) {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${file}`);
  if (!response.ok) throw new Error(`ไม่พบไฟล์ ${file}`);
  return await response.json();
}

function getBuildingMaterial(props) {
  const type = props.building;
  if (['residential', 'apartments', 'house', 'detached'].includes(type)) return materials.buildingResidential;
  if (['commercial', 'retail', 'office'].includes(type)) return materials.buildingCommercial;
  if (['public', 'school', 'hospital', 'university'].includes(type)) return materials.buildingPublic;
  if (['industrial', 'warehouse', 'factory'].includes(type)) return materials.buildingIndustrial;
  return materials.building;
}

async function loadCity() {
  try {
    const [boundary, roads, buildings, water, parks, stations, railways] = await Promise.all([
      loadGeoJSON('boundary.geojson'),
      loadGeoJSON('roads.geojson'),
      loadGeoJSON('buildings.geojson'),
      loadGeoJSON('water.geojson'),
      loadGeoJSON('parks.geojson'),
      loadGeoJSON('stations.geojson'),
      loadGeoJSON('railways.geojson')
    ]);

    const boundaryPoints = getPoints(boundary);
    if (!boundaryPoints.length) throw new Error('ไม่พบพิกัดขอบเขตเมือง');

    const lons = boundaryPoints.map(p => p[0]), lats = boundaryPoints.map(p => p[1]);
    centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
    centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const width = (Math.max(...lons) - Math.min(...lons)) * 111320 * Math.cos(centerLat * Math.PI / 180);
    scale = 700 / width;

    boundary.features.forEach(f => addGeometry(f.geometry, materials.ground, 0, 0));
    parks.features.forEach(f => addGeometry(f.geometry, materials.park, 0, 0.3));

    water.features.forEach(feature => {
      const g = feature.geometry;
      if (g.type === 'Polygon' || g.type === 'MultiPolygon') addGeometry(g, materials.water, 0, 0.45);
      if (g.type === 'LineString') addRibbon(g.coordinates, 7 * scale, materials.water, 0.5);
      if (g.type === 'MultiLineString') g.coordinates.forEach(line => addRibbon(line, 7 * scale, materials.water, 0.5));
    });

    const roadJunctions = new Map();
    roads.features.forEach((feature, featureIndex) => {
      const g = feature.geometry, props = feature.properties || {};
      if (!g) return;

      const roadType = Array.isArray(props.highway) ? props.highway[0] : props.highway;
      if (['primary', 'secondary', 'tertiary', 'residential'].includes(roadType)) {
        let lines = g.type === 'LineString' ? [g.coordinates] : (g.type === 'MultiLineString' ? g.coordinates : []);
        lines.forEach(line => {
          line.forEach(coord => {
            if (!Array.isArray(coord)) return;
            const key = `${coord[0].toFixed(5)},${coord[1].toFixed(5)}`;
            if (!roadJunctions.has(key)) roadJunctions.set(key, { coord, features: new Set() });
            roadJunctions.get(key).features.add(featureIndex);
          });
          carRoutes.push(line);
        });
      }

      const roadWidth = getRoadWidth(roadType) * scale;
      if (g.type === 'LineString') {
        const roadMesh = addRibbon(g.coordinates, roadWidth, materials.road.clone(), 0.65);
        if (roadMesh) simulationRoads.push(roadMesh);
      }
      if (g.type === 'MultiLineString') {
        g.coordinates.forEach(line => {
          const roadMesh = addRibbon(line, roadWidth, materials.road.clone(), 0.65);
          if (roadMesh) simulationRoads.push(roadMesh);
        });
      }
      if (g.type === 'Polygon' || g.type === 'MultiPolygon') addGeometry(g, materials.road, 0, 0.65);
    });

    let trafficLightCount = 0;
    const placedLights = [], minLightDistance = 120;
    roadJunctions.forEach(junction => {
      if (junction.features.size < 2) return;
      const [x, z] = project(junction.coord);
      const tooClose = placedLights.some(pos => Math.hypot(pos.x - x, pos.z - z) < minLightDistance);
      if (tooClose) return;
      createTrafficLight(x, z);
      placedLights.push({ x, z });
      trafficLightCount++;
    });

    prepareCarRoutes();

    addPlaceLabel('สวนจตุจักร', 100.5500, 13.8020, '#238443');
    addPlaceLabel('สวนรถไฟ', 100.5580, 13.8100, '#238443');
    addPlaceLabel('เซ็นทรัล ลาดพร้าว', 100.5610, 13.8160, '#884ea0');

    buildings.features.forEach((feature, i) => {
      const props = feature.properties || {}, g = feature.geometry;
      const heightMeters = Number(props.height) || (Number(props['building:levels']) * 3) || (8 + (i % 5) * 3);
      const height = heightMeters * scale * 4;
      addGeometry(g, getBuildingMaterial(props), height, 0.7, {
        name: props.name || 'ไม่ทราบชื่ออาคาร',
        type: props.building || 'ไม่ระบุประเภท',
        levels: props['building:levels'] || 'ไม่ระบุ',
        height: heightMeters
      });
    });

    // เริ่มต้นและเชื่อมต่อ Controller (รวม UI Button Binding)[span_3](start_span)[span_3](end_span)
    simulationController = createSimulation({
      THREE, scene, buildings: simulationBuildings, roads: simulationRoads, cars, trafficLights
    });

    document.getElementById('btn-flood').addEventListener('click', () => simulationController.setScenario('flood'));
    document.getElementById('btn-accident').addEventListener('click', () => simulationController.setScenario('accident'));
    document.getElementById('btn-weather').addEventListener('click', () => simulationController.setScenario('weather'));
    document.getElementById('btn-power').addEventListener('click', () => simulationController.setScenario('power'));
    document.getElementById('btn-reset').addEventListener('click', () => simulationController.setScenario('reset'));

    camera.position.set(0, 650, 850);
    controls.target.set(0, 0, 0);
    controls.update();

  } catch (error) {
    console.error('City loading error:', error);
    alert('โหลดข้อมูลเมืองไม่สำเร็จ: ' + error.message);
  }
}

const cars = [], carRoutes = [], trafficLights = [];
let activeCarRoutes = [];
const carClock = new THREE.Clock();

function createCar(color = 0xff3333) {
  const car = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 7), new THREE.MeshStandardMaterial({ color }));
  body.position.y = 1.2; car.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 3.5), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
  roof.position.set(0, 2.3, -0.3); car.add(roof);

  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
  for (const x of [-2.1, 2.1]) {
    for (const z of [-2.2, 2.2]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.35, 16), wheelMaterial);
      wheel.rotation.z = Math.PI / 2; wheel.position.set(x, 0.65, z); car.add(wheel);
    }
  }
  scene.add(car); cars.push(car);
  return car;
}

function createTrafficLight(x, z) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 12), new THREE.MeshStandardMaterial({ color: 0x555555 }));
  pole.position.y = 3; group.add(pole);
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.7, 0.7), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  housing.position.set(0, 5.5, 0); group.add(housing);

  const colors = [0xff2222, 0xffcc00, 0x00dd44], lamps = [];
  colors.forEach((color, i) => {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.05 }));
    lamp.position.set(0, 6.3 - i * 0.8, 0.4); group.add(lamp); lamps.push(lamp);
  });

  group.position.set(x, 0, z); scene.add(group);
  const lightData = { group, lamps, phase: 'green', timer: 0 };
  trafficLights.push(lightData);
  return lightData;
}

function updateTrafficLights(delta) {
  if (simulationController && simulationController.currentScenario === 'power') return; // ไฟดับจะไม่ควบคุมเฟสใหม่
  trafficLights.forEach(light => {
    light.timer += delta;
    if (light.phase === 'green' && light.timer >= 10) { light.phase = 'yellow'; light.timer = 0; }
    else if (light.phase === 'yellow' && light.timer >= 3) { light.phase = 'red'; light.timer = 0; }
    else if (light.phase === 'red' && light.timer >= 10) { light.phase = 'green'; light.timer = 0; }

    const activeIndex = { red: 0, yellow: 1, green: 2 }[light.phase];
    light.lamps.forEach((lamp, index) => lamp.material.emissiveIntensity = index === activeIndex ? 1.5 : 0.05);
  });
}

function prepareCarRoutes() {
  const routes = carRoutes
    .map(coords => coords.filter(c => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1])).map(c => {
      const [x, z] = project(c); return new THREE.Vector3(x, 0.65, z);
    }))
    .filter(points => points.length >= 2);

  if (routes.length === 0) return;
  activeCarRoutes = [];

  for (let i = 0; i < cars.length; i++) {
    const route = routes[i % routes.length], points = route.map(p => p.clone()), cumulative = [];
    let length = 0;
    for (let j = 1; j < points.length; j++) {
      length += points[j].distanceTo(points[j - 1]);
      cumulative.push(length);
    }
    activeCarRoutes.push({ points, cumulative, length });
  }

  cars.forEach((car, index) => {
    const route = activeCarRoutes[index];
    car.userData = {
      distance: route.length * 0.15, routeIndex: index, direction: 1, speed: 18, state: 'driving', waitTimer: 0, traveledSinceStop: 0, stopAfter: 35 + Math.random() * 100
    };
  });
}

function updateCars(delta) {
  if (activeCarRoutes.length === 0) return;

  cars.forEach(car => {
    const route = activeCarRoutes[car.userData.routeIndex], data = car.userData;
    if (data.state === 'parked') {
      data.waitTimer -= delta; data.speed = 0;
      if (data.waitTimer <= 0) { data.state = 'driving'; data.traveledSinceStop = 0; data.stopAfter = 35 + Math.random() * 100; }
    } else {
      const remaining = data.stopAfter - data.traveledSinceStop;
      if (remaining <= 5) data.state = 'stopping'; else data.state = 'driving';

      const redLight = isRedLightAhead(car, route, data);
      const targetSpeed = redLight ? 0 : data.state === 'stopping' ? Math.max(0, 18 * remaining / 5) : 18;
      
      // ป้องกันการเร่งความเร็วหาก Simulation กำลังลดความเร็วอยู่
      if (targetSpeed > data.speed && simulationController) {
          // ปล่อยให้ค่อยๆ เพิ่ม
      }
      
      data.speed += (targetSpeed - data.speed) * Math.min(1, delta * 3);
      const movement = redLight ? 0 : Math.min(data.speed * delta, Math.max(0, remaining));
      
      data.distance += data.direction * movement;
      data.traveledSinceStop += movement;

      if (remaining <= 0.05) { data.state = 'parked'; data.speed = 0; data.waitTimer = 1 + Math.random() * 10; }
      if (data.distance >= route.length) { data.distance = route.length; data.direction = -1; }
      if (data.distance <= 0) { data.distance = 0; data.direction = 1; }
    }

    function isRedLightAhead(car, route, data) {
      if(simulationController && simulationController.currentScenario === 'power') return false; // ไฟดับถือว่าไม่มีไฟแดงกั้น
      const lookAhead = 12, nextDistance = data.distance + data.direction * lookAhead;
      const checkDistance = Math.max(0, Math.min(route.length, nextDistance));
      const segment = route.cumulative.findIndex(length => length >= checkDistance);
      if (segment < 0) return false;
      const startDistance = segment === 0 ? 0 : route.cumulative[segment - 1];
      const t = (route.cumulative[segment] - startDistance) > 0 ? (checkDistance - startDistance) / (route.cumulative[segment] - startDistance) : 0;
      const point = new THREE.Vector3().lerpVectors(route.points[segment], route.points[segment + 1], t);
      return trafficLights.some(light => light.phase === 'red' && point.distanceTo(light.group.position) < 8);
    }

    const distance = data.distance;
    let segment = route.cumulative.findIndex(length => length >= distance);
    if (segment === -1) segment = route.points.length - 2;
    const startDistance = segment === 0 ? 0 : route.cumulative[segment - 1];
    const segmentLength = route.cumulative[segment] - startDistance;
    const t = segmentLength > 0 ? (distance - startDistance) / segmentLength : 0;
    const start = route.points[segment], end = route.points[segment + 1];

    car.position.lerpVectors(start, end, t);
    car.rotation.y = Math.atan2((end.x - start.x) * data.direction, (end.z - start.z) * data.direction);
  });
}

createCar(0xff3333); createCar(0x3366ff); createCar(0xffcc00); createCar(0x22aa22);

loadCity();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(carClock.getDelta(), 0.05);

  controls.update();
  
  // อัปเดตรถ ไฟจราจร และระบบจำลองสถานการณ์
  updateCars(delta);
  updateTrafficLights(delta);
  simulationController?.update(delta); // สั่งลดความเร็วหรือเพิ่มน้ำท่วม

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
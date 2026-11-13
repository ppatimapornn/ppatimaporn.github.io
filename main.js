
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb8d9ed);

const camera = new THREE.PerspectiveCamera(
  50, window.innerWidth / window.innerHeight, 0.1, 10000
);
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
// ระบบตรวจจับการคลิกวัตถุ 3 มิติ
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// เก็บรายการอาคารที่สามารถคลิกได้
const clickableBuildings = [];
const clickablePlaces = [];
// ตรวจจับการคลิกอาคาร
renderer.domElement.addEventListener('click', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();

  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const hits = raycaster.intersectObjects(
    clickableBuildings,
    false
  );

  const panel = document.getElementById('buildingInfo');

  if (hits.length > 0) {
    const info = hits[0].object.userData.buildingInfo;

    document.getElementById('buildingName').textContent =
      'ชื่อ: ' + info.name;

    document.getElementById('buildingType').textContent =
      'ประเภท: ' + info.type;

    document.getElementById('buildingLevels').textContent =
      'จำนวนชั้น: ' + info.levels;

    document.getElementById('buildingHeight').textContent =
      'ความสูง: ' + info.height + ' เมตร (โดยประมาณ)';

    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
});

// ปุ่มปิดข้อมูล
document.getElementById('closeBuildingInfo')
  .addEventListener('click', () => {
    document.getElementById('buildingInfo').style.display = 'none';
  });
// ตรวจจับการคลิกป้ายสถานที่
renderer.domElement.addEventListener('dblclick', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();

  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const hits = raycaster.intersectObjects(
    clickablePlaces,
    false
  );

  if (hits.length > 0) {
    const info = hits[0].object.userData.placeInfo;

    alert(
      'สถานที่: ' + info.name +
      '\nละติจูด: ' + info.latitude +
      '\nลองจิจูด: ' + info.longitude
    );
  }
});

// วัสดุของเมือง
const materials = {
    
  ground: new THREE.MeshStandardMaterial({
    color: 0x91c98b,
    side: THREE.DoubleSide
  }),
  road: new THREE.MeshStandardMaterial({
    color: 0x45494e,
    side: THREE.DoubleSide
  }),
  park: new THREE.MeshStandardMaterial({
    color: 0x4eaa65,
    side: THREE.DoubleSide
  }),
  water: new THREE.MeshStandardMaterial({
    color: 0x39a9df,
    side: THREE.DoubleSide,
    roughness: 0.35
  }),
    mrt: new THREE.MeshStandardMaterial({
    color: 0x1769aa,
    side: THREE.DoubleSide
  }),
  bts: new THREE.MeshStandardMaterial({
    color: 0x00a651,
    side: THREE.DoubleSide
  }),
    srt: new THREE.MeshStandardMaterial({
    color: 0xd62828,
    side: THREE.DoubleSide
  }),

  // สายสีแดงอ่อน
  srtLight: new THREE.MeshStandardMaterial({
    color: 0xff8c42,
    side: THREE.DoubleSide
  }),

  // สายสีเหลือง
  yellow: new THREE.MeshStandardMaterial({
    color: 0xf5d000,
    side: THREE.DoubleSide
  }),

  // รางรถไฟทั่วไป
  rail: new THREE.MeshStandardMaterial({
    color: 0x777777,
    side: THREE.DoubleSide
  }),

    building: new THREE.MeshStandardMaterial({
    color: 0xc9c5b9
  }),

  buildingResidential: new THREE.MeshStandardMaterial({
    color: 0xe8d5b5
  }),

  buildingCommercial: new THREE.MeshStandardMaterial({
    color: 0x80b1c8
  }),

  buildingPublic: new THREE.MeshStandardMaterial({
    color: 0xd6a6c8
  }),

  buildingIndustrial: new THREE.MeshStandardMaterial({
    color: 0x999999
  })
};


let centerLon = 100.56;
let centerLat = 13.82;
let scale = 1;

function project(coord) {
  const x = (coord[0] - centerLon) * 111320 *
    Math.cos(centerLat * Math.PI / 180) * scale;

  const z = -(coord[1] - centerLat) * 111320 * scale;

  return [x, z];
}

// อ่านพิกัด GeoJSON อย่างปลอดภัย
function getPoints(obj, result = []) {
  if (
    Array.isArray(obj) &&
    typeof obj[0] === 'number' &&
    typeof obj[1] === 'number'
  ) {
    if (Number.isFinite(obj[0]) && Number.isFinite(obj[1])) {
      result.push(obj);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach(item => getPoints(item, result));
  } else if (obj && typeof obj === 'object') {
    Object.values(obj).forEach(value => getPoints(value, result));
  }

  return result;
}

// สร้างรูปทรง Polygon และรองรับรูตรงกลาง
function makeShape(rings) {
  if (!rings?.length || !rings[0]?.length) return null;

  const shape = new THREE.Shape();

  rings[0].forEach((coord, i) => {
    const [x, z] = project(coord);

    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });

  // รองรับรูใน Polygon
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

function addPolygon(
  rings,
  material,
  height = 0,
  y = 0.1,
  buildingInfo = null
) {
  const shape = makeShape(rings);
  if (!shape) return;

  const geometry = height > 0
    ? new THREE.ExtrudeGeometry(shape, {
        depth: height,
        bevelEnabled: false
      })
    : new THREE.ShapeGeometry(shape);

  const mesh = new THREE.Mesh(geometry, material);

  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;

  // เก็บข้อมูลอาคารสำหรับระบบคลิก
  if (buildingInfo) {
    mesh.userData.buildingInfo = buildingInfo;
    clickableBuildings.push(mesh);
  }

  scene.add(mesh);
}

function addGeometry(
  geometry,
  material,
  height = 0,
  y = 0.1,
  buildingInfo = null
) {
  if (!geometry) return;

  if (geometry.type === 'Polygon') {
    addPolygon(
      geometry.coordinates,
      material,
      height,
      y,
      buildingInfo
    );
  }

  if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(polygon => {
      addPolygon(
        polygon,
        material,
        height,
        y,
        buildingInfo
      );
    });
  }
}

// สร้างถนนและแนวคลองเป็นแถบ 3 มิติ
function addRibbon(coords, width, material, y = 0.5) {
  const points = coords
    .filter(c =>
      Array.isArray(c) &&
      Number.isFinite(c[0]) &&
      Number.isFinite(c[1])
    )
    .map(c => {
      const [x, z] = project(c);
      return new THREE.Vector3(x, y, z);
    });

  if (points.length < 2) return;

  const positions = [];
  const indices = [];

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
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;

    indices.push(a, b, c, b, d, c);
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );

  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.material.side = THREE.DoubleSide;

  scene.add(mesh);
}
// สร้างป้ายชื่อสถานที่บนโมเดล 3 มิติ
function addPlaceLabel(
  name,
  lon,
  lat,
  color = '#263238',
  y = 8
) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;

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

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  });

  const label = new THREE.Sprite(material);

  const [x, z] = project([lon, lat]);

  label.position.set(x, y, z);
  label.scale.set(22, 5.5, 1);

  // เก็บข้อมูลสถานที่สำหรับระบบคลิก
  label.userData.placeInfo = {
    name: name,
    longitude: lon,
    latitude: lat
  };

  clickablePlaces.push(label);

  scene.add(label);
}

// กำหนดความกว้างถนนตามประเภท
function getRoadWidth(type) {
  const widths = {
    motorway: 14,
    trunk: 12,
    primary: 10,
    secondary: 8,
    tertiary: 6,
    residential: 4.5,
    service: 3,
    footway: 1.5,
    path: 1.5
  };

  return widths[type] || 3;
}
// จำแนกประเภทเส้นทางรถไฟ


function getRailwayMaterial(props) {
  const tags = props || {};

  const name = String(tags.name || '').toLowerCase();
  const network = String(tags.network || '').toLowerCase();
  const operator = String(tags.operator || '').toLowerCase();
  const railway = String(tags.railway || '').toLowerCase();

  // BTS สายสีเขียว
  if (
    network.includes('bts') ||
    name.includes('บีทีเอส') ||
    operator.includes('ระบบขนส่งมวลชนกรุงเทพ')
  ) {
    return materials.bts;
  }

  // MRT สายสีน้ำเงิน
  if (
    network.includes('mrt') ||
    name.includes('สายสีน้ำเงิน') ||
    operator.includes('ทางด่วนและรถไฟฟ้ากรุงเทพ') ||
    operator.includes('กรุงเทพธนาคม')
  ) {
    return materials.mrt;
  }

  // รถไฟฟ้าสายสีเหลือง
  if (
    name.includes('สายสีเหลือง') ||
    operator.includes('อีสเทิร์นบางกอกโมโนเรล') ||
    railway === 'monorail'
  ) {
    return materials.yellow;
  }

  // รถไฟฟ้าสายสีแดง
  if (
    name.includes('สายสีแดง') ||
    operator.includes('การรถไฟแห่งประเทศไทย')
  ) {
    return materials.srt;
  }

  // รางรถไฟทั่วไป
  if (
    railway === 'rail' ||
    railway === 'subway' ||
    railway === 'light_rail'
  ) {
    return materials.rail;
  }

  return null;
}


async function loadGeoJSON(file) {
  console.log('กำลังโหลดไฟล์:', file);

  const response = await fetch(`${import.meta.env.BASE_URL}data/${file}`);

  if (!response.ok) {
    throw new Error(`ไม่พบไฟล์ ${file}`);
  }

  try {
    const data = await response.json();
    console.log('โหลดสำเร็จ:', file);
    return data;
  } catch (error) {
    console.error('ไฟล์ JSON มีปัญหา:', file, error);
    throw error;
  }
}
function getBuildingMaterial(props) {
  const type = props.building;

  if (
    ['residential', 'apartments', 'house', 'detached']
      .includes(type)
  ) {
    return materials.buildingResidential;
  }

  if (
    ['commercial', 'retail', 'office']
      .includes(type)
  ) {
    return materials.buildingCommercial;
  }

  if (
    ['public', 'school', 'hospital', 'university']
      .includes(type)
  ) {
    return materials.buildingPublic;
  }

  if (
    ['industrial', 'warehouse', 'factory']
      .includes(type)
  ) {
    return materials.buildingIndustrial;
  }

  return materials.building;
}
async function loadCity() {
  try {
    const [
  boundary,
  roads,
  buildings,
  water,
  parks,
  stations,
  railways
] = await Promise.all([
  loadGeoJSON('boundary.geojson'),
  loadGeoJSON('roads.geojson'),
  loadGeoJSON('buildings.geojson'),
  loadGeoJSON('water.geojson'),
  loadGeoJSON('parks.geojson'),
  loadGeoJSON('stations.geojson'),
  loadGeoJSON('railways.geojson')
]);
console.log('Railway features:', railways.features.length);
console.log('Railway sample:', railways.features.slice(0, 3));
railways.features.slice(0, 3).forEach((feature, index) => {
  console.log(
    'Railway',
    index,
    'Type:',
    feature.geometry?.type,
    'Properties:',
    feature.properties
  );
});
// สำรวจประเภททางรถไฟทั้งหมด
const railwayTypes = {};

railways.features.forEach(feature => {
  const p = feature.properties || {};

  const key = [
    p.railway || '-',
    p.usage || '-',
    p.service || '-',
    p.operator || '-',
    p.bridge || '-'
  ].join(' | ');

  railwayTypes[key] = (railwayTypes[key] || 0) + 1;
});




console.table(
  Object.entries(railwayTypes).map(([type, count]) => ({
    type,
    count
  }))
);
    // คำนวณจุดกึ่งกลางจากขอบเขตเมือง
    const boundaryPoints = getPoints(boundary);

    if (!boundaryPoints.length) {
      throw new Error('ไม่พบพิกัดขอบเขตเมือง');
    }

    const lons = boundaryPoints.map(p => p[0]);
    const lats = boundaryPoints.map(p => p[1]);

    centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
    centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;

    const width = (Math.max(...lons) - Math.min(...lons)) *
      111320 * Math.cos(centerLat * Math.PI / 180);

    if (!Number.isFinite(width) || width <= 0) {
      throw new Error('คำนวณขนาดเมืองไม่สำเร็จ');
    }

    scale = 700 / width;

    // 1. พื้นที่เขตเมือง
    boundary.features.forEach(feature => {
      addGeometry(feature.geometry, materials.ground, 0, 0);
    });

    // 2. สวนสาธารณะ
    parks.features.forEach(feature => {
      addGeometry(feature.geometry, materials.park, 0, 0.3);
    });

    // 3. แหล่งน้ำและพื้นที่คลองแบบ Polygon
    water.features.forEach(feature => {
      const g = feature.geometry;

      if (g.type === 'Polygon' || g.type === 'MultiPolygon') {
        addGeometry(g, materials.water, 0, 0.45);
      }

      if (g.type === 'LineString') {
        addRibbon(g.coordinates, 7 * scale, materials.water, 0.5);
      }

      if (g.type === 'MultiLineString') {
        g.coordinates.forEach(line => {
          addRibbon(line, 7 * scale, materials.water, 0.5);
        });
      }
    });


    // 4. ถนน
    const roadJunctions = new Map();
    roads.features.forEach((feature, featureIndex) => {
      const g = feature.geometry;
      const props = feature.properties || {};

      if (!g) return;

      const highway = props.highway;
      const roadType = Array.isArray(highway)
        ? highway[0]
        : highway;
      // เก็บตำแหน่งจุดเชื่อมต่อของถนน
if (
  ['primary', 'secondary', 'tertiary', 'residential']
    .includes(roadType)
) {
  let lines = [];

  if (g.type === 'LineString') {
    lines = [g.coordinates];
  }

  if (g.type === 'MultiLineString') {
    lines = g.coordinates;
  }

  const featureNodes = new Set();

  lines.forEach(line => {
    line.forEach(coord => {
      if (!Array.isArray(coord)) return;

      const key =
        `${coord[0].toFixed(5)},${coord[1].toFixed(5)}`;

      featureNodes.add(key);

      if (!roadJunctions.has(key)) {
        roadJunctions.set(key, {
          coord,
          features: new Set()
        });
      }

      roadJunctions.get(key).features.add(featureIndex);
    });
  });
} 

      // เก็บเส้นทางสำหรับรถยนต์
      if (
        ['primary', 'secondary', 'tertiary', 'residential']
          .includes(roadType)
      ) {
        if (g.type === 'LineString') {
          carRoutes.push(g.coordinates);
        }

        if (g.type === 'MultiLineString') {
          g.coordinates.forEach(line => {
            carRoutes.push(line);
          });
        }
      }

      const width = getRoadWidth(roadType) * scale;

      if (g.type === 'LineString') {
        addRibbon(g.coordinates, width, materials.road, 0.65);
      }

      if (g.type === 'MultiLineString') {
        g.coordinates.forEach(line => {
          addRibbon(line, width, materials.road, 0.65);
        });
      }

      if (g.type === 'Polygon' || g.type === 'MultiPolygon') {
        addGeometry(g, materials.road, 0, 0.65);
      }
    });
    // สร้างไฟจราจรบริเวณจุดเชื่อมต่อถนน
   // สร้างไฟจราจรโดยเว้นระยะห่าง
let trafficLightCount = 0;

const placedLights = [];
const minLightDistance = 120;

roadJunctions.forEach(junction => {
  if (junction.features.size < 2) return;

  const [x, z] = project(junction.coord);

  // ตรวจว่ามีไฟจราจรอยู่ใกล้แล้วหรือไม่
  const tooClose = placedLights.some(pos => {
    const dx = pos.x - x;
    const dz = pos.z - z;

    return Math.sqrt(dx * dx + dz * dz)
      < minLightDistance;
  });

  if (tooClose) return;

  createTrafficLight(x, z);

  placedLights.push({ x, z });
  trafficLightCount++;
});

console.log('จำนวนไฟจราจรที่สร้าง:', trafficLightCount);

    console.log('จำนวนไฟจราจรที่สร้าง:', trafficLightCount);
    console.log('กำลังเตรียมเส้นทางรถ');
    prepareCarRoutes();
    console.log('เตรียมเส้นทางรถเสร็จแล้ว');




    // 5. เส้นทางรถไฟ
    railways.features.forEach(feature => {
      const g = feature.geometry;
      const props = feature.properties || {};

      if (
        props.usage === 'yard' &&
        props.railway !== 'subway' &&
        props.railway !== 'monorail'
      ) return;
      if (!g) return;

      const material = getRailwayMaterial(props);

      if (!material) {
        console.log('Unknown railway:', props);
        return;
      }

      const isBridge =
        props.bridge === 'yes' ||
        props.bridge === 'viaduct';

      const y = isBridge ? 1.8 : 0.85;
      const width = 2.5 * scale;

      if (g.type === 'LineString') {
  addRibbon(g.coordinates, width, material, y);

  trainRoutes.push({
    points: g.coordinates,
    material: material,
    height: y
  });
}

if (g.type === 'MultiLineString') {
  g.coordinates.forEach(line => {
    addRibbon(line, width, material, y);

    trainRoutes.push({
      points: line,
      material: material,
      height: y
    });
  });
}

    });
prepareTrainRoutes();

// 6. ป้ายชื่อสถานที่สำคัญ แยกสีตามประเภท

// สวนสาธารณะ - สีเขียว
addPlaceLabel('สวนจตุจักร', 100.5500, 13.8020, '#238443');
addPlaceLabel('สวนรถไฟ', 100.5580, 13.8100, '#238443');

// ตลาด - สีส้ม
addPlaceLabel('ตลาดนัดจตุจักร', 100.5500, 13.7990, '#e67e22');

// มหาวิทยาลัย - สีน้ำเงิน
addPlaceLabel('มหาวิทยาลัยเกษตรศาสตร์', 100.5680, 13.8460, '#2471a3');

// ห้างสรรพสินค้า - สีม่วง
addPlaceLabel('เซ็นทรัล ลาดพร้าว', 100.5610, 13.8160, '#884ea0');

// สถานีรถไฟ - สีแดง
addPlaceLabel('สถานีกลางกรุงเทพอภิวัฒน์', 100.5400, 13.8030, '#c0392b');
    // 5. สถานีรถไฟฟ้า
const stationColors = {
  BTS: 0x00a651,
  MRT: 0x1769aa,
  SRT: 0xd62828,
  UNKNOWN: 0x888888
};
// ตรวจสอบข้อมูลรางหลัก
const mainRailways = railways.features.filter(feature => {
  const p = feature.properties || {};
  return p.usage === 'main';
});

console.log('Main railway count:', mainRailways.length);

console.table(
  mainRailways.map(feature => {
    const p = feature.properties || {};

    return {
      id: feature.id,
      railway: p.railway,
      operator: p.operator,
      name: p.name,
      network: p.network,
      ref: p.ref,
      bridge: p.bridge
    };
  })
);


function getStationType(props) {
  const network = (props.network || '').toLowerCase();
  const operator = (props.operator || '').toLowerCase();
  const name = (props.name || '') + ' ' + (props['name:th'] || '');
  const station = (props.station || '').toLowerCase();

  // รถไฟฟ้าชานเมืองสายสีแดง
  if (
    network.includes('red') ||
    network.includes('สีแดง') ||
    operator.includes('การรถไฟแห่งประเทศไทย')
  ) {
    return 'SRT';
  }

  // BTS
  if (
    network.includes('bts') ||
    operator.includes('ระบบขนส่งมวลชนกรุงเทพ')
  ) {
    return 'BTS';
  }

  // MRT
  if (
    network.includes('mrt') ||
    operator.includes('ทางด่วนและรถไฟฟ้ากรุงเทพ') ||
    station === 'subway'
  ) {
    return 'MRT';
  }

  // สถานีที่ยังระบุสายไม่ได้
  return 'UNKNOWN';
}


stations.features.forEach(feature => {
  const props = feature.properties || {};
  const g = feature.geometry;

  if (!g) return;

  let coord = null;

  if (g.type === 'Point') {
    coord = g.coordinates;
  } else if (g.type === 'Polygon') {
    coord = g.coordinates[0]?.[0];
  }

  if (!coord) return;  
  
  const [x, z] = project(coord);
  trainStations.push({
    name: props['name:th'] || props.name || 'สถานีไม่ทราบชื่อ',
    type: getStationType(props),
    position: new THREE.Vector3(x, 0, z)
  });
  const type = getStationType(props);
  const color = stationColors[type];

  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(3 * scale, 3 * scale, 5 * scale, 20),
    new THREE.MeshStandardMaterial({ color })
  );

  marker.position.set(x, 3 * scale, z);
  scene.add(marker);

  const top = new THREE.Mesh(
    new THREE.SphereGeometry(2.5 * scale, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );

  top.position.set(x, 6 * scale, z);
  scene.add(top);

  console.log(
  'Station:',
  props['name:th'] || props.name || 'ไม่มีชื่อ',
  'สาย:', type,
  'รหัส:', props.ref || '-'
);
});

    // 6. อาคาร
buildings.features.forEach((feature, i) => {
  const props = feature.properties || {};
  const g = feature.geometry;

  const heightMeters =
    Number(props.height) ||
    (Number(props['building:levels']) * 3) ||
    (8 + (i % 5) * 3);

  // เพิ่มความสูงเล็กน้อยเพื่อให้มองเห็นอาคารได้ชัด
  const height = heightMeters * scale * 4;

  // เลือกสีอาคารตามประเภท
  const buildingMaterial = getBuildingMaterial(props);

  addGeometry(g, buildingMaterial, height, 0.7, {
  name: props.name || 'ไม่ทราบชื่ออาคาร',
  type: props.building || 'ไม่ระบุประเภท',
  levels: props['building:levels'] || 'ไม่ระบุ',
  height: heightMeters
});
});

    camera.position.set(0, 650, 850);
    controls.target.set(0, 0, 0);
    controls.update();

    console.log('Chatuchak 3D City loaded');
    console.log('Roads:', roads.features.length);
    console.log('Buildings:', buildings.features.length);
    console.log('Water:', water.features.length);
    console.log('Parks:', parks.features.length);

  } catch (error) {
    console.error('City loading error:', error);
    alert(
      'โหลดข้อมูลเมืองไม่สำเร็จ: ' + error.message +
      '\nกรุณาตรวจสอบไฟล์ในโฟลเดอร์ public/data'
    );
  }
}
// =================================
// ระบบรถยนต์เคลื่อนที่
// =================================


const cars = [];
const carRoutes = [];
// ระบบรถไฟ
const trains = [];
const trainRoutes = [];
const trainStations = [];
const trafficLights = [];
// เส้นทางที่รถจะใช้วิ่ง
let carPathPoints = [];
let carPathCumulative = [];
let carPathLength = 0;
let activeCarRoutes = [];

const carClock = new THREE.Clock();

function createCar(color = 0xff3333) {
  const car = new THREE.Group();

  // ตัวถังรถ
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1.5, 7),
    new THREE.MeshStandardMaterial({ color })
  );
  body.position.y = 1.2;
  car.add(body);

  // หลังคารถ
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 1.2, 3.5),
    new THREE.MeshStandardMaterial({ color: 0xeeeeee })
  );
  roof.position.set(0, 2.3, -0.3);
  car.add(roof);

  // ล้อรถ
  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222
  });

  for (const x of [-2.1, 2.1]) {
    for (const z of [-2.2, 2.2]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.65, 0.35, 16),
        wheelMaterial
      );

      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.65, z);
      car.add(wheel);
    }
  }

  scene.add(car);
  cars.push(car);
  console.log('CAR CREATED:', car.position);

  return car;
}

// สร้างเสาไฟจราจร
function createTrafficLight(x, z) {
  const group = new THREE.Group();

  // เสาไฟ
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
  );

  pole.position.y = 3;
  group.add(pole);

  // กล่องไฟ
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 2.7, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  );

  housing.position.set(0, 5.5, 0);
  group.add(housing);

  // หลอดไฟ 3 สี
  const colors = [
    0xff2222,
    0xffcc00,
    0x00dd44
  ];

  const lamps = [];

  colors.forEach((color, i) => {
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.05
    });

    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 16),
      material
    );

    lamp.position.set(0, 6.3 - i * 0.8, 0.4);
    group.add(lamp);
    lamps.push(lamp);
  });

  group.position.set(x, 0, z);
  scene.add(group);

  const lightData = {
    group,
    lamps,
    phase: 'green',
    timer: 0
  };

  trafficLights.push(lightData);

  return lightData;
}


// อัปเดตสถานะไฟจราจร
function updateTrafficLights(delta) {
  trafficLights.forEach(light => {
    light.timer += delta;

    if (light.phase === 'green' && light.timer >= 10) {
      light.phase = 'yellow';
      light.timer = 0;
    } else if (light.phase === 'yellow' && light.timer >= 3) {
      light.phase = 'red';
      light.timer = 0;
    } else if (light.phase === 'red' && light.timer >= 10) {
      light.phase = 'green';
      light.timer = 0;
    }

    const activeIndex = {
      red: 0,
      yellow: 1,
      green: 2
    }[light.phase];

    light.lamps.forEach((lamp, index) => {
      lamp.material.emissiveIntensity =
        index === activeIndex ? 1.5 : 0.05;
    });
  });
}

// เตรียมเส้นทางรถจากถนน

function prepareCarRoutes() {
  const routes = carRoutes
    .map(coords => {
      return coords
        .filter(c =>
          Array.isArray(c) &&
          Number.isFinite(c[0]) &&
          Number.isFinite(c[1])
        )
        .map(c => {
          const [x, z] = project(c);
          return new THREE.Vector3(x, 0.65, z);
        });
    })
    .filter(points => points.length >= 2);

  if (routes.length === 0) {
    console.warn('ไม่พบเส้นทางสำหรับรถยนต์');
    return;
  }

  // คำนวณความยาวถนนแต่ละเส้น
  const getRouteLength = points => {
    let length = 0;

    for (let i = 1; i < points.length; i++) {
      length += points[i].distanceTo(points[i - 1]);
    }

    return length;
  };

  // เลือกถนนที่มีความยาวเพียงพอ
  routes.sort((a, b) => getRouteLength(b) - getRouteLength(a));

  // กระจายถนนให้รถแต่ละคัน
  activeCarRoutes = [];

  for (let i = 0; i < cars.length; i++) {
    const route = routes[i % routes.length];

    const points = route.map(p => p.clone());
    const cumulative = [];
    let length = 0;

    for (let j = 1; j < points.length; j++) {
      length += points[j].distanceTo(points[j - 1]);
      cumulative.push(length);
    }

    activeCarRoutes.push({
      points,
      cumulative,
      length
    });
  }

  // กำหนดเส้นทางเริ่มต้นให้ระบบเดิม
  carPathPoints = activeCarRoutes[0].points;
  carPathCumulative = activeCarRoutes[0].cumulative;
  carPathLength = activeCarRoutes[0].length;

  // กำหนดตำแหน่งเริ่มต้นของรถ
cars.forEach((car, index) => {
  const route = activeCarRoutes[index];

  car.userData.distance = route.length * 0.15;
  car.userData.routeIndex = index;

  // สถานะการเดินทาง
  car.userData.direction = 1;
  car.userData.speed = 18;
  car.userData.state = 'driving';
  car.userData.waitTimer = 0;

  // ระยะทางก่อนจอดครั้งถัดไป
  car.userData.traveledSinceStop = 0;
  car.userData.stopAfter = 35 + Math.random() * 100;
});
  updateCars(0);

  console.log('จำนวนเส้นทางรถ:', activeCarRoutes.length);
  console.log('ความยาวแต่ละเส้น:', activeCarRoutes.map(r => r.length));
}

function createTrain(color = 0x3366ff) {
  const train = new THREE.Group();

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.25,
    roughness: 0.6
  });

  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x263b50,
    metalness: 0.4,
    roughness: 0.25
  });

  // ตัวถังรถไฟ
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 2.4, 12),
    bodyMaterial
  );
  body.position.y = 1.5;
  train.add(body);

  // หลังคา
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(3.1, 0.35, 11.5),
    new THREE.MeshStandardMaterial({ color: 0xdddddd })
  );
  roof.position.y = 2.88;
  train.add(roof);

  // หน้าต่างสองข้าง
  for (const x of [-1.72, 1.72]) {
    for (const z of [-4, -1.5, 1.5, 4]) {
      const windowMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.9, 1.4),
        glassMaterial
      );

      windowMesh.position.set(x, 1.9, z);
      train.add(windowMesh);
    }
  }

  // ล้อรถไฟ
  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222
  });

  for (const x of [-1.8, 1.8]) {
    for (const z of [-4.5, 4.5]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.35, 16),
        wheelMaterial
      );

      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.55, z);
      train.add(wheel);
    }
  }

  scene.add(train);
  train.userData.isStopped = false;
train.userData.stopTimer = 0;
train.userData.currentStation = null;
  trains.push(train);

  return train;
}


// เตรียมเส้นทางรถไฟ

function connectTrainRoutes(routes, tolerance = 0.00003) {
  const groups = new Map();

  // แยกตามสีและระดับความสูง
  routes.forEach(route => {
    const color = route.material.color.getHex();
    const key = `${color}_${route.height}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(
      route.points.filter(c =>
        Array.isArray(c) &&
        Number.isFinite(c[0]) &&
        Number.isFinite(c[1])
      )
    );
  });

  const connected = [];

  groups.forEach((lines, key) => {
    const unused = lines.filter(line => line.length >= 2);

    while (unused.length > 0) {
      let current = unused.shift().slice();
      let changed = true;

      while (changed) {
        changed = false;

        for (let i = 0; i < unused.length; i++) {
          const line = unused[i];

          const first = current[0];
          const last = current[current.length - 1];
          const lineFirst = line[0];
          const lineLast = line[line.length - 1];

          const dist = (a, b) =>
            Math.hypot(a[0] - b[0], a[1] - b[1]);

          if (dist(last, lineFirst) <= tolerance) {
            current.push(...line.slice(1));
          } else if (dist(last, lineLast) <= tolerance) {
            current.push(...line.slice(0, -1).reverse());
          } else if (dist(first, lineLast) <= tolerance) {
            current.unshift(...line.slice(0, -1));
          } else if (dist(first, lineFirst) <= tolerance) {
            current.unshift(...line.slice(1).reverse());
          } else {
            continue;
          }

          unused.splice(i, 1);
          changed = true;
          break;
        }
      }

      const [color, height] = key.split('_');

      connected.push({
        points: current,
        color: Number(color),
        height: Number(height)
      });
    }
  });

  return connected;
}


function prepareTrainRoutes() {

  // รวมเส้นรางที่เชื่อมต่อกันและมีสีเดียวกัน
  const connectedRoutes = connectTrainRoutes(trainRoutes);

  const routes = connectedRoutes.map(route => ({
    points: route.points.map(c => {
      const [x, z] = project(c);
      return new THREE.Vector3(x, 0, z);
    }),
    height: route.height,
    color: route.color
  })).filter(route => route.points.length >= 2);

  function getLength(points) {
    let total = 0;

    for (let i = 1; i < points.length; i++) {
      total += points[i].distanceTo(points[i - 1]);
    }

    return total;
  }

  if (routes.length === 0) {
    console.warn('ไม่พบเส้นทางรถไฟ');
    return;
  }

  // แยกเส้นทางตามสี
  const routeGroups = new Map();

  routes.forEach(route => {
    if (!routeGroups.has(route.color)) {
      routeGroups.set(route.color, []);
    }

    routeGroups.get(route.color).push(route);
  });

  // เลือกเส้นทางที่ยาวที่สุดของแต่ละสี
  let trainIndex = 0;

  routeGroups.forEach((group, color) => {
    group.sort((a, b) =>
      getLength(b.points) - getLength(a.points)
    );

    const route = group[0];

    const cumulative = [];
    let length = 0;

    for (let i = 1; i < route.points.length; i++) {
      length += route.points[i].distanceTo(
        route.points[i - 1]
      );

      cumulative.push(length);
    }

    const train = createTrain(color);

    train.userData.route = {
      points: route.points,
      cumulative,
      length,
      height: route.height
    };

    train.userData.distance = length * 0.2;
    train.userData.direction = 1;
    train.userData.speed = 12 + trainIndex * 2;

    console.log(
      'สร้างรถไฟสี:',
      '#' + color.toString(16).padStart(6, '0'),
      'ความยาว:',
      length
    );

    trainIndex++;
  });

  console.log('จำนวนเส้นทางหลังเชื่อม:', routes.length);
  console.log('จำนวนกลุ่มเส้นทาง:', routeGroups.size);
  console.log('จำนวนขบวนรถไฟ:', trains.length);
}





// อัปเดตตำแหน่งรถไฟ

function updateTrains(delta) {
  trains.forEach(train => {
    const route = train.userData.route;
    if (
  !route ||
  route.length <= 0 ||
  !route.points ||
  route.points.length < 2 ||
  !route.cumulative
) return;

    const data = train.userData;

    // ถ้ากำลังจอด ให้ลดเวลารอ
    if (data.isStopped) {
      data.stopTimer -= delta;

      if (data.stopTimer <= 0) {
        data.isStopped = false;
        data.currentStation = null;
      }
    } else {
      // เคลื่อนที่ตามทิศทาง
      data.distance += data.direction * data.speed * delta;

      // กลับทิศทางเมื่อถึงปลายทาง
      if (data.distance >= route.length) {
        data.distance = route.length;
        data.direction = -1;
      }

      if (data.distance <= 0) {
        data.distance = 0;
        data.direction = 1;
      }

      // ตรวจสอบสถานีที่อยู่ใกล้รถไฟ
      const nearest = findNearestStation(train);

      if (
        nearest.station &&
        nearest.distance < 8 &&
        data.currentStation !== nearest.station
      ) {
        data.isStopped = true;
        data.stopTimer = 3;
        data.currentStation = nearest.station;
      }
    }

    // หาตำแหน่งบนเส้นทาง
    const distance = data.distance;

    let segment = route.cumulative.findIndex(
      value => value >= distance
    );

    if (segment === -1) {
      segment = route.points.length - 2;
    }

    const startDistance =
      segment === 0 ? 0 : route.cumulative[segment - 1];

    const segmentLength =
      route.cumulative[segment] - startDistance;

    const t = segmentLength > 0
      ? (distance - startDistance) / segmentLength
      : 0;

    const start = route.points[segment];
    const end = route.points[segment + 1];

    const railHeight = THREE.MathUtils.lerp(
  start.y,
  end.y,
  t
);

train.position.set(
  THREE.MathUtils.lerp(start.x, end.x, t),
  route.height,
  THREE.MathUtils.lerp(start.z, end.z, t)
);

    const dx = (end.x - start.x) * data.direction;
    const dz = (end.z - start.z) * data.direction;

    train.rotation.y = Math.atan2(dx, dz);
  });
}

function findNearestStation(train) {
  let nearest = null;
  let minDistance = Infinity;

  trainStations.forEach(station => {
    const distance = Math.hypot(
      train.position.x - station.position.x,
      train.position.z - station.position.z
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = station;
    }
  });

  return {
    station: nearest,
    distance: minDistance
  };
}


// อัปเดตตำแหน่งรถยนต์


function updateCars(delta) {
  if (activeCarRoutes.length === 0) return;

  cars.forEach(car => {
    const route = activeCarRoutes[car.userData.routeIndex];

    if (!route || route.points.length < 2 || route.length <= 0) {
      return;
    }

    const data = car.userData;

    // 1. กรณีจอดรอ
    if (data.state === 'parked') {
      data.waitTimer -= delta;
      data.speed = 0;

      if (data.waitTimer <= 0) {
        data.state = 'driving';
        data.traveledSinceStop = 0;

        // สุ่มระยะทางก่อนจอดครั้งใหม่
        data.stopAfter = 35 + Math.random() * 100;
      }
    } else {
      // 2. คำนวณระยะทางก่อนถึงจุดจอด
      const remaining =
        data.stopAfter - data.traveledSinceStop;

      if (remaining <= 5) {
        data.state = 'stopping';
      } else {
        data.state = 'driving';
      }

      // ตรวจไฟแดง
const redLight = isRedLightAhead(car, route, data);
      // 3. ชะลอความเร็วเมื่อใกล้จอด
      const targetSpeed = redLight
  ? 0
  : data.state === 'stopping'
    ? Math.max(0, 18 * remaining / 5)
    : 18;

      data.speed +=
        (targetSpeed - data.speed) * Math.min(1, delta * 3);

      // 4. เคลื่อนที่
      const movement = redLight
  ? 0
  : Math.min(
      data.speed * delta,
      Math.max(0, remaining)
    );

      data.distance += data.direction * movement;
      data.traveledSinceStop += movement;

      // 5. ถึงจุดจอดแล้วหยุดรอ
      if (remaining <= 0.05) {
        data.state = 'parked';
        data.speed = 0;
        data.waitTimer = 1 + Math.random() * 10;
      }

      // 6. ถึงปลายถนนให้กลับทิศทาง
      if (data.distance >= route.length) {
        data.distance = route.length;
        data.direction = -1;
      }

      if (data.distance <= 0) {
        data.distance = 0;
        data.direction = 1;
      }
    }
    // ตรวจว่ามีไฟแดงอยู่ใกล้รถหรือไม่
function isRedLightAhead(car, route, data) {
  const lookAhead = 12;

  const nextDistance =
    data.distance + data.direction * lookAhead;

  const checkDistance = Math.max(
    0,
    Math.min(route.length, nextDistance)
  );

  const segment = route.cumulative.findIndex(
    length => length >= checkDistance
  );

  if (segment < 0) return false;

  const startDistance =
    segment === 0 ? 0 : route.cumulative[segment - 1];

  const segmentLength =
    route.cumulative[segment] - startDistance;

  const t = segmentLength > 0
    ? (checkDistance - startDistance) / segmentLength
    : 0;

  const point = new THREE.Vector3().lerpVectors(
    route.points[segment],
    route.points[segment + 1],
    t
  );

  return trafficLights.some(light => {
    if (light.phase !== 'red') return false;

    const lightPosition = light.group.position;

    return point.distanceTo(lightPosition) < 8;
  });
}

    // 7. หาตำแหน่งบนถนน
    const distance = data.distance;

    let segment = route.cumulative.findIndex(
      length => length >= distance
    );

    if (segment === -1) {
      segment = route.points.length - 2;
    }

    const startDistance =
      segment === 0 ? 0 : route.cumulative[segment - 1];

    const segmentLength =
      route.cumulative[segment] - startDistance;

    const t = segmentLength > 0
      ? (distance - startDistance) / segmentLength
      : 0;

    const start = route.points[segment];
    const end = route.points[segment + 1];

    car.position.lerpVectors(start, end, t);

    // 8. หันหน้ารถตามทิศทางที่กำลังวิ่ง
    const dx = (end.x - start.x) * data.direction;
    const dz = (end.z - start.z) * data.direction;

    car.rotation.y = Math.atan2(dx, dz);
  });
}


// สร้างรถ 3 คัน (ต้องอยู่นอกฟังก์ชัน)
createCar(0xff3333);
createCar(0x3366ff);
createCar(0xffcc00);

loadCity();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(carClock.getDelta(), 0.05);

  controls.update();
  updateCars(delta);
  updateTrains(delta);
  updateTrafficLights(delta);

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'f' && cars.length > 0) {
    const car = cars[0];

    controls.target.copy(car.position);

    camera.position.set(
      car.position.x + 35,
      car.position.y + 25,
      car.position.z + 35
    );

    controls.update();
  }
});

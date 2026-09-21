import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import { BODY_GROUPS, type BodyGroup } from '../shared/report-ranges';

const anchors: Record<BodyGroup, [number, number, number]> = {
  circulation: [0.2, 0.88, 0.34],
  liver: [-0.25, 0.25, 0.31],
  kidneys: [0.36, -0.2, 0.08],
  general: [-0.97, -0.75, 0.1],
};
const hotspotRadius = (count: number) => 0.18 + Math.min(0.42, Math.sqrt(count) * 0.095);

export function BodyScene({
  counts,
  selected,
  onSelect,
  onPreview,
  onUnavailable,
}: {
  counts: Record<BodyGroup, number>;
  selected: BodyGroup;
  onSelect: (group: BodyGroup) => void;
  onPreview: (group: BodyGroup | null) => void;
  onUnavailable: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<Partial<Record<BodyGroup, HTMLButtonElement>>>({});
  const callbacks = useRef({ onSelect, onPreview, onUnavailable });
  callbacks.current = { onSelect, onPreview, onUnavailable };
  const control = useRef<
    | {
        reset: () => void;
        turn: () => void;
        spinning: boolean;
        render: () => void;
        select: (group: BodyGroup) => void;
      }
    | undefined
  >(undefined);
  const [spinning, setSpinning] = useState(false);
  const signature = JSON.stringify(counts);
  useEffect(() => {
    const element = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      });
    } catch {
      callbacks.current.onUnavailable();
      return;
    }
    const countMap = JSON.parse(signature) as Record<BodyGroup, number>;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setClearColor(0xf0f5f4, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
    const canvas = renderer.domElement;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Interactive 3D anatomical body map');
    canvas.dataset.ready = 'false';
    element.prepend(canvas);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    camera.position.set(0, 0.2, 10.2);
    const orbit = new OrbitControls(camera, canvas);
    orbit.target.set(0, 0, 0);
    orbit.enableDamping = true;
    orbit.enablePan = false;
    orbit.enableZoom = true;
    orbit.minDistance = 7.5;
    orbit.maxDistance = 12;
    orbit.minPolarAngle = Math.PI * 0.32;
    orbit.maxPolarAngle = Math.PI * 0.68;
    orbit.autoRotateSpeed = 0.8;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x71968d, 3));
    const key = new THREE.DirectionalLight(0xffffff, 4);
    key.position.set(-3, 5, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8fe2d4, 3);
    rim.position.set(4, 2, -3);
    scene.add(rim);
    const body = new THREE.Group();
    scene.add(body);
    const shell = new THREE.MeshPhysicalMaterial({
      color: 0x9abeb6,
      transparent: true,
      opacity: 0.2,
      roughness: 0.35,
      metalness: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const bone = new THREE.MeshStandardMaterial({
      color: 0xe5e9df,
      roughness: 0.65,
      transparent: true,
      opacity: 0.72,
    });
    const neutral = new THREE.MeshPhysicalMaterial({
      color: 0x709c90,
      roughness: 0.42,
      clearcoat: 0.6,
    });
    const lungMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x9faeb7,
      transparent: true,
      opacity: 0.5,
      roughness: 0.5,
      depthWrite: false,
    });
    const pickable: THREE.Object3D[] = [];
    const groupMaterials: Partial<Record<BodyGroup, THREE.MeshPhysicalMaterial>> = {};
    const geometry = new THREE.SphereGeometry(1, 32, 24);
    function ellipsoid(
      position: [number, number, number],
      scale: [number, number, number],
      material: THREE.Material,
      parent = body,
    ) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.scale.set(...scale);
      parent.add(mesh);
      return mesh;
    }
    function tube(
      points: [number, number, number][],
      radius: number,
      color: number,
      parent = body,
    ) {
      const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 32, radius, 8, false),
        new THREE.MeshStandardMaterial({ color, roughness: 0.55 }),
      );
      parent.add(mesh);
      return mesh;
    }
    ellipsoid([0, 2.03, 0], [0.28, 0.38, 0.28], shell);
    ellipsoid([0, 1.59, 0], [0.14, 0.25, 0.16], shell);
    const torso = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.27, -0.65),
        new THREE.Vector2(0.43, -0.42),
        new THREE.Vector2(0.45, -0.12),
        new THREE.Vector2(0.38, 0.3),
        new THREE.Vector2(0.49, 0.85),
        new THREE.Vector2(0.56, 1.18),
        new THREE.Vector2(0.5, 1.35),
        new THREE.Vector2(0.17, 1.53),
      ],
      48,
    );
    const torsoMesh = new THREE.Mesh(torso, shell);
    torsoMesh.scale.z = 0.65;
    body.add(torsoMesh);
    for (const side of [-1, 1]) {
      const upperArm = ellipsoid([side * 0.7, 0.82, 0], [0.17, 0.58, 0.18], shell);
      upperArm.rotation.z = side * 0.2;
      const forearm = ellipsoid([side * 0.89, -0.08, 0.03], [0.12, 0.43, 0.14], shell);
      forearm.rotation.z = side * 0.08;
      ellipsoid([side * 0.93, -0.62, 0.06], [0.105, 0.21, 0.07], shell);
      const thigh = ellipsoid([side * 0.24, -1.01, 0], [0.22, 0.66, 0.23], shell);
      thigh.rotation.z = side * -0.045;
      ellipsoid([side * 0.25, -1.9, 0], [0.145, 0.58, 0.15], shell);
      ellipsoid([side * 0.25, -2.45, 0.13], [0.15, 0.1, 0.3], shell);
      tube(
        [
          [side * 0.2, -0.45, 0],
          [side * 0.25, -1.4, 0],
          [side * 0.25, -2.37, 0],
        ],
        0.035,
        0xd4ded7,
      );
      tube(
        [
          [side * 0.59, 1.22, 0],
          [side * 0.8, 0.35, 0],
          [side * 0.93, -0.51, 0],
        ],
        0.025,
        0xd4ded7,
      );
      ellipsoid([side * 0.28, 0.98, 0.01], [0.235, 0.45, 0.18], lungMaterial);
      for (let rib = 0; rib < 5; rib++) {
        const height = 1.25 - rib * 0.15;
        tube(
          [
            [0, height, 0.24],
            [side * 0.3, height - 0.06, 0.28],
            [side * 0.46, height, 0],
            [side * 0.2, height + 0.02, -0.19],
          ],
          0.013,
          0xbbd0c5,
        );
      }
    }
    for (let vertebra = 0; vertebra < 16; vertebra++)
      ellipsoid([0, 1.5 - vertebra * 0.12, -0.15], [0.058, 0.048, 0.06], bone);
    tube(
      [
        [0, 1.45, 0.12],
        [0, 1.1, 0.12],
        [-0.2, 0.94, 0.02],
      ],
      0.035,
      0x87a5ae,
    );
    tube(
      [
        [0, 1.1, 0.12],
        [0.2, 0.94, 0.02],
      ],
      0.029,
      0x87a5ae,
    );
    function organ(
      shape: THREE.Shape,
      group: BodyGroup,
      position: [number, number, number],
      depth: number,
    ) {
      const material =
        groupMaterials[group] ??
        new THREE.MeshPhysicalMaterial({
          color: countMap[group] ? 0xc65b62 : 0x799e92,
          roughness: 0.35,
          metalness: 0.02,
          clearcoat: 0.7,
        });
      groupMaterials[group] = material;
      const mesh = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: true,
          bevelSegments: 4,
          steps: 1,
          bevelSize: 0.045,
          bevelThickness: 0.035,
          curveSegments: 24,
        }),
        material,
      );
      mesh.position.set(...position);
      mesh.userData.group = group;
      pickable.push(mesh);
      body.add(mesh);
      return mesh;
    }
    const heart = new THREE.Shape();
    heart.moveTo(0, -0.25);
    heart.bezierCurveTo(-0.3, 0, -0.25, 0.3, -0.08, 0.23);
    heart.bezierCurveTo(0.01, 0.35, 0.26, 0.22, 0.2, 0.04);
    heart.bezierCurveTo(0.14, -0.1, 0.04, -0.22, 0, -0.25);
    const heartMesh = organ(heart, 'circulation', [0.15, 0.88, 0.18], 0.17);
    heartMesh.rotation.z = -0.2;
    tube(
      [
        [0.12, 1.02, 0.28],
        [0.12, 1.3, 0.22],
        [-0.06, 1.29, 0.18],
        [-0.06, 0.6, -0.02],
        [-0.05, -0.3, 0.04],
      ],
      0.047,
      0xb95e62,
    );
    tube(
      [
        [-0.1, 1.31, 0.03],
        [-0.1, 0.48, 0.03],
        [-0.1, -0.45, 0.03],
      ],
      0.033,
      0x608ca7,
    );
    const liver = new THREE.Shape();
    liver.moveTo(-0.38, 0.12);
    liver.bezierCurveTo(-0.43, 0.38, 0.16, 0.37, 0.45, 0.15);
    liver.bezierCurveTo(0.35, 0.08, 0.2, 0.04, 0.12, 0);
    liver.bezierCurveTo(-0.1, -0.12, -0.3, -0.1, -0.38, 0.12);
    organ(liver, 'liver', [-0.12, 0.15, 0.16], 0.14);
    for (const side of [-1, 1]) {
      const kidney = new THREE.Shape();
      kidney.moveTo(0, -0.2);
      kidney.bezierCurveTo(-0.22, -0.24, -0.24, 0.28, -0.02, 0.25);
      kidney.bezierCurveTo(0.13, 0.24, 0.15, 0.1, 0.04, 0.03);
      kidney.bezierCurveTo(0.12, -0.06, 0.13, -0.18, 0, -0.2);
      const mesh = organ(kidney, 'kidneys', [side * 0.32, -0.21, 0.1], 0.13);
      mesh.scale.x = -side;
      tube(
        [
          [side * 0.29, -0.28, 0.15],
          [side * 0.2, -0.65, 0.12],
          [0, -0.83, 0.1],
        ],
        0.014,
        0xc7aa7f,
      );
    }
    ellipsoid([0, -0.81, 0.1], [0.13, 0.13, 0.09], neutral);
    const stomach = ellipsoid([0.28, 0.13, 0.03], [0.18, 0.27, 0.12], neutral);
    stomach.rotation.z = -0.4;
    const intestines = new THREE.Group();
    body.add(intestines);
    for (let index = 0; index < 4; index++)
      tube(
        [
          [-0.27, -0.42 - index * 0.06, 0.14],
          [-0.1, -0.38 - index * 0.06, 0.19],
          [0.15, -0.45 - index * 0.06, 0.19],
          [0.28, -0.39 - index * 0.06, 0.14],
        ],
        0.022,
        0x8eaba0,
        intestines,
      );
    const halos: THREE.Mesh[] = [];
    for (const group of Object.keys(anchors) as BodyGroup[]) {
      const count = countMap[group];
      if (!count) continue;
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(hotspotRadius(count), 40, 24),
        new THREE.MeshBasicMaterial({
          color: group === 'general' ? 0xc99228 : 0xe5767a,
          transparent: true,
          opacity: 0.12,
          depthWrite: false,
        }),
      );
      halo.position.set(...anchors[group]);
      halo.userData.group = group;
      body.add(halo);
      halos.push(halo);
      pickable.push(halo);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(hotspotRadius(count), 0.006, 8, 64),
        new THREE.MeshBasicMaterial({
          color: group === 'general' ? 0xa77922 : 0xc9555f,
          transparent: true,
          opacity: 0.5,
        }),
      );
      ring.position.copy(halo.position);
      body.add(ring);
    }
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let start = { x: 0, y: 0 };
    function hit(event: PointerEvent) {
      const bounds = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        (-(event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(pickable)[0]?.object.userData.group as
        BodyGroup | undefined;
    }
    const down = (event: PointerEvent) => {
      start = { x: event.clientX, y: event.clientY };
    };
    const up = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6) {
        const group = hit(event);
        if (group) callbacks.current.onSelect(group);
      }
    };
    const move = (event: PointerEvent) => {
      const group = hit(event);
      canvas.style.cursor = group ? 'pointer' : 'grab';
      if (!event.buttons) callbacks.current.onPreview(group ?? null);
    };
    const leave = () => callbacks.current.onPreview(null);
    const lost = (event: Event) => {
      event.preventDefault();
      callbacks.current.onUnavailable();
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('webglcontextlost', lost);
    let pendingFrame = 0;
    let disposed = false;
    function requestRender() {
      if (!pendingFrame && !disposed) pendingFrame = requestAnimationFrame(render);
    }
    control.current = {
      spinning: false,
      render: requestRender,
      reset: () => {
        camera.position.set(0, 0.2, 10.2);
        orbit.target.set(0, 0, 0);
        orbit.update();
      },
      turn: () => {
        const position = camera.position
          .clone()
          .sub(orbit.target)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6);
        camera.position.copy(position.add(orbit.target));
        orbit.update();
      },
      select: (group) => {
        for (const [name, material] of Object.entries(groupMaterials)) {
          material.emissive.set(name === group ? 0x244e46 : 0x000000);
          material.emissiveIntensity = 0.22;
        }
        requestRender();
      },
    };
    const resize = new ResizeObserver(() => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      requestRender();
    });
    resize.observe(element);
    let frame = 0;
    function render() {
      pendingFrame = 0;
      if (disposed) return;
      orbit.autoRotate = control.current?.spinning ?? false;
      const changed = orbit.update();
      renderer.render(scene, camera);
      canvas.dataset.ready = 'true';
      canvas.dataset.frame = String(++frame);
      canvas.dataset.azimuth = orbit.getAzimuthalAngle().toFixed(3);
      for (const group of Object.keys(anchors) as BodyGroup[]) {
        const label = labels.current[group];
        if (!label) continue;
        const position = new THREE.Vector3(...anchors[group]).project(camera);
        label.style.left = `${((position.x + 1) / 2) * 100}%`;
        label.style.top = `${((-position.y + 1) / 2) * 100}%`;
      }
      if (changed || control.current?.spinning) requestRender();
    }
    orbit.addEventListener('change', requestRender);
    requestRender();
    return () => {
      disposed = true;
      cancelAnimationFrame(pendingFrame);
      orbit.removeEventListener('change', requestRender);
      resize.disconnect();
      orbit.dispose();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('webglcontextlost', lost);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material])
            materials.add(material);
        }
      });
      geometries.forEach((item) => item.dispose());
      materials.forEach((item) => item.dispose());
      renderer.dispose();
      canvas.remove();
      control.current = undefined;
    };
  }, [signature]);
  useEffect(() => {
    control.current?.select(selected);
  }, [selected, signature]);
  return (
    <div className="body-scene-wrap">
      <div className="body-scene" ref={host}>
        <span className="scene-caption">ANATOMICAL OVERVIEW / ILLUSTRATIVE</span>
        {(Object.keys(anchors) as BodyGroup[]).map((group) => (
          <button
            key={group}
            ref={(element) => {
              if (element) labels.current[group] = element;
            }}
            className={`scene-hotspot ${counts[group] ? 'is-active' : ''} ${group === selected ? 'is-selected' : ''}`}
            data-group={group}
            data-count={counts[group]}
            data-radius={counts[group] ? hotspotRadius(counts[group]) : 0}
            title={`${BODY_GROUPS[group].label}: ${counts[group]} outside-range tests`}
            aria-label={`${BODY_GROUPS[group].label}: ${counts[group]} outside-range series`}
            aria-pressed={group === selected}
            onClick={() => onSelect(group)}
            onFocus={() => onPreview(group)}
            onBlur={() => onPreview(null)}
            onMouseEnter={() => onPreview(group)}
            onMouseLeave={() => onPreview(null)}
          >
            {counts[group]}
            <span className="sr-only">{BODY_GROUPS[group].label}</span>
          </button>
        ))}
      </div>
      <div className="scene-toolbar" role="group" aria-label="3D view controls">
        <button
          className="icon-button"
          title="Reset body orientation"
          aria-label="Reset body orientation"
          onClick={() => control.current?.reset()}
        >
          <RotateCcw size={18} />
        </button>
        <button
          className="icon-button"
          title="Rotate body"
          aria-label="Rotate body"
          onClick={() => control.current?.turn()}
        >
          <RotateCw size={18} />
        </button>
        <button
          className="icon-button"
          title={spinning ? 'Pause rotation' : 'Start rotation'}
          aria-label={spinning ? 'Pause rotation' : 'Start rotation'}
          aria-pressed={spinning}
          onClick={() => {
            const next = !spinning;
            if (control.current) {
              control.current.spinning = next;
              control.current.render();
            }
            setSpinning(next);
          }}
        >
          {spinning ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <span>Hotspot size = flagged test count</span>
      </div>
    </div>
  );
}

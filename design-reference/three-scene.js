// Three.js Neural Network Particle System
(function() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const scene = new THREE.Scene();
  const W = () => canvas.clientWidth;
  const H = () => canvas.clientHeight;

  const camera = new THREE.PerspectiveCamera(60, W() / H(), 0.1, 1000);
  camera.position.z = 22;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.setClearColor(0x000000, 0);

  // --- Particles ---
  const N = 160;
  const DIST_THRESHOLD = 5.5;
  const particles = [];

  for (let i = 0; i < N; i++) {
    particles.push({
      x: (Math.random() - 0.5) * 32,
      y: (Math.random() - 0.5) * 20,
      z: (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 0.012,
      vy: (Math.random() - 0.5) * 0.008,
      vz: (Math.random() - 0.5) * 0.004,
    });
  }

  // Dot geometry
  const dotGeo = new THREE.BufferGeometry();
  const dotPositions = new Float32Array(N * 3);
  dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));

  const dotMat = new THREE.PointsMaterial({
    color: 0xb8f53d,
    size: 0.12,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });
  const dots = new THREE.Points(dotGeo, dotMat);
  scene.add(dots);

  // Line geometry (pre-allocated for max possible lines)
  const maxLines = N * N;
  const lineBuf = new Float32Array(maxLines * 6);
  const lineGeo = new THREE.BufferGeometry();
  const linePosAttr = new THREE.BufferAttribute(lineBuf, 3);
  linePosAttr.setUsage(THREE.DynamicDrawUsage);
  lineGeo.setAttribute('position', linePosAttr);

  const lineMat = new THREE.LineBasicMaterial({
    color: 0xb8f53d,
    transparent: true,
    opacity: 0.12,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  // Mouse parallax
  let mouseX = 0, mouseY = 0;
  let targetMX = 0, targetMY = 0;
  window.addEventListener('mousemove', (e) => {
    targetMX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetMY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // Resize
  window.addEventListener('resize', () => {
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
  });

  let frame = 0;
  function animate() {
    requestAnimationFrame(animate);
    frame++;

    // Smooth mouse
    mouseX += (targetMX - mouseX) * 0.04;
    mouseY += (targetMY - mouseY) * 0.04;

    // Move camera slightly with mouse
    camera.position.x += (mouseX * 2 - camera.position.x) * 0.04;
    camera.position.y += (-mouseY * 1 - camera.position.y) * 0.04;

    // Update particle positions
    for (let i = 0; i < N; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;

      // Boundary bounce
      if (Math.abs(p.x) > 17) p.vx *= -1;
      if (Math.abs(p.y) > 11) p.vy *= -1;
      if (Math.abs(p.z) > 6)  p.vz *= -1;

      dotPositions[i * 3]     = p.x;
      dotPositions[i * 3 + 1] = p.y;
      dotPositions[i * 3 + 2] = p.z;
    }
    dotGeo.attributes.position.needsUpdate = true;

    // Update lines
    let lc = 0;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dz = particles[i].z - particles[j].z;
        const d2 = dx*dx + dy*dy + dz*dz;
        if (d2 < DIST_THRESHOLD * DIST_THRESHOLD) {
          lineBuf[lc * 6]     = particles[i].x;
          lineBuf[lc * 6 + 1] = particles[i].y;
          lineBuf[lc * 6 + 2] = particles[i].z;
          lineBuf[lc * 6 + 3] = particles[j].x;
          lineBuf[lc * 6 + 4] = particles[j].y;
          lineBuf[lc * 6 + 5] = particles[j].z;
          lc++;
        }
      }
    }
    lineGeo.setDrawRange(0, lc * 2);
    lineGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }

  animate();
})();

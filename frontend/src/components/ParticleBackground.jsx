import React, { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';

const ParticleBackground = () => {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // 1. Setup Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 60; // Zoom out for large Analytic Sphere

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Position Canvas
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    // 2. Configuration (The "ERP Standard" - Global Analytics)
    // Concept: "The Analytic Sphere" - Global Connectivity & Data Insight
    // Represents: The University as a cohesive, connected world.
    // Interaction: "Data Extraction" - Hovering reveals depth/metrics (Spikes).

    const PARTICLE_COUNT = 800;
    const SPHERE_RADIUS = 22;
    const CONNECTION_DIST = 4.5;

    // 3. Geometry (Fibonacci Sphere - Perfect Distribution)
    const particleGeometry = new THREE.BufferGeometry();
    const pos = new Float32Array(PARTICLE_COUNT * 3); // Current Pos
    const originalPos = new Float32Array(PARTICLE_COUNT * 3); // Base Sphere Pos
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    // Enterprise Palette
    const colorBase = new THREE.Color(0x3b82f6); // Royal Blue (Core)
    const colorHigh = new THREE.Color(0x10b981); // Emerald (Data/Success)
    const colorSpike = new THREE.Color(0xfacc15); // Yellow (Analytics Warning/Highlight)

    // Generate Points
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden Angle

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2; // y goes from 1 to -1
      const radius = Math.sqrt(1 - y * y); // Radius at y

      const theta = phi * i;

      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;

      // Scale to sphere size
      const i3 = i * 3;
      originalPos[i3] = x * SPHERE_RADIUS;
      originalPos[i3 + 1] = y * SPHERE_RADIUS;
      originalPos[i3 + 2] = z * SPHERE_RADIUS;

      pos[i3] = originalPos[i3];
      pos[i3 + 1] = originalPos[i3 + 1];
      pos[i3 + 2] = originalPos[i3 + 2];

      // Base Color
      colors[i3] = colorBase.r;
      colors[i3 + 1] = colorBase.g;
      colors[i3 + 2] = colorBase.b;

      sizes[i] = 1.0;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute vec3 color;
        attribute float size;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (12.0 * size) * (1.0 / -mv.z); // Visible dots
          gl_Position = projectionMatrix * mv;
          vAlpha = smoothstep(50.0, 10.0, -mv.z);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.4, d); // Sharp, techy circles
          gl_FragColor = vec4(vColor, a * vAlpha);
        }
      `
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);


    // 4. Lines (Pre-calculated Network)
    // Connecting nearest neighbors on the sphere surface
    // Static topology, but dynamic vertex positions
    const lineIndices = [];

    // Brute force neighbor optimization (only run once)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const p1 = new THREE.Vector3(originalPos[i3], originalPos[i3 + 1], originalPos[i3 + 2]);

      let neighbors = 0;
      // Check all others (expensive setup, but creates static index buffer)
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const j3 = j * 3;
        const p2 = new THREE.Vector3(originalPos[j3], originalPos[j3 + 1], originalPos[j3 + 2]);
        const dist = p1.distanceTo(p2);

        if (dist < CONNECTION_DIST) {
          lineIndices.push(i, j);
          neighbors++;
        }
        // Limit connections per node for performance/aesthetics
        if (neighbors >= 3) break;
      }
    }

    const lineGeometry = new THREE.BufferGeometry();
    // We need a separate position buffer for lines that we update manually
    // because it needs to match the particle positions EXACTLY
    const linePos = new Float32Array(lineIndices.length * 3);
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePos, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending
    });

    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);


    // 5. Interaction
    const mouse = new THREE.Vector2(0, 0);
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Intersection plane

    const handleMouseMove = (e) => {
      // Standard Normalized Device Coords
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove);

    let animationId;
    let time = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      time += 0.005;

      // Rotate the entire container smoothly
      // We rotate the OBJECTS, not the camera, so lighting/mouse logic stays simple
      const rotSpeed = 0.002;
      particles.rotation.y += rotSpeed;
      lines.rotation.y += rotSpeed;
      particles.rotation.x = Math.sin(time * 0.5) * 0.1; // Gentle tilt
      lines.rotation.x = Math.sin(time * 0.5) * 0.1;

      // Raycasting for "Surface Interaction"
      // We want to find the point on the sphere surface closest to mouse.
      // Since it's a sphere at 0,0,0, we can just unproject mouse ray.
      raycaster.setFromCamera(mouse, camera);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), intersectPoint);
      // Rough approximation: The mouse interaction point acts as a "Magnet" in 3D space
      // But we want it to feel like we are hovering over the sphere surface.
      // Let's project the mouse 2D pos onto the sphere radius Z-plane roughly or just use screenspace distance.
      // Better: Just use 3D distance from a "Cursor Orb" that floats in front.

      const cursor3D = new THREE.Vector3(mouse.x * 30, mouse.y * 30, 10); // Floating in front

      const positions = particleGeometry.attributes.position.array;
      const colAttr = particleGeometry.attributes.color.array;
      const lnPos = lineGeometry.attributes.position.array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;

        // Get World Position of this dot (Apply Rotation Manually to check distance? 
        // Or simpler: Inverse rotate the mouse cursor? 
        // Simplest: Check distance in "Local Space" against an inverse-rotated cursor)

        // Let's just do a simple "Pulse" based on original position + noise
        // AND a "Spike" based on local proximity to a "Hotspot" that moves.

        // 1. Calculate "Hotspot" in local space (orbiting the sphere)
        // Just make the spike travel around the sphere 
        const spikeLat = Math.sin(time * 2) * SPHERE_RADIUS;
        const spikeLon = Math.cos(time * 2) * SPHERE_RADIUS;

        // Actually, let's make the MOUSE warp the sphere.
        // We need world coordinates of the point.
        const v = new THREE.Vector3(originalPos[i3], originalPos[i3 + 1], originalPos[i3 + 2]);
        v.applyEuler(particles.rotation); // Apply current rotation

        // Distance to mouse ray in world space
        // Ray origin + t*dir. 
        // Simple visual hack: Distance to Mouse projected at Z=0
        // If the particle is in front (z > 0) and close to mouse X/Y...

        let extrusion = 0;
        const screenX = v.x; // Very rough "screen" coords since camera is at Z=50 looking at 0,0,0
        const screenY = v.y;

        // Check if close to mouse
        const dx = screenX - (mouse.x * 25); // Scale mouse to approx world units
        const dy = screenY - (mouse.y * 25);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 8 && v.z > 0) { // Only affect front-facing side
          extrusion = (1.0 - dist / 8) * 8.0; // Spike up to 8 units
        }

        // Apply Extrusion along Normal Vector (which is just Position normalized for a sphere)
        const normal = new THREE.Vector3(originalPos[i3], originalPos[i3 + 1], originalPos[i3 + 2]).normalize();
        const targetPos = normal.multiplyScalar(SPHERE_RADIUS + extrusion);

        // LERP for smooth animation
        positions[i3] += (targetPos.x - positions[i3]) * 0.1;
        positions[i3 + 1] += (targetPos.y - positions[i3 + 1]) * 0.1;
        positions[i3 + 2] += (targetPos.z - positions[i3 + 2]) * 0.1;

        // Color Interaction
        if (extrusion > 1.0) {
          // High Extrusion = Yellow/Spike
          colAttr[i3] = colorSpike.r; colAttr[i3 + 1] = colorSpike.g; colAttr[i3 + 2] = colorSpike.b;
        } else {
          // Return to Blue/Green
          colAttr[i3] += (colorBase.r - colAttr[i3]) * 0.05;
          colAttr[i3 + 1] += (colorBase.g - colAttr[i3 + 1]) * 0.05;
          colAttr[i3 + 2] += (colorBase.b - colAttr[i3 + 2]) * 0.05;
        }
      }

      // Update Lines to match Points
      for (let k = 0; k < lineIndices.length; k += 2) {
        const idx1 = lineIndices[k];
        const idx2 = lineIndices[k + 1];

        const i1 = idx1 * 3;
        const i2 = idx2 * 3;

        const l_i = k * 3; // Line vertex index start (2 verts per line, so k*3 for 1st, k*3+3 for 2nd is wrong?)
        // lineIndices is [a, b, c, d...]
        // linePos is [ax, ay, az, bx, by, bz, cx, cy, cz...]
        // if k=0 (first pair): indices[0], indices[1]. Target pos 0, 1.

        // Start Vertex
        lnPos[l_i] = positions[i1];
        lnPos[l_i + 1] = positions[i1 + 1];
        lnPos[l_i + 2] = positions[i1 + 2];

        // End Vertex
        lnPos[l_i + 3] = positions[i2];
        lnPos[l_i + 4] = positions[i2 + 1];
        lnPos[l_i + 5] = positions[i2 + 2];
      }

      particleGeometry.attributes.position.needsUpdate = true;
      particleGeometry.attributes.color.needsUpdate = true;
      lineGeometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      particleGeometry.dispose();
      particleMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full z-[-1] pointer-events-none"
    />
  );
};

export default ParticleBackground;

import * as THREE from 'three';

/**
 * Creates an interactive particle background using Three.js with advanced effects.
 */
export class ParticleBackground {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particles: THREE.Points | null = null;
  private lines: THREE.LineSegments | null = null;
  private container: HTMLElement;
  private mouse = new THREE.Vector2();
  private mouseTarget = new THREE.Vector3();
  private particlePositions: Float32Array;
  private particleVelocities: Float32Array;
  private particleCount: number = 3000; // Increased for a denser field
  private maxConnections: number = 20;
  private connectionDistance: number = 0.5; // Slightly reduced for performance with more particles
  private time: number = 0;
  private velocityDamping: number = 0.97; // Damping factor for friction

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found.`);
    }
    this.container = container;

    this.particlePositions = new Float32Array(this.particleCount * 3);
    this.particleVelocities = new Float32Array(this.particleCount * 3);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.container as HTMLCanvasElement,
      alpha: true,
      antialias: true,
    });

    this.init();
    this.animate();
  }

  private init(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.camera.position.z = 4; // Moved camera slightly closer

    this.createParticles();
    this.createConnections();

    window.addEventListener('resize', this.onWindowResize.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  private createParticles(): void {
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    // Portfolio theme colors (orange-yellow gradient)
    const color1 = new THREE.Color(0xffdb70); // hsl(45, 100%, 72%)
    const color2 = new THREE.Color(0xffb84d); // hsl(35, 100%, 68%)
    const color3 = new THREE.Color(0xffffff); // white

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      
      // Random positions in 3D space
      this.particlePositions[i3] = (Math.random() - 0.5) * 20; // Increased spread
      this.particlePositions[i3 + 1] = (Math.random() - 0.5) * 20; // Increased spread
      this.particlePositions[i3 + 2] = (Math.random() - 0.5) * 20; // Increased spread

      // Random velocities for floating animation
      this.particleVelocities[i3] = (Math.random() - 0.5) * 0.001;
      this.particleVelocities[i3 + 1] = (Math.random() - 0.5) * 0.001;
      this.particleVelocities[i3 + 2] = (Math.random() - 0.5) * 0.001;

      // Color gradient based on depth
      const t = Math.random();
      const mixedColor = t < 0.5 
        ? color1.clone().lerp(color2, t * 2)
        : color2.clone().lerp(color3, (t - 0.5) * 2);

      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;

      // Varying sizes for depth perception
      sizes[i] = Math.random() * 0.025 + 0.01;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private createConnections(): void {
    const maxConnections = this.particleCount * this.maxConnections;
    const positions = new Float32Array(maxConnections * 3);
    const colors = new Float32Array(maxConnections * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });

    this.lines = new THREE.LineSegments(geometry, material);
    this.scene.add(this.lines);
  }

  private updateConnections(): void {
    if (!this.lines || !this.particles) return;

    const positions = this.lines.geometry.attributes.position.array as Float32Array;
    const colors = this.lines.geometry.attributes.color.array as Float32Array;
    
    let vertexpos = 0;
    let colorpos = 0;
    let numConnected = 0;

    const connectionColor = new THREE.Color(0xffdb70);

    for (let i = 0; i < this.particleCount && numConnected < this.maxConnections * this.particleCount / 2; i++) {
      const i3 = i * 3;
      
      for (let j = i + 1; j < this.particleCount; j++) {
        const j3 = j * 3;

        const dx = this.particlePositions[i3] - this.particlePositions[j3];
        const dy = this.particlePositions[i3 + 1] - this.particlePositions[j3 + 1];
        const dz = this.particlePositions[i3 + 2] - this.particlePositions[j3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < this.connectionDistance) {
          positions[vertexpos++] = this.particlePositions[i3];
          positions[vertexpos++] = this.particlePositions[i3 + 1];
          positions[vertexpos++] = this.particlePositions[i3 + 2];

          positions[vertexpos++] = this.particlePositions[j3];
          positions[vertexpos++] = this.particlePositions[j3 + 1];
          positions[vertexpos++] = this.particlePositions[j3 + 2];

          const alpha = 1.0 - (dist / this.connectionDistance);
          colors[colorpos++] = connectionColor.r * alpha;
          colors[colorpos++] = connectionColor.g * alpha;
          colors[colorpos++] = connectionColor.b * alpha;

          colors[colorpos++] = connectionColor.r * alpha;
          colors[colorpos++] = connectionColor.g * alpha;
          colors[colorpos++] = connectionColor.b * alpha;

          numConnected++;
        }
      }
    }

    this.lines.geometry.setDrawRange(0, numConnected * 2);
    this.lines.geometry.attributes.position.needsUpdate = true;
    this.lines.geometry.attributes.color.needsUpdate = true;
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    this.time += 0.01;

    if (this.particles) {
      // Update particle positions
      const positions = this.particles.geometry.attributes.position.array as Float32Array;

      // Map mouse to world coordinates
      const mouseWorld = new THREE.Vector3(this.mouse.x, this.mouse.y, 0);
      mouseWorld.unproject(this.camera);
      const mouseDirection = mouseWorld.sub(this.camera.position).normalize();
      const distance = -this.camera.position.z / mouseDirection.z;
      const mousePos = this.camera.position.clone().add(mouseDirection.multiplyScalar(distance));

      for (let i = 0; i < this.particleCount; i++) {
        const i3 = i * 3;

        // Apply velocity damping (friction)
        this.particleVelocities[i3] *= this.velocityDamping;
        this.particleVelocities[i3 + 1] *= this.velocityDamping;
        this.particleVelocities[i3 + 2] *= this.velocityDamping;

        // Update positions with velocity
        this.particlePositions[i3] += this.particleVelocities[i3];
        this.particlePositions[i3 + 1] += this.particleVelocities[i3 + 1];
        this.particlePositions[i3 + 2] += this.particleVelocities[i3 + 2];

        // Add subtle wave effect
        this.particlePositions[i3 + 1] += Math.sin(this.time + i * 0.1) * 0.0005;

        // Mouse wake effect (repulsion)
        const wakeInfluence = 0.005;
        const wakeRadius = 1.5;
        
        const dx = this.particlePositions[i3] - mousePos.x;
        const dy = this.particlePositions[i3 + 1] - mousePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < wakeRadius) {
          const force = (wakeRadius - dist) / wakeRadius;
          const angle = Math.atan2(dy, dx);
          
          // Push particles away from the cursor
          this.particleVelocities[i3] += Math.cos(angle) * force * wakeInfluence;
          this.particleVelocities[i3 + 1] += Math.sin(angle) * force * wakeInfluence;
        }

        // Boundary check - wrap around
        if (Math.abs(this.particlePositions[i3]) > 10) {
          this.particlePositions[i3] *= -1;
        }
        if (Math.abs(this.particlePositions[i3 + 1]) > 10) {
          this.particlePositions[i3 + 1] *= -1;
        }
        if (Math.abs(this.particlePositions[i3 + 2]) > 10) {
          this.particlePositions[i3 + 2] *= -1;
        }

        // Update positions
        positions[i3] = this.particlePositions[i3];
        positions[i3 + 1] = this.particlePositions[i3 + 1];
        positions[i3 + 2] = this.particlePositions[i3 + 2];
      }

      this.particles.geometry.attributes.position.needsUpdate = true;

      // Slow rotation
      this.particles.rotation.y += 0.0001;
      this.particles.rotation.x = Math.sin(this.time * 0.05) * 0.02;
    }

    // Update connections between nearby particles
    this.updateConnections();

    // Camera movement based on mouse
    this.mouseTarget.x = this.mouse.x * 0.2;
    this.mouseTarget.y = this.mouse.y * 0.2;
    
    this.camera.position.x += (this.mouseTarget.x - this.camera.position.x) * 0.02;
    this.camera.position.y += (this.mouseTarget.y - this.camera.position.y) * 0.02;
    this.camera.lookAt(this.scene.position);

    this.renderer.render(this.scene, this.camera);
  }
}

import { useEffect, useRef } from 'react';

const G = 820;
const SOFTENING = 22;
const FIXED_STEP = 1 / 120;
const MAX_STEPS = 5;
const TRAIL_LIFETIME_MS = 6500;
const TRAIL_SAMPLE_MS = 70;

function seededRandom(seed = 47381) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createSystem(width, height) {
  const compact = width < 720;
  const count = compact ? 22 : 46;
  const random = seededRandom(Math.round(width * 13 + height * 7));
  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const vx = new Float32Array(count);
  const vy = new Float32Array(count);
  const ax = new Float32Array(count);
  const ay = new Float32Array(count);
  const mass = new Float32Array(count);
  const radius = new Float32Array(count);
  const hue = new Uint8Array(count);
  const history = Array.from({ length: count }, () => []);
  const centerX = width / 2;
  const centerY = height / 2;
  const totalPrimaryMass = 132;
  const primarySeparation = Math.min(width, height) * (compact ? 0.16 : 0.2);

  mass[0] = 78;
  mass[1] = 54;
  radius[0] = compact ? 2.6 : 3.5;
  radius[1] = compact ? 2.2 : 3;
  hue[0] = 0;
  hue[1] = 1;

  const leftOffset = primarySeparation * (mass[1] / totalPrimaryMass);
  const rightOffset = primarySeparation * (mass[0] / totalPrimaryMass);
  const angularSpeed = Math.sqrt((G * totalPrimaryMass) / primarySeparation ** 3);
  x[0] = centerX - leftOffset;
  y[0] = centerY;
  x[1] = centerX + rightOffset;
  y[1] = centerY;
  vy[0] = -angularSpeed * leftOffset;
  vy[1] = angularSpeed * rightOffset;

  const minOrbit = Math.max(primarySeparation * 0.8, compact ? 72 : 110);
  const maxOrbit = Math.max(minOrbit + 50, Math.min(width, height) * (compact ? 0.54 : 0.62));

  for (let i = 2; i < count; i += 1) {
    const angle = random() * Math.PI * 2;
    const orbit = minOrbit + (maxOrbit - minOrbit) * Math.sqrt(random());
    const flatten = 0.72 + random() * 0.25;
    const direction = random() < 0.1 ? -1 : 1;
    const speed = Math.sqrt((G * totalPrimaryMass) / orbit) * (0.86 + random() * 0.24);

    x[i] = centerX + Math.cos(angle) * orbit;
    y[i] = centerY + Math.sin(angle) * orbit * flatten;
    vx[i] = -Math.sin(angle) * speed * direction + (random() - 0.5) * 2.5;
    vy[i] = Math.cos(angle) * speed * direction * flatten + (random() - 0.5) * 2.5;
    mass[i] = 0.45 + random() * 1.8;
    radius[i] = compact ? 0.75 + random() * 0.7 : 0.9 + random() * 1.05;
    hue[i] = 2 + Math.floor(random() * 3);
  }

  let totalMass = 0;
  let momentumX = 0;
  let momentumY = 0;
  for (let i = 0; i < count; i += 1) {
    totalMass += mass[i];
    momentumX += vx[i] * mass[i];
    momentumY += vy[i] * mass[i];
  }
  for (let i = 0; i < count; i += 1) {
    vx[i] -= momentumX / totalMass;
    vy[i] -= momentumY / totalMass;
  }

  return { count, x, y, vx, vy, ax, ay, mass, radius, hue, history, random };
}

function NBodyBackground({ theme }) {
  const canvasRef = useRef(null);
  const themeRef = useRef(theme);
  const redrawRef = useRef(true);

  useEffect(() => {
    themeRef.current = theme;
    redrawRef.current = true;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { alpha: false });
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(pointer: fine)');
    const lightPalette = ['#315f68', '#4d6f7e', '#42675c', '#596584', '#56767d'];
    const darkPalette = ['#91bfc5', '#9bb6c5', '#91b5a7', '#a5acd0', '#a9c3c7'];
    const pointer = { active: false, x: 0, y: 0 };
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = 1;
    let system;
    let frameId;
    let previousTime = performance.now();
    let accumulator = 0;
    let visible = !document.hidden;
    let staticFrameDrawn = false;

    const fillBackground = (alpha = 1) => {
      context.globalAlpha = alpha;
      context.fillStyle = themeRef.current === 'dark' ? '#10191d' : '#eef2f0';
      context.fillRect(0, 0, width, height);
      context.globalAlpha = 1;
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, width < 720 ? 1.35 : 1.75);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      system = createSystem(width, height);
      fillBackground();
      staticFrameDrawn = false;
    };

    const calculateAccelerations = () => {
      const { count, x, y, ax, ay, mass } = system;
      ax.fill(0);
      ay.fill(0);

      for (let i = 0; i < count - 1; i += 1) {
        for (let j = i + 1; j < count; j += 1) {
          const dx = x[j] - x[i];
          const dy = y[j] - y[i];
          const distanceSquared = dx * dx + dy * dy + SOFTENING * SOFTENING;
          const force = G / (distanceSquared * Math.sqrt(distanceSquared));
          const forceX = dx * force;
          const forceY = dy * force;

          ax[i] += forceX * mass[j];
          ay[i] += forceY * mass[j];
          ax[j] -= forceX * mass[i];
          ay[j] -= forceY * mass[i];
        }
      }

      if (pointer.active && finePointer.matches) {
        for (let i = 2; i < count; i += 1) {
          const dx = pointer.x - x[i];
          const dy = pointer.y - y[i];
          const distanceSquared = dx * dx + dy * dy + 3600;
          const force = (G * 8) / (distanceSquared * Math.sqrt(distanceSquared));
          ax[i] += dx * force;
          ay[i] += dy * force;
        }
      }
    };

    const respawnEscapedBodies = () => {
      const { count, x, y, vx, vy, mass, radius, hue, history, random } = system;
      const centerX = width / 2;
      const centerY = height / 2;
      const escapeRadius = Math.max(width, height) * 0.82;
      const respawnRadius = Math.min(width, height) * 0.54;

      for (let i = 2; i < count; i += 1) {
        const dx = x[i] - centerX;
        const dy = y[i] - centerY;
        if (dx * dx + dy * dy < escapeRadius * escapeRadius) continue;

        const angle = random() * Math.PI * 2;
        const speed = Math.sqrt((G * 132) / respawnRadius) * (0.9 + random() * 0.16);
        x[i] = centerX + Math.cos(angle) * respawnRadius;
        y[i] = centerY + Math.sin(angle) * respawnRadius * 0.82;
        vx[i] = -Math.sin(angle) * speed;
        vy[i] = Math.cos(angle) * speed * 0.82;
        mass[i] = 0.45 + random() * 1.8;
        radius[i] = width < 720 ? 0.75 + random() * 0.7 : 0.9 + random() * 1.05;
        hue[i] = 2 + Math.floor(random() * 3);
        history[i].length = 0;
      }
    };

    const advance = (step) => {
      const { count, x, y, vx, vy, ax, ay } = system;
      calculateAccelerations();

      for (let i = 0; i < count; i += 1) {
        vx[i] += ax[i] * step * 0.5;
        vy[i] += ay[i] * step * 0.5;
        x[i] += vx[i] * step;
        y[i] += vy[i] * step;
      }

      calculateAccelerations();
      for (let i = 0; i < count; i += 1) {
        vx[i] += ax[i] * step * 0.5;
        vy[i] += ay[i] * step * 0.5;
      }
      respawnEscapedBodies();
    };

    const draw = (time, recordTrail = true) => {
      const { count, x, y, radius, hue, history } = system;
      const isDark = themeRef.current === 'dark';
      const palette = isDark ? darkPalette : lightPalette;
      fillBackground(1);
      const compact = width < 720;
      const quietHalfWidth = Math.min(430, width * 0.43);

      context.lineCap = 'round';
      context.lineJoin = 'round';

      for (let i = 0; i < count; i += 1) {
        const trail = history[i];
        const lastPoint = trail[trail.length - 1];

        while (trail.length && time - trail[0].time > TRAIL_LIFETIME_MS) {
          trail.shift();
        }

        if (recordTrail && (!lastPoint || time - lastPoint.time >= TRAIL_SAMPLE_MS)) {
          trail.push({ x: x[i], y: y[i], time });
        }

        const distanceFromReadingColumn = Math.abs(x[i] - width / 2);
        const edgeFactor = Math.min(1, distanceFromReadingColumn / quietHalfWidth);
        const quietFactor = compact ? 0.34 : 0.38 + edgeFactor * edgeFactor * 0.62;
        const baseAlpha = i < 2
          ? (isDark ? 0.78 : 0.88)
          : (isDark ? 0.4 : 0.52) + (i % 5) * 0.05;
        const alpha = baseAlpha * quietFactor;
        const bodyRadius = radius[i];

        if (trail.length > 1) {
          for (let point = 1; point < trail.length; point += 1) {
            const start = trail[point - 1];
            const end = trail[point];
            const remaining = 1 - (time - end.time) / TRAIL_LIFETIME_MS;
            if (remaining <= 0) continue;

            const fade = remaining * remaining;
            const trailVisibility = compact ? 0.46 : 0.55 + edgeFactor * edgeFactor * 0.45;
            const trailAlpha = (isDark ? 0.38 : 0.5) * trailVisibility * fade;

            context.beginPath();
            context.moveTo(start.x, start.y);
            context.lineTo(end.x, end.y);
            context.strokeStyle = palette[hue[i]];
            context.globalAlpha = trailAlpha;
            context.lineWidth = Math.max(isDark ? 0.95 : 1.1, bodyRadius * 0.58);
            context.stroke();
          }
        }

        context.beginPath();
        context.fillStyle = palette[hue[i]];
        context.globalAlpha = alpha * 0.2;
        context.arc(x[i], y[i], bodyRadius * 3.4, 0, Math.PI * 2);
        context.fill();

        context.beginPath();
        context.globalAlpha = alpha;
        context.arc(x[i], y[i], bodyRadius, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    };

    const animate = (time) => {
      const delta = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      const shouldPause = reducedMotion.matches || !visible;

      if (!shouldPause) {
        staticFrameDrawn = false;
        accumulator += delta;
        let steps = 0;
        while (accumulator >= FIXED_STEP && steps < MAX_STEPS) {
          advance(FIXED_STEP);
          accumulator -= FIXED_STEP;
          steps += 1;
        }
        if (steps === MAX_STEPS) accumulator = 0;
        draw(time, true);
      } else if (visible) {
        const hasActiveTrails = system.history.some((trail) => trail.length > 1);
        if (!staticFrameDrawn || redrawRef.current || hasActiveTrails) {
          draw(time, false);
        }
        staticFrameDrawn = !hasActiveTrails;
      }

      redrawRef.current = false;

      frameId = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event) => {
      pointer.active = true;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };
    const handlePointerLeave = () => {
      pointer.active = false;
    };
    const handleVisibility = () => {
      visible = !document.hidden;
      previousTime = performance.now();
      staticFrameDrawn = false;
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', handlePointerLeave);
    document.addEventListener('visibilitychange', handleVisibility);
    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener('mouseleave', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="nbody-canvas" aria-hidden="true" />;
}

export default NBodyBackground;

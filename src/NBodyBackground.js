import { useEffect, useRef } from 'react';

const G = 820;
const SOFTENING = 22;
const FIXED_STEP = 1 / 120;
const MAX_STEPS = 5;
const TRAIL_LIFETIME_MS = 6500;
const TRAIL_SAMPLE_MS = 70;
const DESKTOP_USER_BODY_LIMIT = 12;
const MOBILE_USER_BODY_LIMIT = 6;
const TAP_MOVE_TOLERANCE = 12;
const TAP_DURATION_MS = 500;

function seededRandom(seed = 47381) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createSystem(width, height) {
  const compact = width < 720;
  const baseCount = compact ? 22 : 46;
  const userBodyLimit = compact ? MOBILE_USER_BODY_LIMIT : DESKTOP_USER_BODY_LIMIT;
  const capacity = baseCount + userBodyLimit;
  const random = seededRandom(Math.round(width * 13 + height * 7));
  const x = new Float32Array(capacity);
  const y = new Float32Array(capacity);
  const vx = new Float32Array(capacity);
  const vy = new Float32Array(capacity);
  const ax = new Float32Array(capacity);
  const ay = new Float32Array(capacity);
  const mass = new Float32Array(capacity);
  const radius = new Float32Array(capacity);
  const hue = new Uint8Array(capacity);
  const userCreated = new Uint8Array(capacity);
  const history = Array.from({ length: capacity }, () => []);
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

  for (let i = 2; i < baseCount; i += 1) {
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
  for (let i = 0; i < baseCount; i += 1) {
    totalMass += mass[i];
    momentumX += vx[i] * mass[i];
    momentumY += vy[i] * mass[i];
  }
  for (let i = 0; i < baseCount; i += 1) {
    vx[i] -= momentumX / totalMass;
    vy[i] -= momentumY / totalMass;
  }

  return {
    count: baseCount,
    baseCount,
    capacity,
    nextUserIndex: baseCount,
    x,
    y,
    vx,
    vy,
    ax,
    ay,
    mass,
    radius,
    hue,
    userCreated,
    history,
    random,
  };
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
    let pendingDrop = null;
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

    const dropBody = (dropX, dropY) => {
      const {
        baseCount,
        capacity,
        x,
        y,
        vx,
        vy,
        ax,
        ay,
        mass,
        radius,
        hue,
        userCreated,
        history,
        random,
      } = system;
      const index = system.count < capacity ? system.count : system.nextUserIndex;
      const centerX = width / 2;
      const centerY = height / 2;
      const dx = dropX - centerX;
      const dy = dropY - centerY;
      const distance = Math.max(Math.hypot(dx, dy), SOFTENING * 2);
      const orbitalSpeed = Math.sqrt((G * 132) / distance) * (0.72 + random() * 0.2);
      const direction = random() < 0.14 ? -1 : 1;

      x[index] = dropX;
      y[index] = dropY;
      vx[index] = (-dy / distance) * orbitalSpeed * direction + (random() - 0.5) * 2;
      vy[index] = (dx / distance) * orbitalSpeed * direction + (random() - 0.5) * 2;
      ax[index] = 0;
      ay[index] = 0;
      mass[index] = 1.3 + random() * 1.2;
      radius[index] = width < 720 ? 1.45 : 1.8;
      hue[index] = Math.floor(random() * 5);
      userCreated[index] = 1;
      history[index].length = 0;

      if (system.count < capacity) system.count += 1;
      system.nextUserIndex = baseCount + ((index - baseCount + 1) % (capacity - baseCount));
      staticFrameDrawn = false;
      redrawRef.current = true;
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
      const { count, x, y, radius, hue, userCreated, history } = system;
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
        const isUserBody = userCreated[i] === 1;

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
        context.globalAlpha = alpha * (isUserBody ? 0.3 : 0.2);
        context.arc(x[i], y[i], bodyRadius * (isUserBody ? 4.2 : 3.4), 0, Math.PI * 2);
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
    const handlePointerDown = (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      const target = event.target instanceof Element ? event.target : null;
      const interactive = target?.closest(
        'a, button, input, textarea, select, summary, label, [role="button"], [contenteditable="true"]',
      );

      pendingDrop = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        interactive: Boolean(interactive),
      };
    };
    const handlePointerUp = (event) => {
      if (!pendingDrop || pendingDrop.pointerId !== event.pointerId) return;
      const movement = Math.hypot(event.clientX - pendingDrop.x, event.clientY - pendingDrop.y);
      const scrollMovement = Math.hypot(
        window.scrollX - pendingDrop.scrollX,
        window.scrollY - pendingDrop.scrollY,
      );
      const elapsed = performance.now() - pendingDrop.time;
      const shouldDrop =
        !pendingDrop.interactive &&
        movement <= TAP_MOVE_TOLERANCE &&
        scrollMovement <= TAP_MOVE_TOLERANCE &&
        elapsed <= TAP_DURATION_MS;

      if (shouldDrop) dropBody(event.clientX, event.clientY);
      pendingDrop = null;
    };
    const handlePointerCancel = () => {
      pendingDrop = null;
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
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerCancel, { passive: true });
    document.documentElement.addEventListener('mouseleave', handlePointerLeave);
    document.addEventListener('visibilitychange', handleVisibility);
    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      document.documentElement.removeEventListener('mouseleave', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="nbody-canvas" aria-hidden="true" />;
}

export default NBodyBackground;

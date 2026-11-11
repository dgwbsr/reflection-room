(() => {
  'use strict';

  const STORAGE_KEY = 'reflection-room:v1';
  const SPEED_OF_SOUND = 343;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const VIEW_W = 1000;
  const VIEW_H = 700;
  const MIN_ROOM = 2;
  const MAX_ROOM = 12;
  const WALL_MARGIN = 0.06;
  const PANEL_THICKNESS = 12;

  const WALLS = [
    { key: 'left', label: 'Left', normal: { x: 1, y: 0 } },
    { key: 'right', label: 'Right', normal: { x: -1, y: 0 } },
    { key: 'front', label: 'Front', normal: { x: 0, y: 1 } },
    { key: 'rear', label: 'Rear', normal: { x: 0, y: -1 } }
  ];

  const DEFAULTS = {
    roomW: 4.2,
    roomD: 3.4,
    source: { x: 1.35, y: 0.65 },
    listener: { x: 2.75, y: 2.55 },
    panelWidth: 0.6,
    walls: { left: true, right: true, front: true, rear: true },
    showPanels: true,
    showGrid: true
  };

  const els = {
    roomW: document.getElementById('roomW'),
    roomD: document.getElementById('roomD'),
    sourceX: document.getElementById('sourceX'),
    sourceY: document.getElementById('sourceY'),
    listenerX: document.getElementById('listenerX'),
    listenerY: document.getElementById('listenerY'),
    panelWidth: document.getElementById('panelWidth'),
    panelWidthOut: document.getElementById('panelWidthOut'),
    wallLeft: document.getElementById('wallLeft'),
    wallRight: document.getElementById('wallRight'),
    wallFront: document.getElementById('wallFront'),
    wallRear: document.getElementById('wallRear'),
    showPanels: document.getElementById('showPanels'),
    showGrid: document.getElementById('showGrid'),
    plan: document.getElementById('plan'),
    stage: document.getElementById('stage'),
    tooltip: document.getElementById('tooltip'),
    resultsBody: document.getElementById('resultsBody'),
    resultsEmpty: document.getElementById('resultsEmpty'),
    tableWrap: document.getElementById('tableWrap'),
    wallCount: document.getElementById('wallCount'),
    warning: document.getElementById('warning'),
    readDirect: document.getElementById('readDirect'),
    readEarliest: document.getElementById('readEarliest'),
    helpBtn: document.getElementById('helpBtn'),
    helpDialog: document.getElementById('helpDialog'),
    helpClose: document.getElementById('helpClose'),
    helpDone: document.getElementById('helpDone'),
    printBtn: document.getElementById('printBtn'),
    exportBtn: document.getElementById('exportBtn'),
    resetBtn: document.getElementById('resetBtn'),
    toast: document.getElementById('toast'),
    live: document.getElementById('live'),
    printMeta: document.getElementById('printMeta')
  };

  let state = loadState();
  let activeWall = null;
  let drag = null;
  let toastTimer = 0;
  let saveTimer = 0;

  init();

  function init() {
    syncInputs();
    bindInputs();
    bindActions();
    bindStage();
    bindTable();
    render();
  }

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }

  function loadState() {
    const defaults = cloneDefaults();
    let raw = null;

    try {
      raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (error) {
      return defaults;
    }

    if (!raw || typeof raw !== 'object') return defaults;

    const roomW = clampNumber(raw.roomW, MIN_ROOM, MAX_ROOM, defaults.roomW);
    const roomD = clampNumber(raw.roomD, MIN_ROOM, MAX_ROOM, defaults.roomD);
    const source = raw.source && typeof raw.source === 'object' ? raw.source : {};
    const listener = raw.listener && typeof raw.listener === 'object' ? raw.listener : {};
    const walls = raw.walls && typeof raw.walls === 'object' ? raw.walls : {};

    return {
      roomW,
      roomD,
      source: {
        x: clampNumber(source.x, WALL_MARGIN, roomW - WALL_MARGIN, defaults.source.x),
        y: clampNumber(source.y, WALL_MARGIN, roomD - WALL_MARGIN, defaults.source.y)
      },
      listener: {
        x: clampNumber(listener.x, WALL_MARGIN, roomW - WALL_MARGIN, defaults.listener.x),
        y: clampNumber(listener.y, WALL_MARGIN, roomD - WALL_MARGIN, defaults.listener.y)
      },
      panelWidth: clampNumber(raw.panelWidth, 0.3, 1.5, defaults.panelWidth),
      walls: {
        left: typeof walls.left === 'boolean' ? walls.left : defaults.walls.left,
        right: typeof walls.right === 'boolean' ? walls.right : defaults.walls.right,
        front: typeof walls.front === 'boolean' ? walls.front : defaults.walls.front,
        rear: typeof walls.rear === 'boolean' ? walls.rear : defaults.walls.rear
      },
      showPanels: typeof raw.showPanels === 'boolean' ? raw.showPanels : defaults.showPanels,
      showGrid: typeof raw.showGrid === 'boolean' ? raw.showGrid : defaults.showGrid
    };
  }

  function saveState() {
    clearTimeout(saveTimer);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // Storage can be unavailable in private or embedded contexts.
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 160);
  }

  function syncInputs() {
    setInputValue(els.roomW, formatInput(state.roomW));
    setInputValue(els.roomD, formatInput(state.roomD));
    setInputValue(els.sourceX, formatInput(state.source.x));
    setInputValue(els.sourceY, formatInput(state.source.y));
    setInputValue(els.listenerX, formatInput(state.listener.x));
    setInputValue(els.listenerY, formatInput(state.listener.y));

    els.sourceX.min = String(WALL_MARGIN);
    els.sourceY.min = String(WALL_MARGIN);
    els.listenerX.min = String(WALL_MARGIN);
    els.listenerY.min = String(WALL_MARGIN);
    els.sourceX.max = String((state.roomW - WALL_MARGIN).toFixed(2));
    els.sourceY.max = String((state.roomD - WALL_MARGIN).toFixed(2));
    els.listenerX.max = String((state.roomW - WALL_MARGIN).toFixed(2));
    els.listenerY.max = String((state.roomD - WALL_MARGIN).toFixed(2));

    els.panelWidth.value = String(Math.round(state.panelWidth * 100));
    els.panelWidthOut.textContent = `${Math.round(state.panelWidth * 100)} cm`;

    els.wallLeft.checked = state.walls.left;
    els.wallRight.checked = state.walls.right;
    els.wallFront.checked = state.walls.front;
    els.wallRear.checked = state.walls.rear;
    els.showPanels.checked = state.showPanels;
    els.showGrid.checked = state.showGrid;
  }

  function bindInputs() {
    bindNumber(els.roomW, (value) => {
      const next = clamp(value, MIN_ROOM, MAX_ROOM);
      if (same(next, state.roomW)) return false;
      state.roomW = next;
      clampPlacements();
      return true;
    });

    bindNumber(els.roomD, (value) => {
      const next = clamp(value, MIN_ROOM, MAX_ROOM);
      if (same(next, state.roomD)) return false;
      state.roomD = next;
      clampPlacements();
      return true;
    });

    bindNumber(els.sourceX, (value) => setPointAxis(state.source, 'x', value, state.roomW));
    bindNumber(els.sourceY, (value) => setPointAxis(state.source, 'y', value, state.roomD));
    bindNumber(els.listenerX, (value) => setPointAxis(state.listener, 'x', value, state.roomW));
    bindNumber(els.listenerY, (value) => setPointAxis(state.listener, 'y', value, state.roomD));

    els.panelWidth.addEventListener('input', () => {
      const cm = clamp(Number(els.panelWidth.value), 30, 150);
      state.panelWidth = cm / 100;
      els.panelWidthOut.textContent = `${Math.round(cm)} cm`;
      render();
    });

    const wallInputs = [
      [els.wallLeft, 'left'],
      [els.wallRight, 'right'],
      [els.wallFront, 'front'],
      [els.wallRear, 'rear']
    ];

    wallInputs.forEach(([input, key]) => {
      input.addEventListener('change', () => {
        state.walls[key] = input.checked;
        render();
      });
    });

    els.showPanels.addEventListener('change', () => {
      state.showPanels = els.showPanels.checked;
      render();
    });

    els.showGrid.addEventListener('change', () => {
      state.showGrid = els.showGrid.checked;
      render();
    });
  }

  function bindNumber(input, apply) {
    input.addEventListener('input', () => {
      const value = Number(input.value);
      if (!Number.isFinite(value)) return;
      if (apply(value)) render();
    });

    input.addEventListener('change', () => {
      const value = Number(input.value);
      if (Number.isFinite(value)) apply(value);
      syncInputs();
      render();
    });
  }

  function setPointAxis(point, axis, value, roomSize) {
    const next = clamp(value, WALL_MARGIN, roomSize - WALL_MARGIN);
    if (same(next, point[axis])) return false;
    point[axis] = next;
    return true;
  }

  function clampPlacements() {
    state.source.x = clamp(state.source.x, WALL_MARGIN, state.roomW - WALL_MARGIN);
    state.source.y = clamp(state.source.y, WALL_MARGIN, state.roomD - WALL_MARGIN);
    state.listener.x = clamp(state.listener.x, WALL_MARGIN, state.roomW - WALL_MARGIN);
    state.listener.y = clamp(state.listener.y, WALL_MARGIN, state.roomD - WALL_MARGIN);
  }

  function setInputValue(input, value) {
    if (document.activeElement !== input) input.value = value;
  }

  function formatInput(value) {
    return Number(value.toFixed(2)).toString();
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? clamp(number, min, max) : fallback;
  }

  function same(a, b) {
    return Math.abs(a - b) < 1e-9;
  }

  function computeResults() {
    const direct = distance(state.source, state.listener);
    const reflections = [];

    WALLS.forEach((wall) => {
      if (!state.walls[wall.key]) return;

      const mirror = mirrorSource(wall.key);
      const point = reflectionPoint(wall.key, mirror, state.listener);
      const pathLength = distance(mirror, state.listener);
      const delayMs = Math.max(0, ((pathLength - direct) / SPEED_OF_SOUND) * 1000);
      const angleDeg = incidenceAngle(wall.key, point);
      const panel = panelFor(wall.key, point);
      const alongY = wall.key === 'left' || wall.key === 'right';

      reflections.push({
        key: wall.key,
        label: wall.label,
        point,
        pathLength,
        delayMs,
        angleDeg,
        panel,
        position: alongY ? point.y : point.x,
        positionLabel: alongY ? 'from front' : 'from left'
      });
    });

    const earliest = reflections.reduce((best, reflection) => {
      if (!best || reflection.delayMs < best.delayMs) return reflection;
      return best;
    }, null);

    return { direct, reflections, earliest };
  }

  function mirrorSource(wallKey) {
    const { x, y } = state.source;

    if (wallKey === 'left') return { x: -x, y };
    if (wallKey === 'right') return { x: state.roomW * 2 - x, y };
    if (wallKey === 'front') return { x, y: -y };
    return { x, y: state.roomD * 2 - y };
  }

  function reflectionPoint(wallKey, mirror, listener) {
    let t = 0;

    if (wallKey === 'left') t = (0 - mirror.x) / (listener.x - mirror.x);
    else if (wallKey === 'right') t = (state.roomW - mirror.x) / (listener.x - mirror.x);
    else if (wallKey === 'front') t = (0 - mirror.y) / (listener.y - mirror.y);
    else t = (state.roomD - mirror.y) / (listener.y - mirror.y);

    return {
      x: mirror.x + t * (listener.x - mirror.x),
      y: mirror.y + t * (listener.y - mirror.y)
    };
  }

  function panelFor(wallKey, point) {
    const alongY = wallKey === 'left' || wallKey === 'right';
    const wallLength = alongY ? state.roomD : state.roomW;
    const coordinate = alongY ? point.y : point.x;
    const width = Math.min(state.panelWidth, wallLength);
    const idealStart = coordinate - width / 2;
    const start = clamp(idealStart, 0, wallLength - width);
    const shift = start - idealStart;

    return {
      start,
      end: start + width,
      width,
      shifted: Math.abs(shift) > 1e-6 || width < state.panelWidth - 1e-9,
      shift
    };
  }

  function incidenceAngle(wallKey, point) {
    const wall = WALLS.find((item) => item.key === wallKey);
    const vx = state.source.x - point.x;
    const vy = state.source.y - point.y;
    const length = Math.hypot(vx, vy);

    if (!length) return 0;

    const dot = (vx * wall.normal.x + vy * wall.normal.y) / length;
    return (Math.acos(clamp(dot, -1, 1)) * 180) / Math.PI;
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function render(options = {}) {
    const results = computeResults();

    if (activeWall && !results.reflections.some((reflection) => reflection.key === activeWall)) {
      activeWall = null;
    }

    drawPlan(results);
    updateReadout(results);
    updateTable(results);
    updateWarnings(results);
    updatePrintMeta();
    scheduleSave();

    if (options.focusMarker) {
      requestAnimationFrame(() => {
        const marker = els.plan.querySelector(`[data-marker="${options.focusMarker}"]`);
        if (marker) marker.focus({ preventScroll: true });
      });
    }
  }

  function updateReadout(results) {
    els.readDirect.textContent = formatM(results.direct);
    els.readEarliest.textContent = results.earliest
      ? `${formatM(results.earliest.pathLength)} · ${formatDelay(results.earliest.delayMs)}`
      : '—';
  }

  function updateTable(results) {
    const count = results.reflections.length;
    const hasWalls = count > 0;

    els.wallCount.textContent = `${count} ${count === 1 ? 'wall' : 'walls'}`;
    els.tableWrap.hidden = !hasWalls;
    els.resultsEmpty.hidden = hasWalls;
    els.resultsBody.replaceChildren();

    if (!hasWalls) return;

    results.reflections.forEach((reflection) => {
      const row = document.createElement('tr');
      row.dataset.wall = reflection.key;
      row.tabIndex = 0;
      row.setAttribute(
        'aria-label',
        `${reflection.label} wall reflection. Position ${formatM(reflection.position)} ${reflection.positionLabel}. Path ${formatM(reflection.pathLength)}. Delay ${formatDelay(reflection.delayMs)}. Angle ${formatAngle(reflection.angleDeg)} from the wall normal.`
      );

      if (activeWall === reflection.key) row.classList.add('is-active');

      const wallCell = document.createElement('td');
      const wallWrap = document.createElement('span');
      const glyph = document.createElement('span');
      const name = document.createElement('span');
      wallWrap.className = 'wall-cell';
      glyph.className = `wall-glyph wall-glyph-${reflection.key}`;
      glyph.setAttribute('aria-hidden', 'true');
      name.textContent = reflection.label;
      wallWrap.append(glyph, name);

      if (reflection.panel.shifted) {
        const warn = document.createElement('span');
        warn.className = 'row-warn';
        warn.textContent = '!';
        warn.title = 'Panel zone shifted to fit inside the room';
        warn.setAttribute('aria-label', 'Panel zone shifted');
        wallWrap.append(warn);
      }

      wallCell.append(wallWrap);

      const positionCell = document.createElement('td');
      const positionValue = document.createElement('span');
      const positionSub = document.createElement('span');
      positionValue.className = 'num';
      positionValue.textContent = formatM(reflection.position);
      positionSub.className = 'sub';
      positionSub.textContent = reflection.positionLabel;
      positionCell.append(positionValue, positionSub);

      const pathCell = document.createElement('td');
      const pathValue = document.createElement('span');
      pathValue.className = 'num';
      pathValue.textContent = formatM(reflection.pathLength);
      pathCell.append(pathValue);

      const delayCell = document.createElement('td');
      const delayValue = document.createElement('span');
      delayValue.className = 'num';
      delayValue.textContent = formatDelay(reflection.delayMs);
      delayCell.append(delayValue);

      const angleCell = document.createElement('td');
      const angleValue = document.createElement('span');
      angleValue.className = 'num';
      angleValue.textContent = formatAngle(reflection.angleDeg);
      angleCell.append(angleValue);

      row.append(wallCell, positionCell, pathCell, delayCell, angleCell);
      els.resultsBody.append(row);
    });
  }

  function updateWarnings(results) {
    const shifted = results.reflections.filter((reflection) => reflection.panel.shifted);

    els.warning.hidden = shifted.length === 0;
    els.warning.replaceChildren();

    if (!shifted.length) return;

    const paragraph = document.createElement('p');

    if (shifted.length === 1) {
      const reflection = shifted[0];
      paragraph.textContent = `The ${reflection.label.toLowerCase()} wall panel zone was shifted ${formatCm(reflection.panel.shift)} to stay inside the corner.`;
    } else {
      const names = shifted.map((reflection) => reflection.label.toLowerCase()).join(', ');
      paragraph.textContent = `Panel zones on the ${names} walls were shifted to stay inside the room. Check the marked corners before installing.`;
    }

    els.warning.append(paragraph);
  }

  function updatePrintMeta() {
    const date = new Date().toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    els.printMeta.textContent = `${state.roomW.toFixed(2)} × ${state.roomD.toFixed(2)} m · ${date}`;
  }

  function planDescription(results) {
    const parts = [
      `Top-down room ${state.roomW.toFixed(2)} by ${state.roomD.toFixed(2)} metres.`,
      `Direct path ${results.direct.toFixed(2)} metres.`
    ];

    if (results.earliest) {
      parts.push(
        `Earliest reflection on the ${results.earliest.label.toLowerCase()} wall, ${results.earliest.pathLength.toFixed(2)} metres, arriving ${results.earliest.delayMs.toFixed(1)} milliseconds after the direct sound.`
      );
    } else {
      parts.push('No walls are selected.');
    }

    return parts.join(' ');
  }

  function setActiveWall(wall) {
    if (activeWall === wall) return;
    activeWall = wall;
    applyActiveWall();
  }

  function applyActiveWall() {
    els.plan.querySelectorAll('.wall-point').forEach((point) => {
      point.classList.toggle('is-active', point.dataset.wall === activeWall);
    });

    els.plan.querySelectorAll('.path-wall').forEach((path) => {
      const active = path.dataset.wall === activeWall;
      path.setAttribute('stroke-width', active ? '2.4' : '1.4');
      path.setAttribute('stroke-opacity', active ? '0.92' : '0.4');
    });

    els.plan.querySelectorAll('.panel-zone').forEach((zone) => {
      const active = zone.dataset.wall === activeWall;
      zone.setAttribute('stroke-width', active ? '2' : '1');
      zone.setAttribute('stroke-opacity', active ? '1' : '0.75');
    });

    els.resultsBody.querySelectorAll('tr[data-wall]').forEach((row) => {
      row.classList.toggle('is-active', row.dataset.wall === activeWall);
    });
  }

  function formatM(value) {
    return `${value.toFixed(2)} m`;
  }

  function formatDelay(value) {
    return `+${value.toFixed(1)} ms`;
  }

  function formatAngle(value) {
    return `${Math.round(value)}°`;
  }

  function formatCm(value) {
    return `${Math.round(Math.abs(value) * 100)} cm`;
  }

  function el(name, attrs = {}, text = null) {
    const node = document.createElementNS(SVG_NS, name);

    Object.entries(attrs).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== false) {
        node.setAttribute(key, String(value));
      }
    });

    if (text !== null) node.textContent = text;
    return node;
  }

  function getPlot() {
    const margin = { left: 100, right: 106, top: 86, bottom: 96 };
    const availableW = VIEW_W - margin.left - margin.right;
    const availableH = VIEW_H - margin.top - margin.bottom;
    const scale = Math.min(availableW / state.roomW, availableH / state.roomD);
    const w = state.roomW * scale;
    const h = state.roomD * scale;

    return {
      x: margin.left + (availableW - w) / 2,
      y: margin.top + (availableH - h) / 2,
      w,
      h,
      scale
    };
  }

  function planRenderScale() {
    const rect = els.plan.getBoundingClientRect();

    if (!rect.width || !rect.height) return 1;
    return Math.max(0.001, Math.min(rect.width / VIEW_W, rect.height / VIEW_H));
  }

  function planTextScale() {
    return clamp(1 / planRenderScale(), 1, 2.4);
  }

  function drawPlan(results) {
    const plot = getPlot();
    hideTooltip();
    els.plan.replaceChildren();
    els.plan.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);
    els.plan.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    els.plan.append(
      el('title', { id: 'planTitle' }, 'Room plan with first reflection points'),
      el('desc', { id: 'planDesc' }, planDescription(results))
    );

    const defs = el('defs');
    defs.append(panelPattern());
    els.plan.append(defs);

    els.plan.append(el('rect', { x: 0, y: 0, width: VIEW_W, height: VIEW_H, fill: 'oklch(1 0 0)' }));
    els.plan.append(
      el('rect', {
        x: plot.x,
        y: plot.y,
        width: plot.w,
        height: plot.h,
        rx: 2,
        fill: 'oklch(0.986 0.004 39)'
      })
    );

    if (state.showGrid) els.plan.append(gridGroup(plot));

    els.plan.append(dimensionsGroup(plot));

    if (state.showPanels) {
      results.reflections.forEach((reflection) => {
        els.plan.append(panelZone(reflection, plot));
      });
    }

    els.plan.append(directPath(plot));

    results.reflections.forEach((reflection) => {
      els.plan.append(reflectionPath(reflection, plot));
    });

    els.plan.append(
      el('rect', {
        x: plot.x,
        y: plot.y,
        width: plot.w,
        height: plot.h,
        rx: 2,
        fill: 'none',
        stroke: 'oklch(0.225 0.016 39)',
        'stroke-width': 2.5
      })
    );

    els.plan.append(wallLabels(plot));

    results.reflections.forEach((reflection) => {
      els.plan.append(reflectionPointEl(reflection, plot));
    });

    els.plan.append(sourceMarker(plot));
    els.plan.append(listenerMarker(plot));
  }

  function panelPattern() {
    const pattern = el('pattern', {
      id: 'panelHatch',
      width: 8,
      height: 8,
      patternUnits: 'userSpaceOnUse',
      patternTransform: 'rotate(45)'
    });

    pattern.append(el('rect', { width: 8, height: 8, fill: 'oklch(0.965 0.025 39)' }));
    pattern.append(
      el('line', {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 8,
        stroke: 'oklch(0.62 0.19 38.6)',
        'stroke-width': 2,
        'stroke-opacity': 0.35
      })
    );

    return pattern;
  }

  function gridGroup(plot) {
    const group = el('g', { 'aria-hidden': 'true' });
    const step = 0.5;
    const ink = 'oklch(0.905 0.008 39)';

    for (let value = step; value < state.roomW - 1e-6; value += step) {
      const x = plot.x + value * plot.scale;
      group.append(
        el('line', {
          x1: x,
          y1: plot.y,
          x2: x,
          y2: plot.y + plot.h,
          stroke: ink,
          'stroke-width': 1
        })
      );
    }

    for (let value = step; value < state.roomD - 1e-6; value += step) {
      const y = plot.y + value * plot.scale;
      group.append(
        el('line', {
          x1: plot.x,
          y1: y,
          x2: plot.x + plot.w,
          y2: y,
          stroke: ink,
          'stroke-width': 1
        })
      );
    }

    return group;
  }

  function dimensionsGroup(plot) {
    const group = el('g', { 'aria-hidden': 'true' });
    const ink = 'oklch(0.56 0.012 39)';
    const textFill = 'oklch(0.43 0.014 39)';
    const textScale = planTextScale();
    const widthY = plot.y + plot.h + 60;
    const depthX = plot.x + plot.w + 58;

    group.append(
      el('line', { x1: plot.x, y1: widthY, x2: plot.x + plot.w, y2: widthY, stroke: ink, 'stroke-width': 1 }),
      el('line', {
        x1: plot.x,
        y1: plot.y + plot.h + 5,
        x2: plot.x,
        y2: widthY + 6,
        stroke: ink,
        'stroke-width': 1
      }),
      el('line', {
        x1: plot.x + plot.w,
        y1: plot.y + plot.h + 5,
        x2: plot.x + plot.w,
        y2: widthY + 6,
        stroke: ink,
        'stroke-width': 1
      }),
      el('line', { x1: plot.x, y1: widthY - 4, x2: plot.x, y2: widthY + 4, stroke: ink, 'stroke-width': 1 }),
      el('line', {
        x1: plot.x + plot.w,
        y1: widthY - 4,
        x2: plot.x + plot.w,
        y2: widthY + 4,
        stroke: ink,
        'stroke-width': 1
      }),
      el(
        'text',
        {
          x: plot.x + plot.w / 2,
          y: widthY - 8,
          'text-anchor': 'middle',
          'font-family': 'Cascadia Mono, Consolas, monospace',
          'font-size': 11 * textScale,
          fill: textFill
        },
        `${state.roomW.toFixed(2)} m`
      )
    );

    group.append(
      el('line', { x1: depthX, y1: plot.y, x2: depthX, y2: plot.y + plot.h, stroke: ink, 'stroke-width': 1 }),
      el('line', {
        x1: plot.x + plot.w + 5,
        y1: plot.y,
        x2: depthX + 6,
        y2: plot.y,
        stroke: ink,
        'stroke-width': 1
      }),
      el('line', {
        x1: plot.x + plot.w + 5,
        y1: plot.y + plot.h,
        x2: depthX + 6,
        y2: plot.y + plot.h,
        stroke: ink,
        'stroke-width': 1
      }),
      el('line', { x1: depthX - 4, y1: plot.y, x2: depthX + 4, y2: plot.y, stroke: ink, 'stroke-width': 1 }),
      el('line', {
        x1: depthX - 4,
        y1: plot.y + plot.h,
        x2: depthX + 4,
        y2: plot.y + plot.h,
        stroke: ink,
        'stroke-width': 1
      }),
      el(
        'text',
        {
          x: depthX + 17,
          y: plot.y + plot.h / 2,
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          transform: `rotate(-90 ${depthX + 17} ${plot.y + plot.h / 2})`,
          'font-family': 'Cascadia Mono, Consolas, monospace',
          'font-size': 11 * textScale,
          fill: textFill
        },
        `${state.roomD.toFixed(2)} m`
      )
    );

    return group;
  }

  function wallLabels(plot) {
    const group = el('g', { 'aria-hidden': 'true' });
    const fill = 'oklch(0.43 0.014 39)';
    const textScale = planTextScale();
    const label = (content, x, y, rotate = 0) =>
      el(
        'text',
        {
          x,
          y,
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          transform: rotate ? `rotate(${rotate} ${x} ${y})` : null,
          'font-family': 'Segoe UI, system-ui, sans-serif',
          'font-size': 10 * textScale,
          'font-weight': 700,
          'letter-spacing': '0.12em',
          fill
        },
        content
      );

    group.append(
      label('FRONT', plot.x + plot.w / 2, plot.y - 21),
      label('REAR', plot.x + plot.w / 2, plot.y + plot.h + 21),
      label('LEFT', plot.x - 24, plot.y + plot.h / 2, -90),
      label('RIGHT', plot.x + plot.w + 24, plot.y + plot.h / 2, 90)
    );

    return group;
  }

  function directPath(plot) {
    const source = toScreen(state.source, plot);
    const listener = toScreen(state.listener, plot);
    const group = el('g', { 'aria-hidden': 'true' });

    group.append(
      el('line', {
        x1: source.x,
        y1: source.y,
        x2: listener.x,
        y2: listener.y,
        stroke: 'oklch(0.43 0.014 39)',
        'stroke-width': 1.2,
        'stroke-dasharray': '5 5',
        'stroke-opacity': 0.55,
        'stroke-linecap': 'round'
      })
    );

    return group;
  }

  function reflectionPath(reflection, plot) {
    const source = toScreen(state.source, plot);
    const point = toScreen(reflection.point, plot);
    const listener = toScreen(state.listener, plot);
    const active = activeWall === reflection.key;

    return el('polyline', {
      class: 'path-wall',
      'data-wall': reflection.key,
      points: `${source.x},${source.y} ${point.x},${point.y} ${listener.x},${listener.y}`,
      fill: 'none',
      stroke: 'oklch(0.62 0.19 38.6)',
      'stroke-width': active ? 2.4 : 1.4,
      'stroke-opacity': active ? 0.92 : 0.4,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'pointer-events': 'none'
    });
  }

  function panelZone(reflection, plot) {
    const active = activeWall === reflection.key;
    let x = 0;
    let y = 0;
    let width = 0;
    let height = 0;

    if (reflection.key === 'left' || reflection.key === 'right') {
      y = plot.y + reflection.panel.start * plot.scale;
      height = (reflection.panel.end - reflection.panel.start) * plot.scale;
      x = reflection.key === 'left' ? plot.x : plot.x + plot.w - PANEL_THICKNESS;
      width = PANEL_THICKNESS;
    } else {
      x = plot.x + reflection.panel.start * plot.scale;
      width = (reflection.panel.end - reflection.panel.start) * plot.scale;
      y = reflection.key === 'front' ? plot.y : plot.y + plot.h - PANEL_THICKNESS;
      height = PANEL_THICKNESS;
    }

    return el('rect', {
      class: 'panel-zone',
      'data-wall': reflection.key,
      x,
      y,
      width,
      height,
      rx: 2,
      fill: 'url(#panelHatch)',
      stroke: 'oklch(0.62 0.19 38.6)',
      'stroke-width': active ? 2 : 1,
      'stroke-opacity': active ? 1 : 0.75,
      'pointer-events': 'none'
    });
  }

  function reflectionPointEl(reflection, plot) {
    const position = toScreen(reflection.point, plot);
    const active = activeWall === reflection.key;
    const visualScale = Math.min(planTextScale(), 2.2);
    const hitRadius = Math.max(14, 16 / planRenderScale());
    const group = el('g', {
      class: `wall-point${active ? ' is-active' : ''}`,
      'data-wall': reflection.key,
      tabindex: '0',
      role: 'button',
      'aria-label': `${reflection.label} wall reflection point at ${formatM(reflection.position)} ${reflection.positionLabel}. Path ${formatM(reflection.pathLength)}. Delay ${formatDelay(reflection.delayMs)}.`,
      cursor: 'pointer'
    });

    group.append(
      el('circle', {
        cx: position.x,
        cy: position.y,
        r: hitRadius,
        fill: 'transparent',
        'pointer-events': 'all'
      }),
      el('circle', {
        class: 'point-halo',
        cx: position.x,
        cy: position.y,
        r: 14 * visualScale,
        fill: 'oklch(0.62 0.19 38.6)',
        opacity: 0
      }),
      el('circle', {
        class: 'point-ring',
        cx: position.x,
        cy: position.y,
        r: 7 * visualScale,
        fill: 'oklch(1 0 0)',
        stroke: 'oklch(0.53 0.17 38.6)',
        'stroke-width': 2.2 * visualScale
      }),
      el('circle', {
        class: 'point-dot',
        cx: position.x,
        cy: position.y,
        r: 2.8 * visualScale,
        fill: 'oklch(0.53 0.17 38.6)'
      })
    );

    group.addEventListener('click', () => {
      setActiveWall(reflection.key);
    });

    attachTooltip(
      group,
      `${reflection.label} wall`,
      [
        `Position ${formatM(reflection.position)} ${reflection.positionLabel}`,
        `Path ${formatM(reflection.pathLength)}`,
        `Delay ${formatDelay(reflection.delayMs)}`,
        `Incidence ${formatAngle(reflection.angleDeg)} from normal`
      ],
      reflection.key
    );

    return group;
  }

  function sourceMarker(plot) {
    return markerEl('source', state.source, plot, 'oklch(0.53 0.17 38.6)', 'Source');
  }

  function listenerMarker(plot) {
    return markerEl('listener', state.listener, plot, 'oklch(0.52 0.12 240)', 'Listener');
  }

  function markerHitRadius() {
    return Math.max(24, 22 / planRenderScale());
  }

  function markerEl(kind, point, plot, color, label) {
    const position = toScreen(point, plot);
    const hitRadius = markerHitRadius();
    const textScale = planTextScale();
    const visualScale = Math.min(textScale, 1.8);
    const group = el('g', {
      class: 'marker',
      'data-marker': kind,
      tabindex: '0',
      role: 'button',
      'aria-label': `${label} marker at x ${formatM(point.x)}, y ${formatM(point.y)}. Drag or use arrow keys to move.`,
      cursor: 'grab'
    });

    group.append(
      el('circle', {
        class: 'marker-halo',
        cx: position.x,
        cy: position.y,
        r: 18 * visualScale,
        fill: color,
        opacity: 0.14,
        'pointer-events': 'none'
      }),
      el('circle', {
        class: 'marker-focus',
        cx: position.x,
        cy: position.y,
        r: 17 * visualScale,
        fill: 'none',
        stroke: color,
        'stroke-width': 2 * visualScale,
        'stroke-dasharray': `${3 * visualScale} ${3 * visualScale}`,
        opacity: 0,
        'pointer-events': 'none'
      }),
      el('circle', {
        class: 'marker-hit',
        cx: position.x,
        cy: position.y,
        r: hitRadius,
        fill: 'transparent',
        'pointer-events': 'all',
        cursor: 'grab'
      }),
      el('circle', {
        cx: position.x,
        cy: position.y,
        r: 10 * visualScale,
        fill: color,
        stroke: 'oklch(1 0 0)',
        'stroke-width': 2.5 * visualScale,
        'pointer-events': 'none'
      })
    );

    const icon = el('g', {
      transform: `translate(${position.x} ${position.y}) scale(${visualScale})`,
      'pointer-events': 'none'
    });

    if (kind === 'source') {
      icon.append(el('rect', { x: -3, y: -3, width: 6, height: 6, rx: 1, fill: 'oklch(1 0 0)' }));
    } else {
      icon.append(el('path', { d: 'M 0 -4 L 4 0 L 0 4 L -4 0 Z', fill: 'oklch(1 0 0)' }));
    }

    group.append(icon);

    const labelOffset = (position.y > plot.y + plot.h - 48 ? -1 : 1) * 28 * visualScale;
    group.append(
      el(
        'text',
        {
          x: position.x,
          y: position.y + labelOffset,
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          'font-family': 'Segoe UI, system-ui, sans-serif',
          'font-size': 9.5 * textScale,
          'font-weight': 700,
          'letter-spacing': '0.09em',
          fill: color,
          stroke: 'oklch(1 0 0)',
          'stroke-width': 3 * visualScale,
          'paint-order': 'stroke',
          'pointer-events': 'none'
        },
        label.toUpperCase()
      )
    );

    attachTooltip(group, label, [`x ${formatM(point.x)}`, `y ${formatM(point.y)}`]);
    return group;
  }

  function attachTooltip(node, title, lines, wallKey = null) {
    const show = () => {
      if (wallKey) setActiveWall(wallKey);
      showTooltip(node, title, lines);
    };

    const hide = () => {
      hideTooltip();
      if (wallKey) setActiveWall(null);
    };

    node.addEventListener('pointerenter', show);
    node.addEventListener('pointerleave', hide);
    node.addEventListener('focus', show);
    node.addEventListener('blur', hide);
  }

  function toScreen(point, plot) {
    return {
      x: plot.x + point.x * plot.scale,
      y: plot.y + point.y * plot.scale
    };
  }

  function bindActions() {
    els.helpBtn.addEventListener('click', openHelp);
    els.helpClose.addEventListener('click', closeHelp);
    els.helpDone.addEventListener('click', closeHelp);

    els.helpDialog.addEventListener('click', (event) => {
      if (event.target === els.helpDialog) closeHelp();
    });

    els.printBtn.addEventListener('click', () => {
      updatePrintMeta();
      window.print();
    });

    els.exportBtn.addEventListener('click', exportSVG);
    els.resetBtn.addEventListener('click', resetLayout);
  }

  function bindTable() {
    const rowFromEvent = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      return target ? target.closest('tr[data-wall]') : null;
    };

    els.resultsBody.addEventListener('pointerover', (event) => {
      const row = rowFromEvent(event);
      if (row) setActiveWall(row.dataset.wall);
    });

    els.resultsBody.addEventListener('pointerout', (event) => {
      const row = rowFromEvent(event);
      const related = event.relatedTarget instanceof Node ? event.relatedTarget : null;
      if (row && (!related || !row.contains(related))) setActiveWall(null);
    });

    els.resultsBody.addEventListener('focusin', (event) => {
      const row = rowFromEvent(event);
      if (row) setActiveWall(row.dataset.wall);
    });

    els.resultsBody.addEventListener('focusout', (event) => {
      const row = rowFromEvent(event);
      const related = event.relatedTarget instanceof Node ? event.relatedTarget : null;
      if (row && (!related || !row.contains(related))) setActiveWall(null);
    });
  }

  function bindStage() {
    els.plan.addEventListener('pointerdown', onPointerDown);
    els.plan.addEventListener('keydown', onPlanKeyDown);
  }

  function onPointerDown(event) {
    const target = event.target instanceof Element ? event.target.closest('[data-marker]') : null;
    if (!target) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    event.preventDefault();
    target.focus({ preventScroll: true });

    const marker = target.dataset.marker;
    const roomPoint = getRoomPoint(event.clientX, event.clientY);
    const point = marker === 'source' ? state.source : state.listener;

    drag = {
      marker,
      pointerId: event.pointerId,
      offsetX: roomPoint ? point.x - roomPoint.x : 0,
      offsetY: roomPoint ? point.y - roomPoint.y : 0
    };

    els.plan.classList.add('is-dragging');
    hideTooltip();
    updateMarkerFromPointer(event);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  }

  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    updateMarkerFromPointer(event);
  }

  function updateMarkerFromPointer(event) {
    if (!drag) return;

    const roomPoint = getRoomPoint(event.clientX, event.clientY);
    if (!roomPoint) return;

    const point = drag.marker === 'source' ? state.source : state.listener;
    const nextX = clamp(roomPoint.x + drag.offsetX, WALL_MARGIN, state.roomW - WALL_MARGIN);
    const nextY = clamp(roomPoint.y + drag.offsetY, WALL_MARGIN, state.roomD - WALL_MARGIN);

    if (same(nextX, point.x) && same(nextY, point.y)) return;

    point.x = nextX;
    point.y = nextY;
    render();
  }

  function endDrag(event) {
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;

    const marker = drag.marker;
    drag = null;
    els.plan.classList.remove('is-dragging');
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);

    syncInputs();
    saveState();

    const point = marker === 'source' ? state.source : state.listener;
    const label = marker === 'source' ? 'Source' : 'Listener';
    announce(`${label} moved to x ${point.x.toFixed(2)} metres, y ${point.y.toFixed(2)} metres.`);
  }

  function onPlanKeyDown(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const marker = target.closest('[data-marker]');

    if (marker) {
      const key = marker.dataset.marker;
      const step = event.shiftKey ? 0.1 : 0.01;
      let dx = 0;
      let dy = 0;

      if (event.key === 'ArrowLeft') dx = -step;
      else if (event.key === 'ArrowRight') dx = step;
      else if (event.key === 'ArrowUp') dy = -step;
      else if (event.key === 'ArrowDown') dy = step;
      else return;

      event.preventDefault();

      const point = key === 'source' ? state.source : state.listener;
      point.x = clamp(point.x + dx, WALL_MARGIN, state.roomW - WALL_MARGIN);
      point.y = clamp(point.y + dy, WALL_MARGIN, state.roomD - WALL_MARGIN);

      syncInputs();
      render({ focusMarker: key });
      announce(
        `${key === 'source' ? 'Source' : 'Listener'} at x ${point.x.toFixed(2)} metres, y ${point.y.toFixed(2)} metres.`
      );
      return;
    }

    const point = target.closest('.wall-point');

    if (point && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      setActiveWall(point.dataset.wall);
    }
  }

  function getRoomPoint(clientX, clientY) {
    const matrix = els.plan.getScreenCTM();
    if (!matrix) return null;

    const svgPoint = els.plan.createSVGPoint();
    svgPoint.x = clientX;
    svgPoint.y = clientY;

    const local = svgPoint.matrixTransform(matrix.inverse());
    const plot = getPlot();

    return {
      x: (local.x - plot.x) / plot.scale,
      y: (local.y - plot.y) / plot.scale
    };
  }

  function showTooltip(node, title, lines) {
    const stageRect = els.stage.getBoundingClientRect();
    const targetRect = node.getBoundingClientRect();

    if (!stageRect.width || !stageRect.height) return;

    const titleNode = document.createElement('strong');
    titleNode.textContent = title;

    const content = [titleNode];

    lines.forEach((line) => {
      const span = document.createElement('span');
      span.textContent = line;
      content.push(span);
    });

    els.tooltip.replaceChildren(...content);
    els.tooltip.hidden = false;

    const tipW = els.tooltip.offsetWidth;
    const tipH = els.tooltip.offsetHeight;
    let left = targetRect.left + targetRect.width / 2 - stageRect.left - tipW / 2;
    let top = targetRect.top - stageRect.top - tipH - 10;

    if (top < 8) top = targetRect.bottom - stageRect.top + 10;

    left = clamp(left, 8, Math.max(8, stageRect.width - tipW - 8));
    top = clamp(top, 8, Math.max(8, stageRect.height - tipH - 8));

    els.tooltip.style.left = `${left}px`;
    els.tooltip.style.top = `${top}px`;
  }

  function hideTooltip() {
    els.tooltip.hidden = true;
  }

  function resetLayout() {
    state = cloneDefaults();
    activeWall = null;
    drag = null;
    els.plan.classList.remove('is-dragging');
    syncInputs();
    render();
    saveState();
    showToast('Layout reset');
    announce('Layout reset to the default room.');
  }

  function openHelp() {
    if (typeof els.helpDialog.showModal === 'function') {
      els.helpDialog.showModal();
    } else {
      els.helpDialog.setAttribute('open', '');
    }
  }

  function closeHelp() {
    if (typeof els.helpDialog.close === 'function') {
      els.helpDialog.close();
    } else {
      els.helpDialog.removeAttribute('open');
    }
  }

  function exportSVG() {
    const clone = els.plan.cloneNode(true);
    const background = el('rect', { x: 0, y: 0, width: VIEW_W, height: VIEW_H, fill: 'oklch(1 0 0)' });

    clone.setAttribute('xmlns', SVG_NS);
    clone.setAttribute('width', String(VIEW_W));
    clone.setAttribute('height', String(VIEW_H));
    clone.removeAttribute('class');
    clone.insertBefore(background, clone.firstChild);

    const source = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `reflection-room-${dateStamp()}.svg`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('SVG exported');
    announce('Plan exported as an SVG file.');
  }

  function dateStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.classList.remove('is-visible');
    }, 2200);
  }

  function announce(message) {
    els.live.textContent = '';
    setTimeout(() => {
      els.live.textContent = message;
    }, 20);
  }
})();

const tileGrid = document.querySelector("#tileGrid");
const flowCanvas = document.querySelector("#flowCanvas");
const buildingLayer = document.querySelector("#buildingLayer");
const mapPanel = document.querySelector("#mapPanel");
const stage = document.querySelector(".stage");
const controlPanel = document.querySelector("#controlPanel");
const layoutPanel = document.querySelector("#layoutPanel");
const loadingOverlay = document.querySelector("#loadingOverlay");
const loadingText = document.querySelector("#loadingText");
const loadingDetail = document.querySelector("#loadingDetail");
const selectionMarker = document.querySelector("#selectionMarker");
const locateButton = document.querySelector("#locateButton");
const zoomInButton = document.querySelector("#zoomInButton");
const zoomOutButton = document.querySelector("#zoomOutButton");
const zoomBadge = document.querySelector("#zoomBadge");
const layoutZoomInButton = document.querySelector("#layoutZoomInButton");
const layoutZoomOutButton = document.querySelector("#layoutZoomOutButton");
const refreshPlaces = document.querySelector("#refreshPlaces");
const exportButton = document.querySelector("#exportButton");
const scanBurst = document.querySelector("#scanBurst");
const statusText = document.querySelector("#statusText");
const progressBar = document.querySelector("#progressBar");
const addressForm = document.querySelector("#addressForm");
const addressInput = document.querySelector("#addressInput");
const quickPicker = document.querySelector("#quickPicker");
const placeOptions = document.querySelector("#placeOptions");
const floorList = document.querySelector("#floorList");
const floorPlan = document.querySelector("#floorPlan");
const sourceSummary = document.querySelector("#sourceSummary");
const tileCache = new Map();
let renderToken = 0;
const LONG_PRESS_MOVE_TOLERANCE = 12;
const MIN_MAP_ZOOM = 6;
const MAX_MAP_ZOOM = 19;
const SVG_NS = "http://www.w3.org/2000/svg";
const BASE_LAYOUT_VIEWBOX = { x: 0, y: 0, width: 420, height: 300 };

const OPEN_BUILDING_MAP_ENDPOINTS = [
  "https://openbuildingmap.org/api/buildings",
  "https://openbuildingmap.org/api/0.1/buildings",
];

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const state = {
  center: { lat: 25.033, lon: 121.5654, label: "台北 101 周邊" },
  places: [],
  buildings: [],
  selectedPlace: null,
  selectedLayout: null,
  selectedFloor: null,
  zoom: 16,
  drag: null,
  longPress: null,
  suppressNextClick: false,
  animationFrame: 0,
  requestId: 0,
  view: "map",
  pickerOptions: [],
  layoutBaseViewBox: { ...BASE_LAYOUT_VIEWBOX },
  layoutViewBox: { ...BASE_LAYOUT_VIEWBOX },
  layoutZoom: 1,
  layoutHold: null,
  traceAnchor: null,
  tracePoints: [],
  traceWatchId: null,
  tracking: false,
  deviceHeading: null,
  headingOffset: 0,
  baseGps: null,
  metersToSvg: 3,
  mapPointers: new Map(),
  layoutPointers: new Map(),
  mapPinch: null,
  layoutPinch: null,
  layoutHasDirection: false,
  lastMotionAt: 0,
  autoHeadingCalibration: false,
  pickerTimer: null,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setStatus(text, step, progress) {
  statusText.textContent = text;
  progressBar.style.width = `${progress}%`;
  document.querySelectorAll(".step").forEach((node) => {
    node.classList.toggle("active", Number(node.dataset.step) <= step);
  });
}

function showLoading(title = "正在下載開放建築資料", detail = "讀取 OSM / OpenBuildingMap footprint") {
  loadingText.textContent = title;
  loadingDetail.textContent = detail;
  loadingOverlay.classList.add("active");
  loadingOverlay.setAttribute("aria-hidden", "false");
}

function hideLoading() {
  loadingOverlay.classList.remove("active");
  loadingOverlay.setAttribute("aria-hidden", "true");
}

function resetMapInteraction() {
  clearLongPress();
  state.drag = null;
  state.mapPinch = null;
  state.mapPointers.clear();
  state.suppressNextClick = false;
  tileGrid.style.transform = "";
  buildingLayer.style.transform = "";
  mapPanel.classList.remove("dragging");
}

function resetLayoutInteraction() {
  clearLayoutHold();
  state.layoutPinch = null;
  state.layoutPointers.clear();
}

function burst(x = 50, y = 50) {
  scanBurst.style.setProperty("--x", `${x}%`);
  scanBurst.style.setProperty("--y", `${y}%`);
  scanBurst.classList.remove("active");
  scanBurst.offsetWidth;
  scanBurst.classList.add("active");
}

function setPortalOrigin(xRatio = 0.5, yRatio = 0.5) {
  const x = `${Math.max(0, Math.min(1, xRatio)) * 100}%`;
  const y = `${Math.max(0, Math.min(1, yRatio)) * 100}%`;
  stage.style.setProperty("--portal-x", x);
  stage.style.setProperty("--portal-y", y);
  layoutPanel.style.setProperty("--portal-x", x);
  layoutPanel.style.setProperty("--portal-y", y);
}

function showLayoutView() {
  resetMapInteraction();
  state.view = "layout";
  stage.classList.add("layout-mode");
  layoutPanel.classList.add("active");
  layoutPanel.setAttribute("aria-hidden", "false");
  locateButton.textContent = "返回";
  locateButton.title = "返回地圖";
}

function hideLayoutView() {
  resetMapInteraction();
  resetLayoutInteraction();
  state.view = "map";
  stopLayoutTracking();
  stage.classList.remove("layout-mode");
  controlPanel.classList.remove("map-locked");
  layoutPanel.classList.remove("active");
  layoutPanel.setAttribute("aria-hidden", "true");
  locateButton.textContent = "IP 定位";
  locateButton.title = "使用 IP 取得大略位置";
}

function showMapView() {
  hideLayoutView();
  setStatus("已返回地圖，可拖拉縮放並重新選點", 2, 42);
}

function clearLongPress() {
  if (state.longPress?.timer) {
    window.clearTimeout(state.longPress.timer);
  }
  state.longPress = null;
}

function clearLayoutHold() {
  if (state.layoutHold?.timer) {
    window.clearTimeout(state.layoutHold.timer);
  }
  state.layoutHold = null;
}

function setLayoutViewBox() {
  const { x, y, width, height } = state.layoutViewBox;
  floorPlan.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
}

function currentLayoutBaseViewBox() {
  return state.layoutBaseViewBox || BASE_LAYOUT_VIEWBOX;
}

function clampLayoutViewBox(viewBox = state.layoutViewBox) {
  const base = currentLayoutBaseViewBox();
  const width = Math.min(base.width, viewBox.width);
  const height = Math.min(base.height, viewBox.height);
  return {
    x: Math.max(base.x, Math.min(base.x + base.width - width, viewBox.x)),
    y: Math.max(base.y, Math.min(base.y + base.height - height, viewBox.y)),
    width,
    height,
  };
}

function resetLayoutViewport() {
  state.layoutZoom = 1;
  state.layoutViewBox = { ...currentLayoutBaseViewBox() };
  setLayoutViewBox();
}

function resetLayoutBaseViewBox() {
  state.layoutBaseViewBox = { ...BASE_LAYOUT_VIEWBOX };
  resetLayoutViewport();
}

function fitLayoutViewportToContent(padding = 16) {
  try {
    if (!floorPlan.children.length || !floorPlan.getBBox) {
      resetLayoutBaseViewBox();
      return;
    }
    const box = floorPlan.getBBox();
    const width = Math.max(1, box.width + padding * 2);
    const height = Math.max(1, box.height + padding * 2);
    state.layoutBaseViewBox = {
      x: box.x - padding,
      y: box.y - padding,
      width,
      height,
    };
    resetLayoutViewport();
  } catch {
    resetLayoutBaseViewBox();
  }
}

function zoomLayout(delta) {
  const nextZoom = Math.max(1, Math.min(5, state.layoutZoom + delta));
  if (nextZoom === state.layoutZoom) return;
  const base = currentLayoutBaseViewBox();
  const centerX = state.layoutViewBox.x + state.layoutViewBox.width / 2;
  const centerY = state.layoutViewBox.y + state.layoutViewBox.height / 2;
  state.layoutZoom = nextZoom;
  const width = base.width / nextZoom;
  const height = base.height / nextZoom;
  state.layoutViewBox = clampLayoutViewBox({
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  });
  setLayoutViewBox();
  setStatus(`配置圖縮放 ${Math.round(nextZoom * 100)}%`, 4, 100);
}

function panLayoutByPixels(dx, dy) {
  if (state.layoutZoom <= 1) return;
  const rect = floorPlan.getBoundingClientRect();
  state.layoutViewBox = clampLayoutViewBox({
    ...state.layoutViewBox,
    x: state.layoutViewBox.x - (dx / rect.width) * state.layoutViewBox.width,
    y: state.layoutViewBox.y - (dy / rect.height) * state.layoutViewBox.height,
  });
  setLayoutViewBox();
}

function pointFromLayoutPosition(clientX, clientY) {
  const screenMatrix = floorPlan.getScreenCTM?.();
  if (floorPlan.createSVGPoint && screenMatrix) {
    const point = floorPlan.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    return point.matrixTransform(screenMatrix.inverse());
  }
  const rect = floorPlan.getBoundingClientRect();
  const viewBox = state.layoutViewBox;
  return {
    x: viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.width,
    y: viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.height,
  };
}

function pointFromLayoutEvent(event) {
  return pointFromLayoutPosition(event.clientX, event.clientY);
}

function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

function distanceBetweenPointers(pointers) {
  const values = Array.from(pointers.values());
  if (values.length < 2) return 0;
  return Math.hypot(values[0].clientX - values[1].clientX, values[0].clientY - values[1].clientY);
}

function updatePointerStore(store, event) {
  store.set(event.pointerId, {
    clientX: event.clientX,
    clientY: event.clientY,
    pointerType: event.pointerType,
  });
}

function estimateLayoutScale(building) {
  const dimensions = building?.dimensions;
  if (!dimensions?.width || !dimensions?.depth) return 3;
  const xScale = 312 / Math.max(1, dimensions.width);
  const yScale = 204 / Math.max(1, dimensions.depth);
  return Math.max(0.25, Math.min(xScale, yScale));
}

function resetTraceForLayout(building = state.selectedLayout) {
  state.traceAnchor = null;
  state.tracePoints = [];
  state.baseGps = null;
  state.headingOffset = 0;
  state.metersToSvg = estimateLayoutScale(building);
  state.layoutHasDirection = Boolean(building?.geometry?.length);
  state.autoHeadingCalibration = !state.layoutHasDirection;
}

function currentSvgPosition() {
  return state.tracePoints[state.tracePoints.length - 1] || state.traceAnchor;
}

function renderTraceOverlay() {
  floorPlan.querySelector("#traceLayer")?.remove();
  if (!state.traceAnchor && !state.tracePoints.length) return;

  const layer = document.createElementNS(SVG_NS, "g");
  layer.id = "traceLayer";

  if (state.tracePoints.length > 1) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("class", "trace-path");
    path.setAttribute("d", state.tracePoints.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" "));
    layer.append(path);
  }

  if (state.traceAnchor) {
    const anchor = document.createElementNS(SVG_NS, "circle");
    anchor.setAttribute("class", "trace-anchor");
    anchor.setAttribute("cx", state.traceAnchor.x);
    anchor.setAttribute("cy", state.traceAnchor.y);
    anchor.setAttribute("r", 6);
    layer.append(anchor);
  }

  const position = currentSvgPosition();
  if (position) {
    const marker = document.createElementNS(SVG_NS, "circle");
    marker.setAttribute("class", "trace-position");
    marker.setAttribute("cx", position.x);
    marker.setAttribute("cy", position.y);
    marker.setAttribute("r", 7);
    layer.append(marker);

    if (state.deviceHeading !== null) {
      const arrow = document.createElementNS(SVG_NS, "polygon");
      arrow.setAttribute("class", "trace-heading");
      arrow.setAttribute("points", "0,-14 7,10 0,6 -7,10");
      arrow.setAttribute("transform", `translate(${position.x} ${position.y}) rotate(${normalizeAngle(state.deviceHeading + state.headingOffset)})`);
      layer.append(arrow);
    }
  }

  floorPlan.append(layer);
}

function setTraceAnchor(point, options = {}) {
  state.traceAnchor = point;
  state.tracePoints = [point];
  state.baseGps = null;
  state.autoHeadingCalibration = !state.layoutHasDirection;
  if (!state.layoutHasDirection && state.deviceHeading !== null) {
    state.headingOffset = normalizeAngle(-state.deviceHeading);
    state.autoHeadingCalibration = false;
  }
  renderTraceOverlay();
  setStatus(state.layoutHasDirection ? "已設定 layout 起點，正在依手機移動繪製軌跡" : "已設定 layout 起點，會以目前手機朝向自動對準 layout 上方", 4, 100);
  if (options.startTracking) startLayoutTracking();
}

function handleDeviceOrientation(event) {
  const rawHeading = Number.isFinite(event.webkitCompassHeading) ? event.webkitCompassHeading : 360 - (event.alpha || 0);
  state.deviceHeading = normalizeAngle(rawHeading);
  if (state.tracking && state.autoHeadingCalibration && !state.layoutHasDirection) {
    state.headingOffset = normalizeAngle(-state.deviceHeading);
    state.autoHeadingCalibration = false;
    setStatus("已自動對準：目前手機朝向對應 layout 上方", 4, 100);
  }
  if (state.tracking) renderTraceOverlay();
}

function gpsToLayoutPoint(coords) {
  if (!state.traceAnchor) {
    state.traceAnchor = { x: 210, y: 150 };
  }
  if (!state.baseGps) {
    state.baseGps = { lat: coords.latitude, lon: coords.longitude };
    return state.traceAnchor;
  }
  const avgLat = ((coords.latitude + state.baseGps.lat) / 2) * (Math.PI / 180);
  const northMeters = (coords.latitude - state.baseGps.lat) * 110540;
  const eastMeters = (coords.longitude - state.baseGps.lon) * 111320 * Math.cos(avgLat);
  const distance = Math.hypot(eastMeters, northMeters);
  const worldAngle = (Math.atan2(eastMeters, northMeters) * 180) / Math.PI;
  const layoutAngle = normalizeAngle(worldAngle + state.headingOffset);
  const radians = (layoutAngle * Math.PI) / 180;
  return {
    x: state.traceAnchor.x + Math.sin(radians) * distance * state.metersToSvg,
    y: state.traceAnchor.y - Math.cos(radians) * distance * state.metersToSvg,
  };
}

function handleTracePosition(position) {
  const nextPoint = gpsToLayoutPoint(position.coords);
  const previous = state.tracePoints[state.tracePoints.length - 1];
  if (!previous || Math.hypot(nextPoint.x - previous.x, nextPoint.y - previous.y) > 0.4) {
    state.tracePoints.push(nextPoint);
    state.tracePoints = state.tracePoints.slice(-240);
  }
  renderTraceOverlay();
}

function addMotionTraceStep(distanceMeters = 0.55) {
  if (!state.tracking || state.deviceHeading === null) return;
  if (!state.traceAnchor) setTraceAnchor({ x: 210, y: 150 });
  const previous = currentSvgPosition();
  if (!previous) return;
  const layoutAngle = normalizeAngle(state.deviceHeading + state.headingOffset);
  const radians = (layoutAngle * Math.PI) / 180;
  const nextPoint = {
    x: previous.x + Math.sin(radians) * distanceMeters * state.metersToSvg,
    y: previous.y - Math.cos(radians) * distanceMeters * state.metersToSvg,
  };
  state.tracePoints.push(nextPoint);
  state.tracePoints = state.tracePoints.slice(-240);
  renderTraceOverlay();
}

function handleDeviceMotion(event) {
  if (!state.tracking) return;
  const now = Date.now();
  if (now - state.lastMotionAt < 240) return;
  const acceleration = event.acceleration;
  const gravityAcceleration = event.accelerationIncludingGravity;
  const motionMagnitude = acceleration ? Math.hypot(acceleration.x || 0, acceleration.y || 0, acceleration.z || 0) : 0;
  const gravityMagnitude = gravityAcceleration ? Math.abs(Math.hypot(gravityAcceleration.x || 0, gravityAcceleration.y || 0, gravityAcceleration.z || 0) - 9.8) : 0;
  if (motionMagnitude < 0.85 && gravityMagnitude < 0.9) return;
  state.lastMotionAt = now;
  addMotionTraceStep(0.28);
}

function stopLayoutTracking() {
  if (!state.tracking && state.traceWatchId === null) return;
  state.tracking = false;
  if (state.traceWatchId !== null) navigator.geolocation?.clearWatch(state.traceWatchId);
  window.removeEventListener("deviceorientation", handleDeviceOrientation, true);
  window.removeEventListener("devicemotion", handleDeviceMotion, true);
  state.traceWatchId = null;
}

async function startLayoutTracking() {
  if (state.tracking) return;

  if (!state.traceAnchor) setTraceAnchor({ x: 210, y: 150 });

  try {
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== "granted") throw new Error("orientation denied");
    }
    if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
      await DeviceMotionEvent.requestPermission();
    }
    window.addEventListener("deviceorientation", handleDeviceOrientation, true);
    window.addEventListener("devicemotion", handleDeviceMotion, true);
    state.tracking = true;
    if (navigator.geolocation?.watchPosition) {
      state.traceWatchId = navigator.geolocation.watchPosition(handleTracePosition, () => {
        setStatus("無法取得手機位置，仍可使用方向與手動起點", 4, 88);
      }, { enableHighAccuracy: true, maximumAge: 250, timeout: 8000 });
    } else {
      setStatus("此瀏覽器沒有提供定位追蹤", 4, 88);
    }
    setStatus(state.layoutHasDirection ? "已自動啟動追蹤，會依手機方向與移動繪製軌跡" : "已自動啟動追蹤，會以目前手機朝向對準 layout 上方", 4, 100);
  } catch {
    state.tracking = false;
    setStatus("手機方向或定位權限未開啟，允許權限後重新長按定位即可", 4, 82);
  }
}

function selectedPickerOption() {
  const value = addressInput.value.trim();
  if (!value) return null;
  return state.pickerOptions.find((option) => option.label === value || option.value === value) || null;
}

function selectedQuickPickerOption() {
  const index = Number(quickPicker.value);
  if (!Number.isInteger(index) || index < 0) return null;
  return state.pickerOptions[index] || null;
}

function activatePickerOption(option) {
  if (!option) return false;
  if (option.kind === "place") {
    const place = state.places.find((item) => item.id === option.id);
    if (place) {
      selectPlace(place);
      return true;
    }
  }
  if (option.kind === "building") {
    const building = state.buildings.find((item) => item.id === option.id);
    if (building) {
      selectBuilding(building);
      return true;
    }
  }
  return false;
}

function resetQuickPicker(placeholder = "選擇附近位置") {
  quickPicker.replaceChildren();
  const option = document.createElement("option");
  option.value = "-1";
  option.textContent = placeholder;
  quickPicker.append(option);
  quickPicker.value = "-1";
  quickPicker.hidden = true;
}

function addQuickPickerOption(label, index, selected = false) {
  const option = document.createElement("option");
  option.value = String(index);
  option.textContent = label;
  quickPicker.append(option);
  if (selected) quickPicker.value = option.value;
}

function lon2tile(lon, zoom) {
  return Math.floor(((lon + 180) / 360) * 2 ** zoom);
}

function lat2tile(lat, zoom) {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom);
}

function lonToPixel(lon, zoom) {
  return ((lon + 180) / 360) * 256 * 2 ** zoom;
}

function latToPixel(lat, zoom) {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 256 * 2 ** zoom;
}

function pixelToLon(x, zoom) {
  return (x / (256 * 2 ** zoom)) * 360 - 180;
}

function pixelToLat(y, zoom) {
  const n = Math.PI - (2 * Math.PI * y) / (256 * 2 ** zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function clampLat(lat) {
  return Math.max(-85, Math.min(85, lat));
}

function clampLon(lon) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

function pointFromMapPosition(clientX, clientY) {
  const zoom = state.zoom;
  const rect = mapPanel.getBoundingClientRect();
  const xRatio = (clientX - rect.left) / rect.width;
  const yRatio = (clientY - rect.top) / rect.height;
  const centerX = lonToPixel(state.center.lon, zoom);
  const centerY = latToPixel(state.center.lat, zoom);
  const targetX = centerX + clientX - rect.left - rect.width / 2;
  const targetY = centerY + clientY - rect.top - rect.height / 2;

  return {
    xRatio: Math.max(0, Math.min(1, xRatio)),
    yRatio: Math.max(0, Math.min(1, yRatio)),
    lat: clampLat(pixelToLat(targetY, zoom)),
    lon: clampLon(pixelToLon(targetX, zoom)),
  };
}

function pointFromMapClick(event) {
  return pointFromMapPosition(event.clientX, event.clientY);
}

function renderTiles(center = state.center) {
  const token = ++renderToken;
  const zoom = state.zoom;
  const centerPixelX = lonToPixel(center.lon, zoom);
  const centerPixelY = latToPixel(center.lat, zoom);
  const centerTileX = Math.floor(centerPixelX / 256);
  const centerTileY = Math.floor(centerPixelY / 256);
  const centerOffsetX = centerPixelX - centerTileX * 256;
  const centerOffsetY = centerPixelY - centerTileY * 256;
  const rect = mapPanel.getBoundingClientRect();
  const offsets = [-3, -2, -1, 0, 1, 2, 3];
  tileGrid.style.transform = "";
  tileGrid.style.left = `${rect.width / 2 - (3 * 256 + centerOffsetX)}px`;
  tileGrid.style.top = `${rect.height / 2 - (3 * 256 + centerOffsetY)}px`;
  zoomBadge.textContent = `Z${zoom}`;
  tileGrid.replaceChildren();

  offsets.forEach((dy, row) => {
    offsets.forEach((dx, col) => {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.style.left = `${col * 256}px`;
      tile.style.top = `${row * 256}px`;
      tile.style.backgroundImage = `url("${tileUrl(zoom, centerTileX + dx, centerTileY + dy)}")`;
      tileGrid.append(tile);
    });
  });

  preloadTiles(center, zoom);
  window.setTimeout(() => {
    if (token === renderToken) preloadTiles(center, zoom);
  }, 180);
}

function tileUrl(zoom, x, y) {
  const max = 2 ** zoom;
  const wrappedX = ((x % max) + max) % max;
  const clampedY = Math.max(0, Math.min(max - 1, y));
  return `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${clampedY}.png`;
}

function cacheTile(zoom, x, y) {
  const url = tileUrl(zoom, x, y);
  if (tileCache.has(url)) return;
  const image = new Image();
  image.decoding = "async";
  image.loading = "eager";
  image.src = url;
  tileCache.set(url, image);
}

function preloadTiles(center = state.center, zoom = state.zoom) {
  const centerX = lon2tile(center.lon, zoom);
  const centerY = lat2tile(center.lat, zoom);
  for (let dy = -4; dy <= 4; dy += 1) {
    for (let dx = -4; dx <= 4; dx += 1) {
      cacheTile(zoom, centerX + dx, centerY + dy);
    }
  }

  [zoom - 1, zoom + 1].forEach((nearZoom) => {
    if (nearZoom < MIN_MAP_ZOOM || nearZoom > MAX_MAP_ZOOM) return;
    const nearX = lon2tile(center.lon, nearZoom);
    const nearY = lat2tile(center.lat, nearZoom);
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        cacheTile(nearZoom, nearX + dx, nearY + dy);
      }
    }
  });
}

function markSelection(xRatio = 0.5, yRatio = 0.5) {
  selectionMarker.style.setProperty("--marker-x", `${xRatio * 100}%`);
  selectionMarker.style.setProperty("--marker-y", `${yRatio * 100}%`);
  selectionMarker.classList.remove("active");
  selectionMarker.offsetWidth;
  selectionMarker.classList.add("active");
}

function moveMapByScreenDelta(dx, dy) {
  const zoom = state.zoom;
  const centerX = lonToPixel(state.center.lon, zoom);
  const centerY = latToPixel(state.center.lat, zoom);
  const nextX = centerX - dx;
  const nextY = centerY - dy;
  state.center = {
    lat: clampLat(pixelToLat(nextY, zoom)),
    lon: clampLon(pixelToLon(nextX, zoom)),
    label: "地圖瀏覽位置",
  };
  renderTiles(state.center);
  renderFootprints();
  preloadTiles(state.center, state.zoom);
  setStatus("地圖已移動，長按可選定位置", 2, 42);
}

function zoomMap(delta, anchorEvent = null) {
  const nextZoom = Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, state.zoom + delta));
  if (nextZoom === state.zoom) return;

  const before = anchorEvent ? pointFromMapClick(anchorEvent) : null;
  preloadTiles(state.center, nextZoom);
  state.zoom = nextZoom;

  if (before && Number.isFinite(before.lat) && Number.isFinite(before.lon)) {
    const rect = mapPanel.getBoundingClientRect();
    const anchorX = lonToPixel(before.lon, state.zoom);
    const anchorY = latToPixel(before.lat, state.zoom);
    const centerX = anchorX - (anchorEvent.clientX - rect.left - rect.width / 2);
    const centerY = anchorY - (anchorEvent.clientY - rect.top - rect.height / 2);
    state.center = {
      lat: clampLat(pixelToLat(centerY, state.zoom)),
      lon: clampLon(pixelToLon(centerX, state.zoom)),
      label: "地圖瀏覽位置",
    };
  }

  renderTiles(state.center);
  renderFootprints();
  preloadTiles(state.center, state.zoom);
  setStatus(`地圖縮放至 Z${state.zoom}，長按可選定位置`, 2, 42);
}

async function locateByIp() {
  setStatus("根據 IP 讀取大略位置", 1, 18);
  try {
    const response = await fetch("https://ipapi.co/json/", { cache: "no-store" });
    if (!response.ok) throw new Error("IP lookup failed");
    const data = await response.json();
    if (!data.latitude || !data.longitude) throw new Error("IP response missing coordinates");
    return {
      lat: Number(data.latitude),
      lon: Number(data.longitude),
      label: [data.city, data.region, data.country_name].filter(Boolean).join(", "),
    };
  } catch {
    return { ...state.center };
  }
}

async function fetchNearbyPlaces(center, options = {}) {
  if (!options.silent) {
    setStatus(`鎖定 ${center.label || "附近區域"}，掃描可選位置`, 2, 38);
  }
  const query = `
    [out:json][timeout:12];
    (
      node(around:850,${center.lat},${center.lon})[name][amenity];
      node(around:850,${center.lat},${center.lon})[name][tourism];
      node(around:850,${center.lat},${center.lon})[name][office];
      way(around:850,${center.lat},${center.lon})[name][building];
    );
    out tags center 18;
  `;

  try {
    const data = await fetchOverpass(query);
    const places = data.elements
      .map((element) => {
        const lat = element.lat ?? element.center?.lat;
        const lon = element.lon ?? element.center?.lon;
        const tags = element.tags || {};
        return {
          id: `${element.type}-${element.id}`,
          name: tags.name || tags["name:zh"] || "未命名位置",
          type: tags.amenity || tags.tourism || tags.office || tags.building || "place",
          lat,
          lon,
          meta: [tags.amenity, tags.tourism, tags.office, tags.building].filter(Boolean).join(" / "),
        };
      })
      .filter((place) => place.lat && place.lon && place.name)
      .slice(0, 6);
    return places;
  } catch {
    return [];
  }
}

async function geocodeAddress(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Geocoding failed");
  const results = await response.json();
  const result = results[0];
  if (!result) return null;
  return {
    id: `address-${Date.now()}`,
    name: result.display_name.split(",").slice(0, 2).join(","),
    type: result.type || "address",
    lat: Number(result.lat),
    lon: Number(result.lon),
    meta: result.display_name,
  };
}

async function reverseGeocode(lat, lon) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const result = await response.json();
    return result.display_name || null;
  } catch {
    return null;
  }
}

async function fetchBuildings(place, options = {}) {
  if (!options.silent) {
    setStatus(`分析「${place.name}」周邊建築 footprint`, 3, 62);
  }

  const [osmBuildings, openBuildingMapBuildings] = await Promise.all([
    fetchOsmBuildings(place),
    fetchOpenBuildingMapBuildings(place),
  ]);

  return mergeBuildings([...osmBuildings, ...openBuildingMapBuildings])
    .filter((building) => building.distance <= 1000)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 60);
}

async function fetchOverpass(query) {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 15000);
    try {
      const url = new URL(endpoint);
      url.searchParams.set("data", query);
      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Overpass request failed");
      return await response.json();
    } catch {
      // Try the next public Overpass instance.
    } finally {
      window.clearTimeout(timer);
    }
  }
  throw new Error("No Overpass endpoint available");
}

async function fetchOsmBuildings(place) {
  const query = `
    [out:json][timeout:12];
    way(around:1000,${place.lat},${place.lon})[building];
    out tags center geom 40;
  `;

  try {
    const data = await fetchOverpass(query);
    const buildings = data.elements
      .filter((item) => item.geometry?.length >= 3)
      .slice(0, 40)
      .map((item, index) => {
        const tags = item.tags || {};
        const geometry = item.geometry || [];
        const area = estimateArea(geometry);
        const dimensions = estimateDimensions(geometry);
        const center = item.center || centroid(geometry) || { lat: place.lat, lon: place.lon };
        return {
          id: `osm-${item.id}`,
          name: tags.name || `${place.name} 建築 ${index + 1}`,
          source: "OpenStreetMap",
          center,
          distance: distanceMeters(place, center),
          floors: readFloorCount(tags),
          kind: tags.building || "building",
          area,
          dimensions,
          geometry,
          tags,
          hasIndoorLayout: false,
        };
      });
    return buildings;
  } catch {
    return [];
  }
}

async function fetchOpenBuildingMapBuildings(place) {
  const bbox = bboxAround(place.lat, place.lon, 1000);
  for (const endpoint of OPEN_BUILDING_MAP_ENDPOINTS) {
    try {
      const url = new URL(endpoint);
      url.searchParams.set("bbox", `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`);
      url.searchParams.set("format", "geojson");
      const data = await fetchJsonWithTimeout(url.toString(), 3500);
      const buildings = normalizeOpenBuildingMap(data, place);
      if (buildings.length) return buildings;
    } catch {
      // OpenBuildingMap does not consistently expose a CORS-enabled public API.
    }
  }
  return [];
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/geo+json, application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Provider request failed");
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

function bboxAround(lat, lon, radiusMeters) {
  const latDelta = radiusMeters / 110540;
  const lonDelta = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  };
}

function distanceMeters(a, b) {
  const earthRadius = 6371000;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const deltaLat = ((b.lat - a.lat) * Math.PI) / 180;
  const deltaLon = ((b.lon - a.lon) * Math.PI) / 180;
  const haversine = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return Math.round(2 * earthRadius * Math.asin(Math.sqrt(haversine)));
}

function normalizeOpenBuildingMap(data, place) {
  const features = Array.isArray(data?.features) ? data.features : [];
  return features
    .map((feature, index) => {
      const geometry = geometryFromGeoJson(feature.geometry);
      if (geometry.length < 3) return null;
      const tags = feature.properties || {};
      const area = estimateArea(geometry);
      const center = centroid(geometry) || { lat: place.lat, lon: place.lon };
      return {
        id: `obm-${tags.id || tags.osm_id || index}`,
        name: tags.name || `${place.name} 建築 ${index + 1}`,
        source: "OpenBuildingMap",
        center,
        distance: distanceMeters(place, center),
        floors: readFloorCount(tags),
        kind: tags.building || tags.type || "building",
        area,
        dimensions: estimateDimensions(geometry),
        geometry,
        tags,
        hasIndoorLayout: false,
      };
    })
    .filter(Boolean);
}

function geometryFromGeoJson(geometry) {
  const type = geometry?.type;
  const coordinates = geometry?.coordinates;
  if (type === "Polygon" && Array.isArray(coordinates?.[0])) {
    return coordinates[0].map(([lon, lat]) => ({ lat, lon })).filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
  }
  if (type === "MultiPolygon" && Array.isArray(coordinates?.[0]?.[0])) {
    return coordinates[0][0].map(([lon, lat]) => ({ lat, lon })).filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
  }
  return [];
}

function mergeBuildings(buildings) {
  const seen = new Set();
  return buildings.filter((building) => {
    const key = `${building.source}:${building.id}`;
    const shapeKey = `${Math.round(building.center.lat * 100000)}:${Math.round(building.center.lon * 100000)}:${Math.round(building.area / 10)}`;
    if (seen.has(key) || seen.has(shapeKey)) return false;
    seen.add(key);
    seen.add(shapeKey);
    return true;
  });
}

function centroid(points) {
  if (!points.length) return null;
  const sum = points.reduce((acc, point) => ({ lat: acc.lat + point.lat, lon: acc.lon + point.lon }), { lat: 0, lon: 0 });
  return { lat: sum.lat / points.length, lon: sum.lon / points.length };
}

function estimateArea(points) {
  if (points.length < 3) return 0;
  const avgLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const metersPerLon = 111320 * Math.cos((avgLat * Math.PI) / 180);
  const projected = points.map((point) => ({ x: point.lon * metersPerLon, y: point.lat * 110540 }));
  let area = 0;
  for (let i = 0; i < projected.length; i += 1) {
    const current = projected[i];
    const next = projected[(i + 1) % projected.length];
    area += current.x * next.y - next.x * current.y;
  }
  return Math.max(260, Math.round(Math.abs(area) / 2));
}

function estimateDimensions(points) {
  if (points.length < 3) return null;
  const avgLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const metersPerLon = 111320 * Math.cos((avgLat * Math.PI) / 180);
  const projected = points.map((point) => ({ x: point.lon * metersPerLon, y: point.lat * 110540 }));
  const xs = projected.map((point) => point.x);
  const ys = projected.map((point) => point.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const depth = Math.max(...ys) - Math.min(...ys);
  return {
    width: Math.max(1, Math.round(width)),
    depth: Math.max(1, Math.round(depth)),
  };
}

function readFloorCount(tags) {
  const value = Number(tags["building:levels"] || tags.levels);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

function renderListEmpty(container, text) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = text;
  container.append(empty);
}

function renderPlaceSelect(places, selectedId = "") {
  placeOptions.replaceChildren();
  state.pickerOptions = [];
  resetQuickPicker("選擇附近位置");
  addressInput.placeholder = "輸入住址、選附近位置，或在地圖長按";
  if (!places.length) {
    return;
  }

  places.forEach((place, index) => {
    const option = document.createElement("option");
    const label = place.meta ? `位置 #${index + 1} · ${place.name} · ${place.meta}` : `位置 #${index + 1} · ${place.name}`;
    option.value = label;
    placeOptions.append(option);
    const pickerIndex = state.pickerOptions.push({ kind: "place", id: place.id, label, value: label }) - 1;
    addQuickPickerOption(label, pickerIndex, place.id === selectedId);
    if (place.id === selectedId) addressInput.value = label;
  });
  quickPicker.hidden = false;
}

function renderBuildingSelect(buildings, selectedId = "", emptyText = "一公里內沒有可用建築資料") {
  placeOptions.replaceChildren();
  state.pickerOptions = [];
  resetQuickPicker("選擇附近位置 / 建築物");
  const places = state.places || [];
  places.forEach((place, index) => {
    const option = document.createElement("option");
    const label = place.meta ? `位置 #${index + 1} · ${place.name} · ${place.meta}` : `位置 #${index + 1} · ${place.name}`;
    option.value = label;
    placeOptions.append(option);
    const pickerIndex = state.pickerOptions.push({ kind: "place", id: place.id, label, value: label }) - 1;
    addQuickPickerOption(label, pickerIndex, place.id === state.selectedPlace?.id && !selectedId);
  });
  if (!buildings.length) {
    addressInput.placeholder = emptyText;
    quickPicker.hidden = !state.pickerOptions.length;
    return;
  }

  addressInput.placeholder = "選附近建築物或輸入住址";
  buildings.forEach((building, index) => {
    const option = document.createElement("option");
    const dimensions = building.dimensions ? `${building.dimensions.width}m x ${building.dimensions.depth}m` : "";
    const floors = building.floors ? `${building.floors} 層` : "";
    const coordinate = `${building.center.lat.toFixed(5)}, ${building.center.lon.toFixed(5)}`;
    const label = [`建築 #${index + 1}`, building.name, `${building.distance}m`, building.kind, `${Math.round(building.area)}m²`, dimensions, floors, building.source, coordinate].filter(Boolean).join(" · ");
    option.value = label;
    placeOptions.append(option);
    const pickerIndex = state.pickerOptions.push({ kind: "building", id: building.id, label, value: label }) - 1;
    addQuickPickerOption(label, pickerIndex, building.id === selectedId);
    if (building.id === selectedId) addressInput.value = label;
  });
  quickPicker.hidden = false;
}

function renderPlanEmpty(title, detail = "") {
  state.layoutHasDirection = false;
  floorPlan.replaceChildren();
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", "210");
  text.setAttribute("y", "142");
  text.setAttribute("class", "empty-plan-title");
  text.setAttribute("text-anchor", "middle");
  text.textContent = title;
  floorPlan.append(text);

  const meta = document.createElementNS("http://www.w3.org/2000/svg", "text");
  meta.setAttribute("x", "210");
  meta.setAttribute("y", "166");
  meta.setAttribute("class", "empty-plan-meta");
  meta.setAttribute("text-anchor", "middle");
  meta.textContent = detail;
  floorPlan.append(meta);
  renderTraceOverlay();
  resetLayoutBaseViewBox();
}

function renderEmptyState(title, detail, options = {}) {
  floorList.replaceChildren();
  sourceSummary.textContent = "資料來源：無可用結果";
  renderBuildingSelect([], "", title);
  renderPlanEmpty(title, detail);
  if (!options.keepLoading) hideLoading();
}

function applyBuildingResults(buildings, emptyTitle = "此位置沒有可用建築資料", options = {}) {
  hideLoading();
  state.buildings = buildings;
  state.selectedLayout = state.buildings[0] || null;
  state.selectedFloor = null;
  renderFootprints();
  floorList.replaceChildren();
  renderSourceSummary(state.buildings);

  if (!state.selectedLayout) {
    renderEmptyState(emptyTitle, "OSM / OpenBuildingMap 未提供可用 building polygon");
    setStatus(emptyTitle, 3, 72);
    hideLayoutView();
    return;
  }

  renderBuildingSelect(state.buildings, state.selectedLayout.id);
  resetTraceForLayout(state.selectedLayout);
  renderBuildingOutline(state.selectedLayout);
  renderFloorOptions(state.selectedLayout);
  setStatus(state.selectedLayout.floors ? "已取得建築物輪廓與尺寸，請確認樓層" : "已取得建築物輪廓與尺寸，公開資料未標註樓層", 3, 78);
  if (options.openLayout) {
    showLayoutView();
    startLayoutTracking();
  }
}

function renderSourceSummary(buildings) {
  if (!buildings.length) {
    sourceSummary.textContent = "資料來源：無可用結果";
    return;
  }
  const counts = buildings.reduce((acc, building) => {
    acc[building.source] = (acc[building.source] || 0) + 1;
    return acc;
  }, {});
  sourceSummary.textContent = `資料來源：${Object.entries(counts).map(([source, count]) => `${source} ${count}`).join(" / ")}`;
}

function renderFootprints(buildings = state.buildings) {
  buildingLayer.replaceChildren();
  const centerX = lonToPixel(state.center.lon, state.zoom);
  const centerY = latToPixel(state.center.lat, state.zoom);
  const rect = mapPanel.getBoundingClientRect();
  buildings.forEach((building, index) => {
    const footprint = document.createElement("div");
    const buildingX = lonToPixel(building.center.lon, state.zoom);
    const buildingY = latToPixel(building.center.lat, state.zoom);
    const dx = ((buildingX - centerX) / rect.width) * 100;
    const dy = ((buildingY - centerY) / rect.height) * 100;
    footprint.className = "building-footprint";
    footprint.classList.toggle("selected", building.id === state.selectedLayout?.id);
    footprint.style.left = `${50 + dx}%`;
    footprint.style.top = `${50 + dy}%`;
    footprint.style.width = `${Math.min(150, Math.max(54, Math.sqrt(building.area) * 2.2))}px`;
    footprint.style.height = `${Math.min(110, Math.max(36, Math.sqrt(building.area) * 1.35))}px`;
    footprint.style.setProperty("--angle", `${(index - 2) * 8}deg`);
    footprint.style.animationDelay = `${index * 80}ms`;
    buildingLayer.append(footprint);
  });
}

function projectGeometry(points) {
  const avgLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const metersPerLon = 111320 * Math.cos((avgLat * Math.PI) / 180);
  const projected = points.map((point) => ({ x: point.lon * metersPerLon, y: point.lat * -110540 }));
  const xs = projected.map((point) => point.x);
  const ys = projected.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const boxWidth = Math.max(1, maxX - minX);
  const boxHeight = Math.max(1, maxY - minY);
  const scale = Math.min(312 / boxWidth, 204 / boxHeight);
  const offsetX = 54 + (312 - boxWidth * scale) / 2;
  const offsetY = 56 + (204 - boxHeight * scale) / 2;

  return projected.map((point) => `${offsetX + (point.x - minX) * scale},${offsetY + (point.y - minY) * scale}`).join(" ");
}

function renderBuildingOutline(building) {
  floorPlan.replaceChildren();
  const dimensions = building.dimensions || { width: 0, depth: 0 };
  const points = projectGeometry(building.geometry);

  const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  polygon.setAttribute("points", points);
  polygon.setAttribute("class", "footprint-shape wall-draw");
  floorPlan.append(polygon);

  drawDimensionLine(54, 34, 366, 34, `${dimensions.width} m`);
  drawDimensionLine(382, 56, 382, 260, `${dimensions.depth} m`, true);

  const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
  title.setAttribute("x", "54");
  title.setAttribute("y", "286");
  title.setAttribute("class", "outline-label");
  title.textContent = `${Math.round(building.area)} m² · ${building.source}`;
  floorPlan.append(title);
  renderTraceOverlay();
  fitLayoutViewportToContent(18);
}

function renderFloorOptions(building) {
  floorList.replaceChildren();
  if (!building.floors) {
    return;
  }

  const label = document.createElement("p");
  label.className = "floor-help";
  label.textContent = `OSM 標註 ${building.floors} 層，請確認樓層`;
  floorList.append(label);

  const floorGrid = document.createElement("div");
  floorGrid.className = "floor-grid";
  const count = Math.min(building.floors, 30);
  for (let floor = 1; floor <= count; floor += 1) {
    const button = document.createElement("button");
    button.className = "floor-button";
    button.type = "button";
    button.textContent = `${floor}F`;
    button.classList.toggle("selected", floor === state.selectedFloor);
    button.addEventListener("click", () => confirmFloor(building, floor));
    floorGrid.append(button);
  }
  floorList.append(floorGrid);
}

function confirmFloor(building, floor) {
  state.selectedFloor = floor;
  renderFloorOptions(building);
  burst(54, 58);
  renderPlanEmpty("此樓層沒有公開室內 layout 資料", `${floor}F 已確認；目前資料只含建築外輪廓`);
  setStatus("已確認樓層，但沒有公開室內 layout 資料", 4, 100);
}

function drawDimensionLine(x1, y1, x2, y2, label, vertical = false) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("class", "dimension-line wall-draw");
  floorPlan.append(line);

  const startTick = document.createElementNS("http://www.w3.org/2000/svg", "line");
  const endTick = document.createElementNS("http://www.w3.org/2000/svg", "line");
  if (vertical) {
    startTick.setAttribute("x1", x1 - 7);
    startTick.setAttribute("y1", y1);
    startTick.setAttribute("x2", x1 + 7);
    startTick.setAttribute("y2", y1);
    endTick.setAttribute("x1", x2 - 7);
    endTick.setAttribute("y1", y2);
    endTick.setAttribute("x2", x2 + 7);
    endTick.setAttribute("y2", y2);
  } else {
    startTick.setAttribute("x1", x1);
    startTick.setAttribute("y1", y1 - 7);
    startTick.setAttribute("x2", x1);
    startTick.setAttribute("y2", y1 + 7);
    endTick.setAttribute("x1", x2);
    endTick.setAttribute("y1", y2 - 7);
    endTick.setAttribute("x2", x2);
    endTick.setAttribute("y2", y2 + 7);
  }
  startTick.setAttribute("class", "dimension-line");
  endTick.setAttribute("class", "dimension-line");
  floorPlan.append(startTick, endTick);

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", vertical ? x1 - 8 : (x1 + x2) / 2);
  text.setAttribute("y", vertical ? (y1 + y2) / 2 : y1 - 5);
  text.setAttribute("class", "dimension-label");
  text.setAttribute("text-anchor", vertical ? "middle" : "middle");
  if (vertical) {
    text.setAttribute("transform", `rotate(-90 ${x1 - 8} ${(y1 + y2) / 2})`);
  }
  text.textContent = label;
  floorPlan.append(text);
}

function drawFlow() {
  const ctx = flowCanvas.getContext("2d");
  const { width, height } = flowCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  flowCanvas.width = Math.round(width * dpr);
  flowCanvas.height = Math.round(height * dpr);
  ctx.scale(dpr, dpr);
  cancelAnimationFrame(state.animationFrame);
  ctx.clearRect(0, 0, width, height);
}

async function selectPlace(place) {
  const requestId = ++state.requestId;
  hideLayoutView();
  showLoading("正在下載附近建築資料", "讀取 OSM / OpenBuildingMap footprint，完成後會顯示 layout");
  state.selectedPlace = place;
  state.center = { lat: place.lat, lon: place.lon, label: place.name };
  addressInput.value = place.name;
  setPortalOrigin();
  markSelection();
  burst(48, 48);
  renderTiles(state.center);
  renderPlaceSelect(state.places, place.id);
  floorList.replaceChildren();
  renderPlanEmpty("正在查詢建築物輪廓", "只顯示公開資料中存在的 footprint");
  sourceSummary.textContent = "資料來源：查詢中";
  setStatus("正在下載附近建築 footprint", 3, 64);
  await sleep(320);
  const buildings = await fetchBuildings(place);
  if (requestId !== state.requestId) return;
  applyBuildingResults(buildings, "此位置沒有可用建築資料", { openLayout: true });
}

async function selectMapPoint(event, presetPoint = null) {
  if (state.view !== "map") return;
  if (event?.target?.closest("button")) return;
  if (state.suppressNextClick) {
    state.suppressNextClick = false;
    return;
  }

  const requestId = ++state.requestId;
  const point = presetPoint || pointFromMapClick(event);
  hideLayoutView();
  setPortalOrigin(point.xRatio, point.yRatio);
  const picked = {
    id: `picked-${Date.now()}`,
    name: "地圖選定位置",
    type: "map-point",
    lat: point.lat,
    lon: point.lon,
    meta: `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)} · 手動選點`,
  };

  state.selectedPlace = picked;
  state.selectedLayout = null;
  state.buildings = [];
  state.center = { lat: picked.lat, lon: picked.lon, label: picked.name };
  renderBuildingSelect([], "", "正在查詢一公里內的建築資料");
  showLoading("正在下載此位置附近資料", "反查地址，並讀取方圓一公里內的公開建築 footprint");
  floorList.replaceChildren();
  floorPlan.replaceChildren();
  buildingLayer.replaceChildren();
  sourceSummary.textContent = "資料來源：查詢中";

  markSelection(point.xRatio, point.yRatio);
  burst(point.xRatio * 100, point.yRatio * 100);
  renderTiles(state.center);
  state.places = [picked];
  renderPlaceSelect(state.places, picked.id);
  renderEmptyState("正在查詢此位置的開放建築資料", "只會顯示 OSM / OpenBuildingMap 實際 footprint", { keepLoading: true });
  sourceSummary.textContent = "資料來源：查詢中";
  addressInput.value = `${point.lat.toFixed(6)}, ${point.lon.toFixed(6)}`;
  setStatus("已鎖定地圖選點，查詢地址與一公里內建築", 3, 62);

  const addressPromise = reverseGeocode(point.lat, point.lon);
  const buildingsPromise = fetchBuildings(picked, { silent: true });
  const address = await addressPromise;
  if (requestId !== state.requestId) return;

  if (address) {
    picked.name = address.split(",").slice(0, 2).join(",");
    picked.meta = address;
    state.center.label = picked.name;
    addressInput.value = address;
  }

  state.places = [picked];
  renderPlaceSelect(state.places, picked.id);

  const buildings = await buildingsPromise;
  if (requestId !== state.requestId) return;

  markSelection();
  applyBuildingResults(buildings, "此位置沒有可用建築資料", { openLayout: true });
}

function startMapDrag(event) {
  if (event.target.closest("button")) return;
  event.preventDefault();
  updatePointerStore(state.mapPointers, event);
  if (state.mapPointers.size >= 2) {
    clearLongPress();
    state.drag = null;
    mapPanel.classList.remove("dragging");
    state.mapPinch = { distance: distanceBetweenPointers(state.mapPointers) };
    setStatus("兩指縮放地圖", 2, 46);
    return;
  }
  try {
    mapPanel.setPointerCapture(event.pointerId);
  } catch {
    // Some browsers can start pointer events without supporting capture here.
  }
  state.drag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    mapPoint: pointFromMapClick(event),
    moved: false,
  };
  clearLongPress();
  state.longPress = {
    pointerId: event.pointerId,
    triggered: false,
    timer: window.setTimeout(() => {
      if (!state.drag || state.drag.pointerId !== event.pointerId || state.drag.moved) return;
      state.longPress.triggered = true;
      selectMapPoint(event, state.drag.mapPoint);
    }, 900),
  };
  mapPanel.classList.add("dragging");
}

function moveMapDrag(event) {
  if (state.mapPointers.has(event.pointerId)) {
    event.preventDefault();
    updatePointerStore(state.mapPointers, event);
  }
  if (state.mapPinch && state.mapPointers.size >= 2) {
    const distance = distanceBetweenPointers(state.mapPointers);
    if (!distance) return;
    const ratio = distance / state.mapPinch.distance;
    if (ratio > 1.16) {
      zoomMap(1, event);
      state.mapPinch.distance = distance;
    } else if (ratio < 0.86) {
      zoomMap(-1, event);
      state.mapPinch.distance = distance;
    }
    return;
  }
  if (!state.drag || state.drag.pointerId !== event.pointerId) return;
  const totalDx = event.clientX - state.drag.startX;
  const totalDy = event.clientY - state.drag.startY;
  if (Math.hypot(totalDx, totalDy) < LONG_PRESS_MOVE_TOLERANCE) return;

  state.drag.moved = true;
  clearLongPress();
  tileGrid.style.transform = `translate3d(${totalDx}px, ${totalDy}px, 0)`;
  buildingLayer.style.transform = `translate3d(${totalDx}px, ${totalDy}px, 0)`;
}

function endMapDrag(event) {
  state.mapPointers.delete(event.pointerId);
  if (state.mapPinch) {
    if (state.mapPointers.size < 2) state.mapPinch = null;
    clearLongPress();
    state.drag = null;
    mapPanel.classList.remove("dragging");
    return;
  }
  if (!state.drag || state.drag.pointerId !== event.pointerId) return;
  const totalDx = event.clientX - state.drag.startX;
  const totalDy = event.clientY - state.drag.startY;
  const longPressTriggered = state.longPress?.triggered;
  state.suppressNextClick = state.drag.moved || longPressTriggered;
  if (state.drag.moved) {
    tileGrid.style.transform = "";
    buildingLayer.style.transform = "";
    moveMapByScreenDelta(totalDx, totalDy);
  } else if (!longPressTriggered) {
    setStatus("長按地圖可選定位置，拖拉或縮放可調整視角", 2, 42);
  }
  state.drag = null;
  clearLongPress();
  mapPanel.classList.remove("dragging");
  try {
    mapPanel.releasePointerCapture(event.pointerId);
  } catch {
    // Pointer capture can already be released by the browser.
  }
}

function startLayoutHold(event) {
  if (event.target.closest("button")) return;
  event.preventDefault();
  updatePointerStore(state.layoutPointers, event);
  if (state.layoutPointers.size >= 2) {
    clearLayoutHold();
    state.layoutPinch = { distance: distanceBetweenPointers(state.layoutPointers) };
    setStatus("兩指縮放 layout", 4, 100);
    return;
  }
  const startX = event.clientX;
  const startY = event.clientY;
  const layoutPoint = pointFromLayoutEvent(event);
  clearLayoutHold();
  state.layoutHold = {
    pointerId: event.pointerId,
    startX,
    startY,
    lastX: startX,
    lastY: startY,
    layoutPoint,
    panning: false,
    triggered: false,
    timer: window.setTimeout(() => {
      if (!state.layoutHold || state.layoutHold.pointerId !== event.pointerId || state.layoutHold.triggered) return;
      state.layoutHold.triggered = true;
      setTraceAnchor(state.layoutHold.layoutPoint, { startTracking: true });
    }, 700),
  };
}

function moveLayoutHold(event) {
  if (state.layoutPointers.has(event.pointerId)) {
    event.preventDefault();
    updatePointerStore(state.layoutPointers, event);
  }
  if (state.layoutPinch && state.layoutPointers.size >= 2) {
    const distance = distanceBetweenPointers(state.layoutPointers);
    if (!distance) return;
    const ratio = distance / state.layoutPinch.distance;
    if (ratio > 1.08) {
      zoomLayout(0.25);
      state.layoutPinch.distance = distance;
    } else if (ratio < 0.92) {
      zoomLayout(-0.25);
      state.layoutPinch.distance = distance;
    }
    return;
  }
  if (!state.layoutHold || state.layoutHold.pointerId !== event.pointerId) return;
  const moved = Math.hypot(event.clientX - state.layoutHold.startX, event.clientY - state.layoutHold.startY);
  if (state.layoutZoom > 1 && (state.layoutHold.panning || moved > 4)) {
    if (!state.layoutHold.panning) {
      clearLayoutHold();
      state.layoutHold = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        panning: true,
        triggered: false,
      };
      return;
    }
    panLayoutByPixels(event.clientX - state.layoutHold.lastX, event.clientY - state.layoutHold.lastY);
    state.layoutHold.lastX = event.clientX;
    state.layoutHold.lastY = event.clientY;
    return;
  }
  if (moved > LONG_PRESS_MOVE_TOLERANCE) clearLayoutHold();
}

function endLayoutHold(event) {
  state.layoutPointers.delete(event.pointerId);
  if (state.layoutPinch) {
    if (state.layoutPointers.size < 2) state.layoutPinch = null;
    clearLayoutHold();
    return;
  }
  if (!state.layoutHold || state.layoutHold.pointerId !== event.pointerId) return;
  clearLayoutHold();
}

function selectBuilding(layout) {
  if (!layout) return;
  state.selectedLayout = layout;
  state.selectedFloor = null;
  resetTraceForLayout(layout);
  burst(63, 42);
  renderFootprints();
  renderBuildingSelect(state.buildings, layout.id);
  renderBuildingOutline(layout);
  renderFloorOptions(layout);
  showLayoutView();
  startLayoutTracking();
  setStatus(layout.floors ? "已選定建築物輪廓，請確認樓層" : "已選定建築物輪廓，公開資料未標註樓層", 3, 82);
}

async function boot() {
  const requestId = ++state.requestId;
  hideLoading();
  setStatus("透過 IP 讀取大略位置", 1, 10);
  renderTiles();
  drawFlow();
  burst();
  const center = await locateByIp();
  if (requestId !== state.requestId) return;
  state.center = center;
  renderTiles(center);
  await sleep(420);
  const places = await fetchNearbyPlaces(center);
  if (requestId !== state.requestId) return;
  state.places = places;
  renderPlaceSelect(state.places);
  if (!state.places.length) {
    setStatus("可手動輸入住址，或在地圖長按選定位置", 2, 36);
    return;
  }
  setStatus("可手動輸入住址、選擇附近位置，或在地圖長按選點", 2, 42);
}

function usePickerSelection() {
  window.clearTimeout(state.pickerTimer);
  state.pickerTimer = window.setTimeout(() => {
    activatePickerOption(selectedPickerOption());
  }, 80);
}

function useQuickPickerSelection() {
  const option = selectedQuickPickerOption();
  if (!option) return;
  addressInput.value = option.label;
  activatePickerOption(option);
}

function handleAddressKeydown(event) {
  if (event.key !== "Enter" || event.isComposing) return;
  searchAddress(event);
}

async function searchAddress(event) {
  event?.preventDefault();
  if (activatePickerOption(selectedPickerOption())) return;

  const query = addressInput.value.trim();
  if (!query) return;

  const requestId = ++state.requestId;
  clearLongPress();
  hideLayoutView();
  state.drag = null;
  state.selectedPlace = null;
  state.selectedLayout = null;
  setStatus("搜尋地址座標", 1, 22);
  showLoading("正在定位地址", "使用 OpenStreetMap Nominatim 找座標");
  floorList.replaceChildren();
  renderBuildingSelect([], "", "正在查詢一公里內的建築資料");
  renderPlanEmpty("正在搜尋地址", "使用 OpenStreetMap Nominatim");
  sourceSummary.textContent = "資料來源：查詢中";

  try {
    const place = await geocodeAddress(query);
    if (requestId !== state.requestId) return;
    if (!place) {
      state.places = [];
      renderPlaceSelect(state.places);
      renderEmptyState("找不到此地址", "請換一個更完整的地址或地標名稱");
      setStatus("找不到此地址", 1, 20);
      return;
    }

    state.center = { lat: place.lat, lon: place.lon, label: place.name };
    state.selectedPlace = place;
    addressInput.value = place.meta || place.name;
    setPortalOrigin();
    markSelection();
    renderTiles(state.center);
    renderPlaceSelect([place], place.id);
    setStatus("地址已定位，查詢附近資料", 2, 46);
    showLoading("正在下載附近建築資料", "讀取 OSM / OpenBuildingMap footprint，完成後會顯示 layout");

    const [nearbyPlaces, buildings] = await Promise.all([
      fetchNearbyPlaces(state.center, { silent: true }),
      fetchBuildings(place, { silent: true }),
    ]);
    if (requestId !== state.requestId) return;

    state.places = [place, ...nearbyPlaces.filter((nearby) => nearby.id !== place.id)].slice(0, 7);
    renderPlaceSelect(state.places, place.id);
    applyBuildingResults(buildings, "此位置沒有可用建築資料", { openLayout: true });
  } catch {
    if (requestId !== state.requestId) return;
    renderEmptyState("地址定位失敗", "目前無法取得地址座標");
    setStatus("地址定位失敗", 1, 20);
  }
}

function exportSvg() {
  const blob = new Blob([floorPlan.outerHTML], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.selectedLayout?.name || "floor-plan"}.svg`;
  link.click();
  URL.revokeObjectURL(url);
}

locateButton.addEventListener("click", () => {
  if (state.view === "layout") {
    showMapView();
    return;
  }
  boot();
});
addressForm.addEventListener("submit", searchAddress);
addressInput.addEventListener("input", usePickerSelection);
addressInput.addEventListener("change", usePickerSelection);
addressInput.addEventListener("keydown", handleAddressKeydown);
quickPicker.addEventListener("change", useQuickPickerSelection);
zoomInButton.addEventListener("click", () => zoomMap(1));
zoomOutButton.addEventListener("click", () => zoomMap(-1));
layoutZoomInButton.addEventListener("click", () => zoomLayout(0.25));
layoutZoomOutButton.addEventListener("click", () => zoomLayout(-0.25));
floorPlan.addEventListener("pointerdown", startLayoutHold);
floorPlan.addEventListener("pointermove", moveLayoutHold);
floorPlan.addEventListener("pointerup", endLayoutHold);
floorPlan.addEventListener("pointercancel", endLayoutHold);
floorPlan.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  setTraceAnchor(pointFromLayoutEvent(event), { startTracking: true });
});
floorPlan.addEventListener("wheel", (event) => {
  event.preventDefault();
  zoomLayout(event.deltaY < 0 ? 0.25 : -0.25);
}, { passive: false });
mapPanel.addEventListener("pointerdown", startMapDrag);
mapPanel.addEventListener("pointermove", moveMapDrag);
mapPanel.addEventListener("pointerup", endMapDrag);
mapPanel.addEventListener("pointercancel", endMapDrag);
mapPanel.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  selectMapPoint(event);
});
mapPanel.addEventListener("wheel", (event) => {
  event.preventDefault();
  zoomMap(event.deltaY < 0 ? 1 : -1, event);
}, { passive: false });
["gesturestart", "gesturechange", "gestureend"].forEach((eventName) => {
  document.addEventListener(eventName, (event) => event.preventDefault(), { passive: false });
});
refreshPlaces.addEventListener("click", async () => {
  state.places = await fetchNearbyPlaces(state.center);
  renderPlaceSelect(state.places, state.selectedPlace?.id);
});
exportButton.addEventListener("click", exportSvg);
window.addEventListener("resize", () => {
  drawFlow();
  renderTiles(state.center);
  renderFootprints();
});

boot();

import Konva from 'konva';

type SnapAsset = { id: string; label: string; asset: string };
type SnapFrame = SnapAsset & { frame: string };
type SnapFormat = { id: string; label: string; ratio: string; width: number; height: number };
type SnapConfig = { modes: SnapFrame[]; stickers: SnapAsset[]; poses: SnapAsset[]; formats: SnapFormat[] };

const configElement = document.querySelector('#snap-config');
const config = JSON.parse(configElement?.textContent ?? '{}') as SnapConfig;
const captureScreen = document.querySelector<HTMLElement>('[data-snap-capture-screen]');
const editorScreen = document.querySelector<HTMLElement>('[data-snap-editor-screen]');
const resultScreen = document.querySelector<HTMLElement>('[data-snap-result-screen]');
const video = document.querySelector<HTMLVideoElement>('[data-snap-video]');
const uploadInput = document.querySelector<HTMLInputElement>('[data-snap-upload-input]');
const placeholder = document.querySelector<HTMLElement>('[data-snap-capture-placeholder]');
const captureButton = document.querySelector<HTMLButtonElement>('[data-snap-capture]');
const switchCameraButton = document.querySelector<HTMLButtonElement>('[data-snap-switch-camera]');
const status = document.querySelector<HTMLElement>('[data-snap-status]');
const stageContainer = document.querySelector<HTMLDivElement>('#snap-editor-stage');
const resultImage = document.querySelector<HTMLImageElement>('[data-snap-result]');
const formatLabel = document.querySelector<HTMLElement>('[data-snap-stage-format]');
const elementSizeInput = document.querySelector<HTMLInputElement>('[data-snap-element-size]');
const elementSizeValue = document.querySelector<HTMLOutputElement>('[data-snap-element-size-value]');

let stream: MediaStream | null = null;
let sourceImage: HTMLImageElement | null = null;
let stage: any = null;
let baseLayer: any = null;
let overlayLayer: any = null;
let uiLayer: any = null;
let baseNode: any = null;
let frameNode: any = null;
let transformer: any = null;
let selectedNode: any = null;
let activeFrame = config.modes[0]?.id ?? 'none';
let activePose = config.poses[0]?.id ?? '';
let activeSticker = 'none';
let activeFormat = 'story';
let facingMode: 'user' | 'environment' = 'user';
let stageWidth = 540;
let stageHeight = 960;
const imageCache = new Map<string, HTMLImageElement>();
const activePointers = new Map<number, { x: number; y: number }>();
let touchGesture: { node: any; distance: number; angle: number; scaleX: number; scaleY: number; rotation: number } | null = null;

const setStatus = (message: string, tone = '') => {
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = tone;
};

const showScreen = (screen: 'capture' | 'editor' | 'result') => {
  if (captureScreen) captureScreen.hidden = screen !== 'capture';
  if (editorScreen) editorScreen.hidden = screen !== 'editor';
  if (resultScreen) resultScreen.hidden = screen !== 'result';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const setPressed = (selector: string, dataKey: string, value: string) => {
  document.querySelectorAll<HTMLElement>(selector).forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset[dataKey] === value));
  });
};

const stopStream = () => {
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  if (video) video.srcObject = null;
};

const startCamera = async () => {
  showScreen('capture');
  setStatus('Abrindo câmera…');
  const localSafeContext = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  if (!window.isSecureContext && !localSafeContext) {
    setStatus('A câmera exige HTTPS. Escolha uma foto da galeria para continuar.', 'error');
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus('Este navegador não oferece câmera. Escolha uma foto da galeria.', 'error');
    return;
  }
  stopStream();
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode }, width: { ideal: 1080 }, height: { ideal: 1920 } },
      audio: false,
    });
    if (!video) return;
    video.srcObject = stream;
    await video.play();
    video.hidden = false;
    if (placeholder) placeholder.hidden = true;
    if (captureButton) captureButton.hidden = false;
    if (switchCameraButton) switchCameraButton.hidden = false;
    setStatus('Câmera pronta. Tire sua foto para abrir o editor.');
  } catch (error) {
    const denied = error instanceof DOMException && ['NotAllowedError', 'PermissionDeniedError'].includes(error.name);
    const insecure = error instanceof DOMException && error.name === 'SecurityError';
    setStatus(
      insecure
        ? 'A câmera exige HTTPS. Escolha uma foto da galeria para continuar.'
        : denied
          ? 'A câmera foi bloqueada. Autorize o acesso ou escolha uma foto da galeria.'
          : 'Não foi possível abrir a câmera. Escolha uma foto da galeria.',
      'error',
    );
  }
};

const switchCamera = async () => {
  facingMode = facingMode === 'user' ? 'environment' : 'user';
  await startCamera();
};

const openUpload = () => uploadInput?.click();

const loadImage = (url: string) => {
  const cached = imageCache.get(url);
  if (cached) return Promise.resolve(cached);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => { imageCache.set(url, image); resolve(image); };
    image.onerror = () => reject(new Error(`Não foi possível carregar o asset ${url}.`));
    image.src = url;
  });
};

const loadSourceFile = (file: File) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = async () => {
    URL.revokeObjectURL(url);
    sourceImage = image;
    stopStream();
    if (video) video.hidden = true;
    if (placeholder) placeholder.hidden = false;
    if (captureButton) captureButton.hidden = true;
    if (switchCameraButton) switchCameraButton.hidden = true;
    setStatus('Imagem escolhida. Abrindo o editor…');
    await initializeStage();
    showScreen('editor');
    setStatus('Imagem pronta. Agora monte seu Snap.');
  };
  image.onerror = () => { URL.revokeObjectURL(url); setStatus('Não foi possível abrir essa imagem. Tente outra.', 'error'); };
  image.src = url;
};

const capturePhoto = async () => {
  if (!video || video.readyState < 2) {
    setStatus('A câmera ainda está carregando. Tente novamente em um instante.', 'error');
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  if (!context) { setStatus('Não foi possível congelar a imagem da câmera.', 'error'); return; }
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const image = new Image();
  image.onload = async () => {
    sourceImage = image;
    stopStream();
    if (video) video.hidden = true;
    if (placeholder) placeholder.hidden = false;
    if (captureButton) captureButton.hidden = true;
    if (switchCameraButton) switchCameraButton.hidden = true;
    setStatus('Foto capturada. Abrindo o editor…');
    await initializeStage();
    showScreen('editor');
    setStatus('Imagem pronta. Agora monte seu Snap.');
  };
  image.src = canvas.toDataURL('image/jpeg', .92);
};

const coverAttributes = (image: HTMLImageElement) => {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const stageRatio = stageWidth / stageHeight;
  if (imageRatio > stageRatio) {
    const cropWidth = image.naturalHeight * stageRatio;
    return { x: 0, y: 0, width: stageWidth, height: stageHeight, crop: { x: (image.naturalWidth - cropWidth) / 2, y: 0, width: cropWidth, height: image.naturalHeight } };
  }
  const cropHeight = image.naturalWidth / stageRatio;
  return { x: 0, y: 0, width: stageWidth, height: stageHeight, crop: { x: 0, y: (image.naturalHeight - cropHeight) / 2, width: image.naturalWidth, height: cropHeight } };
};

const refreshSelectionControls = () => {
  const hasSelection = Boolean(selectedNode);
  const selectedWidth = hasSelection ? selectedNode.width() * Math.abs(selectedNode.scaleX()) : 0;
  const percent = hasSelection ? Math.round((selectedWidth / stageWidth) * 100) : 0;
  if (elementSizeInput) elementSizeInput.disabled = !hasSelection;
  if (elementSizeInput && hasSelection) elementSizeInput.value = String(Math.max(10, Math.min(180, percent)));
  if (elementSizeValue) elementSizeValue.textContent = hasSelection ? `${percent}%` : '—';
  document.querySelectorAll<HTMLButtonElement>('[data-snap-mirror], [data-snap-rotate-right], [data-snap-bring-front], [data-snap-send-back], [data-snap-duplicate], [data-snap-delete]').forEach((button) => {
    button.disabled = !hasSelection;
  });
};

const selectNode = (node: any | null) => {
  selectedNode = node;
  transformer?.nodes(node ? [node] : []);
  refreshSelectionControls();
  overlayLayer?.draw();
  uiLayer?.draw();
};

const updateVisibility = () => {
  if (frameNode) frameNode.visible(activeFrame !== 'none');
  overlayLayer?.find('.snap-mascot, .snap-sticker').forEach((node: any) => node.visible(true));
  overlayLayer?.draw();
};

const bindOverlayEvents = (node: any) => {
  node.on('click tap', () => selectNode(node));
  node.on('dragend transformend', () => {
    refreshSelectionControls();
    overlayLayer?.draw();
  });
};

const addOverlay = async (assetUrl: string, kind: 'mascot' | 'sticker') => {
  if (!stage || !overlayLayer) return;
  const image = await loadImage(assetUrl);
  const targetWidth = kind === 'mascot' ? stageWidth * .45 : stageWidth * .24;
  const scale = targetWidth / image.naturalWidth;
  const node = new Konva.Image({
    image,
    x: (stageWidth - image.naturalWidth * scale) / 2,
    y: (stageHeight - image.naturalHeight * scale) / 2,
    width: image.naturalWidth,
    height: image.naturalHeight,
    scaleX: scale,
    scaleY: scale,
    draggable: true,
    name: kind === 'mascot' ? 'snap-mascot' : 'snap-sticker',
  });
  node.setAttr('snapKind', kind);
  node.setAttr('snapSource', assetUrl);
  bindOverlayEvents(node);
  overlayLayer.add(node);
  if (frameNode) frameNode.moveToTop();
  selectNode(node);
  updateVisibility();
};

const setFrame = async (frameId: string) => {
  activeFrame = frameId;
  setPressed('[data-snap-frame-id]', 'snapFrameId', activeFrame);
  if (!stage || !overlayLayer) return;
  const frame = config.modes.find((item) => item.id === frameId);
  if (frame) {
    const image = await loadImage(frame.frame);
    if (!frameNode) {
      frameNode = new Konva.Image({ image, x: 0, y: 0, width: stageWidth, height: stageHeight, listening: false });
      overlayLayer.add(frameNode);
    } else {
      frameNode.image(image);
      frameNode.setAttrs({ x: 0, y: 0, width: stageWidth, height: stageHeight });
    }
    frameNode.moveToTop();
  }
  updateVisibility();
};

const setPose = async (poseId: string) => {
  activePose = poseId;
  setPressed('[data-snap-pose-id]', 'snapPoseId', activePose);
  const pose = config.poses.find((item) => item.id === poseId);
  if (pose) await addOverlay(pose.asset, 'mascot');
};

const clearMascots = () => {
  overlayLayer?.find('.snap-mascot').forEach((node: any) => node.destroy());
  if (selectedNode?.getAttr('snapKind') === 'mascot') selectNode(null);
  overlayLayer?.draw();
};

const clearStickers = () => {
  overlayLayer?.find('.snap-sticker').forEach((node: any) => node.destroy());
  if (selectedNode?.getAttr('snapKind') === 'sticker') selectNode(null);
  overlayLayer?.draw();
};

const setSticker = async (stickerId: string) => {
  activeSticker = stickerId;
  setPressed('[data-snap-sticker-id]', 'snapStickerId', activeSticker);
  if (stickerId === 'none') {
    clearStickers();
    return;
  }
  const sticker = config.stickers.find((item) => item.id === stickerId);
  if (sticker) await addOverlay(sticker.asset, 'sticker');
};

const updateFormat = (formatId: string) => {
  activeFormat = formatId;
  setPressed('[data-snap-format-id]', 'snapFormatId', activeFormat);
  const format = config.formats.find((item) => item.id === formatId) ?? config.formats[0];
  stageWidth = 540;
  stageHeight = Math.round(stageWidth * (format.height / format.width));
  if (stage) {
    stage.size({ width: stageWidth, height: stageHeight });
    if (stageContainer) stageContainer.style.aspectRatio = `${format.width} / ${format.height}`;
    if (baseNode && sourceImage) baseNode.setAttrs(coverAttributes(sourceImage));
    if (frameNode) frameNode.setAttrs({ x: 0, y: 0, width: stageWidth, height: stageHeight });
    stage.draw();
  }
  if (formatLabel) formatLabel.textContent = format.label.toUpperCase();
};

const initializeStage = async () => {
  if (!stageContainer || !sourceImage) return;
  if (!stage) {
    stage = new Konva.Stage({ container: stageContainer, width: stageWidth, height: stageHeight });
    baseLayer = new Konva.Layer();
    overlayLayer = new Konva.Layer();
    uiLayer = new Konva.Layer();
    stage.add(baseLayer, overlayLayer, uiLayer);
    stage.on('click tap', (event: any) => { if (event.target === stage) selectNode(null); });
    transformer = new Konva.Transformer({ rotateEnabled: true, keepRatio: true, enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'], borderStroke: '#ffc928', anchorStroke: '#ffc928', anchorFill: '#08111f', anchorSize: 12 });
    uiLayer.add(transformer);
    baseNode = new Konva.Image({ image: sourceImage, listening: false });
    baseLayer.add(baseNode);

    stage.on('pointerdown', (event: any) => {
      const pointer = event.evt as PointerEvent;
      if (pointer.pointerType !== 'touch') return;
      activePointers.set(pointer.pointerId, { x: pointer.clientX, y: pointer.clientY });
      if (activePointers.size === 2 && selectedNode) {
        const points = [...activePointers.values()];
        touchGesture = {
          node: selectedNode,
          distance: Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y),
          angle: Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x),
          scaleX: selectedNode.scaleX(),
          scaleY: selectedNode.scaleY(),
          rotation: selectedNode.rotation(),
        };
        selectedNode.draggable(false);
      }
    });
    stage.on('pointermove', (event: any) => {
      const pointer = event.evt as PointerEvent;
      if (pointer.pointerType !== 'touch' || !activePointers.has(pointer.pointerId) || !touchGesture) return;
      activePointers.set(pointer.pointerId, { x: pointer.clientX, y: pointer.clientY });
      if (activePointers.size !== 2 || touchGesture.node !== selectedNode) return;
      const points = [...activePointers.values()];
      const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
      const angle = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);
      const factor = Math.max(.15, Math.min(5, distance / Math.max(1, touchGesture.distance)));
      selectedNode.scaleX(touchGesture.scaleX * factor);
      selectedNode.scaleY(touchGesture.scaleY * factor);
      selectedNode.rotation(touchGesture.rotation + ((angle - touchGesture.angle) * 180) / Math.PI);
      refreshSelectionControls();
      overlayLayer.draw();
      uiLayer.draw();
    });
    stage.on('pointerup pointercancel', (event: any) => {
      const pointer = event.evt as PointerEvent;
      if (pointer.pointerType !== 'touch') return;
      activePointers.delete(pointer.pointerId);
      if (activePointers.size < 2 && touchGesture) {
        touchGesture.node.draggable(true);
        touchGesture = null;
        refreshSelectionControls();
      }
    });
  }
  baseNode.image(sourceImage);
  baseNode.setAttrs(coverAttributes(sourceImage));
  await setFrame(activeFrame);
  if (!overlayLayer.findOne('.snap-mascot')) {
    const pose = config.poses.find((item) => item.id === activePose) ?? config.poses[0];
    if (pose) await addOverlay(pose.asset, 'mascot');
  }
  stage.draw();
};

const bringFront = () => {
  if (!selectedNode) return;
  selectedNode.moveToTop();
  overlayLayer?.draw();
  uiLayer?.draw();
};

const sendBack = () => {
  if (!selectedNode) return;
  selectedNode.moveToBottom();
  overlayLayer?.draw();
  uiLayer?.draw();
};

const duplicateSelected = () => {
  if (!selectedNode || !overlayLayer) return;
  const clone = selectedNode.clone({ x: selectedNode.x() + 20, y: selectedNode.y() + 20 });
  bindOverlayEvents(clone);
  overlayLayer.add(clone);
  selectNode(clone);
  updateVisibility();
};

const dataUrlToBlob = async (dataUrl: string) => (await fetch(dataUrl)).blob();

const exportSnap = async () => {
  if (!stage) return;
  setStatus('Gerando sua imagem…');
  selectNode(null);
  transformer?.visible(false);
  uiLayer?.draw();
  const format = config.formats.find((item) => item.id === activeFormat) ?? config.formats[0];
  const dataUrl = stage.toDataURL({ mimeType: 'image/png', pixelRatio: format.width / stageWidth });
  transformer?.visible(true);
  uiLayer?.draw();
  resultImage?.setAttribute('src', dataUrl);
  showScreen('result');
  setStatus('Seu Snap está pronto!', 'success');
};

const downloadSnap = async () => {
  const src = resultImage?.src;
  if (!src) return;
  const link = document.createElement('a');
  link.href = src;
  link.download = `fgf-snap-${activeFormat}-2026.png`;
  link.click();
  setStatus('Imagem salva no dispositivo.', 'success');
};

const shareSnap = async () => {
  const src = resultImage?.src;
  if (!src) return;
  const blob = await dataUrlToBlob(src);
  const file = new File([blob], `fgf-snap-${activeFormat}-2026.png`, { type: 'image/png' });
  try {
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({ title: 'Family Game Festival 2026', text: 'Meu Snap no Family Game Festival 2026! 🎮✨', files: [file] });
      setStatus('Snap compartilhado!', 'success');
      return;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
  }
  await downloadSnap();
  setStatus('Seu navegador não permite compartilhamento direto. A imagem foi salva.', 'success');
};

document.body.classList.add('snap-page');
document.querySelector('[data-snap-start-camera]')?.addEventListener('click', () => void startCamera());
switchCameraButton?.addEventListener('click', () => void switchCamera());
document.querySelector('[data-snap-capture]')?.addEventListener('click', () => void capturePhoto());
document.querySelectorAll('[data-snap-upload]').forEach((button) => button.addEventListener('click', openUpload));
document.querySelector('[data-snap-change-source]')?.addEventListener('click', () => { stopStream(); showScreen('capture'); setStatus('Escolha outra imagem para começar de novo.'); });
uploadInput?.addEventListener('change', () => { const file = uploadInput.files?.[0]; if (file) loadSourceFile(file); uploadInput.value = ''; });
document.querySelectorAll<HTMLElement>('[data-snap-frame-id]').forEach((button) => button.addEventListener('click', () => { void setFrame(button.dataset.snapFrameId ?? 'none'); }));
document.querySelectorAll<HTMLElement>('[data-snap-pose-id]').forEach((button) => button.addEventListener('click', () => { void setPose(button.dataset.snapPoseId ?? activePose); }));
document.querySelectorAll<HTMLElement>('[data-snap-sticker-id]').forEach((button) => button.addEventListener('click', () => { void setSticker(button.dataset.snapStickerId ?? 'none'); }));
document.querySelector('[data-snap-clear-mascots]')?.addEventListener('click', clearMascots);
document.querySelector('[data-snap-clear-stickers]')?.addEventListener('click', clearStickers);
document.querySelector('[data-snap-rotate-right]')?.addEventListener('click', () => { if (selectedNode) { selectedNode.rotation(selectedNode.rotation() + 15); overlayLayer.draw(); uiLayer.draw(); } });
document.querySelector('[data-snap-mirror]')?.addEventListener('click', () => { if (selectedNode) { selectedNode.scaleX(-selectedNode.scaleX()); overlayLayer.draw(); uiLayer.draw(); } });
document.querySelector('[data-snap-bring-front]')?.addEventListener('click', bringFront);
document.querySelector('[data-snap-send-back]')?.addEventListener('click', sendBack);
document.querySelector('[data-snap-duplicate]')?.addEventListener('click', duplicateSelected);
document.querySelector('[data-snap-delete]')?.addEventListener('click', () => { if (selectedNode) { selectedNode.destroy(); selectNode(null); overlayLayer.draw(); } });
elementSizeInput?.addEventListener('input', () => { if (!selectedNode) return; const targetWidth = stageWidth * (Number(elementSizeInput.value) / 100); const currentWidth = selectedNode.width() * Math.abs(selectedNode.scaleX()) || 1; const factor = targetWidth / currentWidth; selectedNode.scaleX(selectedNode.scaleX() * factor); selectedNode.scaleY(selectedNode.scaleY() * factor); overlayLayer.draw(); uiLayer.draw(); refreshSelectionControls(); });
document.querySelectorAll<HTMLElement>('[data-snap-format-id]').forEach((button) => button.addEventListener('click', () => updateFormat(button.dataset.snapFormatId ?? activeFormat)));
document.querySelector('[data-snap-export]')?.addEventListener('click', () => void exportSnap());
document.querySelector('[data-snap-download]')?.addEventListener('click', () => void downloadSnap());
document.querySelector('[data-snap-share]')?.addEventListener('click', () => void shareSnap());
document.querySelector('[data-snap-edit-again]')?.addEventListener('click', () => { showScreen('editor'); setStatus('Você pode continuar ajustando seu Snap.'); });
window.addEventListener('pagehide', stopStream);

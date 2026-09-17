import Konva from 'konva';

type SnapAsset = { id: string; label: string; asset: string };
type SnapFrame = SnapAsset & { frame: string };
type SnapFormat = { id: string; label: string; ratio: string; width: number; height: number };
type SnapConfig = { modes: SnapFrame[]; stickers: SnapAsset[]; poses: SnapAsset[]; formats: SnapFormat[] };
type SheetState = 'closed' | 'half' | 'expanded';
type TouchGesture = {
  node: any;
  distance: number;
  angle: number;
  midpoint: { x: number; y: number };
  nodePosition: { x: number; y: number };
  scaleX: number;
  scaleY: number;
  rotation: number;
};

const configElement = document.querySelector('#snap-config');
const config = JSON.parse(configElement?.textContent ?? '{}') as SnapConfig;
const captureScreen = document.querySelector<HTMLElement>('[data-snap-capture-screen]');
const editorScreen = document.querySelector<HTMLElement>('[data-snap-editor-screen]');
const resultScreen = document.querySelector<HTMLElement>('[data-snap-result-screen]');
const cameraInput = document.querySelector<HTMLInputElement>('[data-snap-camera-input]');
const galleryInput = document.querySelector<HTMLInputElement>('[data-snap-gallery-input]');
const status = document.querySelector<HTMLElement>('[data-snap-status]');
const stageContainer = document.querySelector<HTMLDivElement>('#snap-editor-stage');
const canvasWrap = document.querySelector<HTMLElement>('[data-snap-canvas-wrap]');
const resultImage = document.querySelector<HTMLImageElement>('[data-snap-result]');
const formatLabel = document.querySelector<HTMLElement>('[data-snap-format-label]');
const formatToggle = document.querySelector<HTMLButtonElement>('[data-snap-format-toggle]');
const formatMenu = document.querySelector<HTMLElement>('[data-snap-format-menu]');
const editorShell = document.querySelector<HTMLElement>('[data-snap-editor-shell]');
const sheet = document.querySelector<HTMLElement>('[data-snap-sheet]');
const sheetContent = document.querySelector<HTMLElement>('[data-snap-sheet-content]');
const sheetTitle = document.querySelector<HTMLElement>('[data-snap-sheet-title]');
const sheetClose = document.querySelector<HTMLButtonElement>('[data-snap-sheet-close]');
const sheetHandle = document.querySelector<HTMLButtonElement>('[data-snap-sheet-handle]');
const contextToolbar = document.querySelector<HTMLElement>('[data-snap-context-toolbar]');
const moreMenu = document.querySelector<HTMLElement>('[data-snap-more-menu]');
const trash = document.querySelector<HTMLElement>('[data-snap-trash]');

let sourceImage: HTMLImageElement | null = null;
let stage: any = null;
let baseLayer: any = null;
let overlayLayer: any = null;
let uiLayer: any = null;
let baseNode: any = null;
let frameNode: any = null;
let frameImage: HTMLImageElement | null = null;
let transformer: any = null;
let selectedNode: any = null;
let activeFrame = config.modes[0]?.id ?? 'none';
let activeFormat = 'story';
let virtualWidth = config.formats.find((format) => format.id === activeFormat)?.width ?? 1080;
let virtualHeight = config.formats.find((format) => format.id === activeFormat)?.height ?? 1920;
let activeCategory = 'frame';
let sheetState: SheetState = 'closed';
const imageCache = new Map<string, HTMLImageElement>();
let touchGesture: TouchGesture | null = null;
let trashActive = false;
let sheetDragStartY: number | null = null;
let sheetDragMoved = false;
let suppressSheetClick = false;

const setStatus = (message: string, tone = '') => {
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = tone;
};

const setSheetState = (nextState: SheetState) => {
  sheetState = nextState;
  if (sheet) sheet.dataset.sheetState = nextState;
  if (editorShell) editorShell.dataset.sheetState = nextState;
  if (sheetContent) sheetContent.hidden = nextState === 'closed';
  const handle = document.querySelector<HTMLButtonElement>('[data-snap-sheet-handle]');
  if (handle) {
    handle.setAttribute('aria-expanded', String(nextState !== 'closed'));
    handle.setAttribute(
      'aria-label',
      nextState === 'expanded' ? 'Recolher ferramentas' : nextState === 'half' ? 'Expandir ferramentas' : 'Abrir ferramentas',
    );
  }
};

const setSheetCategory = (category: string) => {
  activeCategory = category;
  const categoryNames: Record<string, string> = { frame: 'MOLDURA', pose: 'MASCOTE', sticker: 'FIGURINHAS' };
  if (sheetTitle) sheetTitle.textContent = categoryNames[category] ?? category;
  document.querySelectorAll<HTMLElement>('[data-snap-category]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.snapCategory === category));
  });
  document.querySelectorAll<HTMLElement>('[data-snap-category-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.snapCategoryPanel !== category;
  });
  setSheetState(sheetState === 'expanded' ? 'expanded' : 'half');
};

const showScreen = (screen: 'capture' | 'editor' | 'result') => {
  if (captureScreen) captureScreen.hidden = screen !== 'capture';
  if (editorScreen) editorScreen.hidden = screen !== 'editor';
  if (resultScreen) resultScreen.hidden = screen !== 'result';
  document.body.classList.toggle('snap-editor-active', screen === 'editor');
  if (screen === 'capture' || screen === 'result') setStatus('');
  if (screen === 'editor') {
    setSheetState('closed');
    window.setTimeout(() => fitStage(), 50);
  }
  if (screen !== 'editor') {
    if (formatMenu) formatMenu.hidden = true;
    formatToggle?.setAttribute('aria-expanded', 'false');
    if (moreMenu) moreMenu.hidden = true;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const setPressed = (selector: string, dataKey: string, value: string) => {
  document.querySelectorAll<HTMLElement>(selector).forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset[dataKey] === value));
  });
};

const openCamera = () => cameraInput?.click();
const openGallery = () => galleryInput?.click();

const loadImage = (url: string) => {
  const cached = imageCache.get(url);
  if (cached) return Promise.resolve(cached);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      imageCache.set(url, image);
      resolve(image);
    };
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
    setStatus('Preparando sua foto…');
    await initializeStage();
    showScreen('editor');
    setStatus('Agora é só criar.');
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    setStatus('Não conseguimos abrir essa foto. Escolha outra.', 'error');
  };
  image.src = url;
};

const coverAttributes = (image: HTMLImageElement) => {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const stageRatio = virtualWidth / virtualHeight;
  if (imageRatio > stageRatio) {
    const cropWidth = image.naturalHeight * stageRatio;
    return {
      x: 0,
      y: 0,
      width: virtualWidth,
      height: virtualHeight,
      crop: {
        x: (image.naturalWidth - cropWidth) / 2,
        y: 0,
        width: cropWidth,
        height: image.naturalHeight,
      },
    };
  }
  const cropHeight = image.naturalWidth / stageRatio;
  return {
    x: 0,
    y: 0,
    width: virtualWidth,
    height: virtualHeight,
    crop: {
      x: 0,
      y: (image.naturalHeight - cropHeight) / 2,
      width: image.naturalWidth,
      height: cropHeight,
    },
  };
};

const updateContextPosition = () => {
  if (!selectedNode || !contextToolbar || !stageContainer || !stage) return;
  const nodeBox = selectedNode.getClientRect({ relativeTo: stage });
  const stageRect = stageContainer.getBoundingClientRect();
  const scale = stage.scaleX();

  const left = stageRect.left + (nodeBox.x + nodeBox.width) * scale;
  const top = stageRect.top + nodeBox.y * scale;

  const clampedLeft = Math.max(16, Math.min(window.innerWidth - 60, left - 24));
  const clampedTop = Math.max(68, Math.min(window.innerHeight - 160, top - 42));

  contextToolbar.style.position = 'fixed';
  contextToolbar.style.left = `${clampedLeft}px`;
  contextToolbar.style.top = `${clampedTop}px`;
};

const refreshSelection = () => {
  const hasSelection = Boolean(selectedNode);
  if (contextToolbar) contextToolbar.hidden = !hasSelection;
  if (!hasSelection && moreMenu) {
    moreMenu.hidden = true;
    document.querySelector('[data-snap-more]')?.setAttribute('aria-expanded', 'false');
  }
  if (transformer) transformer.nodes(hasSelection ? [selectedNode] : []);
  if (hasSelection) updateContextPosition();
  uiLayer?.batchDraw();
};

const selectNode = (node: any | null) => {
  selectedNode = node;
  refreshSelection();
};

const updateVisibility = () => {
  if (frameNode) frameNode.visible(activeFrame !== 'none');
  overlayLayer?.find('.snap-mascot, .snap-sticker').forEach((node: any) => node.visible(true));
  overlayLayer?.batchDraw();
};

const hideTrash = () => {
  trashActive = false;
  if (trash) {
    trash.hidden = true;
    trash.dataset.active = 'false';
  }
};

const showTrash = () => {
  if (!trash) return;
  trash.hidden = false;
  trash.dataset.active = 'false';
};

const isPointerOverTrash = (clientX: number, clientY: number) => {
  if (!trash || trash.hidden) return false;
  const trashRect = trash.getBoundingClientRect();
  const hitMargin = 24;
  return (
    clientX >= trashRect.left - hitMargin &&
    clientX <= trashRect.right + hitMargin &&
    clientY >= trashRect.top - hitMargin &&
    clientY <= trashRect.bottom + hitMargin
  );
};

const removeNode = (node: any | null) => {
  if (!node) return;
  node.destroy();
  if (selectedNode === node) selectNode(null);
  overlayLayer?.batchDraw();
};

const bindOverlayEvents = (node: any) => {
  node.on('click tap', (event: any) => {
    event.cancelBubble = true;
    selectNode(node);
  });

  node.on('dragstart', () => {
    selectNode(node);
    showTrash();
  });

  node.on('dragmove', (event: any) => {
    const pointer = event.evt;
    const clientX = pointer?.clientX ?? (pointer?.touches?.[0]?.clientX ?? 0);
    const clientY = pointer?.clientY ?? (pointer?.touches?.[0]?.clientY ?? 0);
    trashActive = isPointerOverTrash(clientX, clientY);
    if (trash) trash.dataset.active = String(trashActive);
    overlayLayer?.batchDraw();
    updateContextPosition();
  });

  node.on('dragend', (event: any) => {
    const pointer = event.evt;
    const clientX = pointer?.clientX ?? (pointer?.changedTouches?.[0]?.clientX ?? 0);
    const clientY = pointer?.clientY ?? (pointer?.changedTouches?.[0]?.clientY ?? 0);
    const shouldRemove = trashActive || isPointerOverTrash(clientX, clientY);
    hideTrash();
    if (shouldRemove) {
      removeNode(node);
    } else {
      overlayLayer?.batchDraw();
      updateContextPosition();
    }
  });

  node.on('transform', () => {
    updateContextPosition();
  });

  node.on('transformend', () => {
    refreshSelection();
    overlayLayer?.batchDraw();
  });
};

const addOverlay = async (assetUrl: string, kind: 'mascot' | 'sticker') => {
  if (!stage || !overlayLayer) return;
  const image = await loadImage(assetUrl);
  const targetWidth = kind === 'mascot' ? virtualWidth * 0.45 : virtualWidth * 0.24;
  const scale = targetWidth / image.naturalWidth;

  const node = new Konva.Image({
    image,
    x: virtualWidth / 2,
    y: virtualHeight / 2,
    width: image.naturalWidth,
    height: image.naturalHeight,
    offsetX: image.naturalWidth / 2,
    offsetY: image.naturalHeight / 2,
    scaleX: scale,
    scaleY: scale,
    draggable: true,
    name: kind === 'mascot' ? 'snap-mascot' : 'snap-sticker',
  });

  node.setAttr('snapKind', kind);
  node.setAttr('snapSource', assetUrl);
  bindOverlayEvents(node);
  overlayLayer.add(node);
  node.moveToTop();
  selectNode(node);
  updateVisibility();
  setSheetState('closed');
};

const setFrame = async (frameId: string) => {
  activeFrame = frameId;
  setPressed('[data-snap-frame-id]', 'snapFrameId', activeFrame);
  if (!stage || !overlayLayer) return;

  if (frameId === 'none') {
    if (frameNode) frameNode.visible(false);
    updateVisibility();
    return;
  }

  const frame = config.modes.find((item) => item.id === frameId);
  if (frame) {
    frameImage = await loadImage(frame.frame);
    if (!frameNode) {
      frameNode = new Konva.Image({ image: frameImage, listening: false });
      overlayLayer.add(frameNode);
    } else {
      frameNode.image(frameImage);
      frameNode.visible(true);
    }
    frameNode.setAttrs(coverAttributes(frameImage));
  }
  updateVisibility();
};

const setPose = async (poseId: string) => {
  const pose = config.poses.find((item) => item.id === poseId);
  if (pose) await addOverlay(pose.asset, 'mascot');
};

const setSticker = async (stickerId: string) => {
  const sticker = config.stickers.find((item) => item.id === stickerId);
  if (sticker) await addOverlay(sticker.asset, 'sticker');
};

const updateFormatLabel = (format: SnapFormat) => {
  if (formatLabel) formatLabel.textContent = `${format.label.toUpperCase()} ${format.ratio}`;
  if (canvasWrap) canvasWrap.dataset.snapFormat = format.id;
};

const fitStage = () => {
  if (!stage || !stageContainer) return;
  const containerWidth = stageContainer.clientWidth || 360;
  const aspect = virtualHeight / virtualWidth;
  const containerHeight = Math.round(containerWidth * aspect);
  const scale = containerWidth / virtualWidth;

  stage.width(containerWidth);
  stage.height(containerHeight);
  stage.scale({ x: scale, y: scale });
  stage.batchDraw();
  updateContextPosition();
};

const updateFormat = (formatId: string) => {
  activeFormat = formatId;
  setPressed('[data-snap-format-id]', 'snapFormatId', activeFormat);
  const format = config.formats.find((item) => item.id === formatId) ?? config.formats[0];
  if (!format) return;
  virtualWidth = format.width;
  virtualHeight = format.height;
  updateFormatLabel(format);
  if (stage) {
    fitStage();
    if (baseNode && sourceImage) baseNode.setAttrs(coverAttributes(sourceImage));
    if (frameNode && frameImage) frameNode.setAttrs(coverAttributes(frameImage));
    stage.batchDraw();
  }
};

const configureTransformer = () => {
  if (!transformer) return;
  const desktop = window.matchMedia('(min-width: 701px)').matches;
  transformer.rotateEnabled(desktop);
  transformer.enabledAnchors(desktop ? ['top-left', 'top-right', 'bottom-left', 'bottom-right'] : []);
  transformer.anchorSize(desktop ? 12 : 0);
};

const setupTouchGestures = () => {
  if (!stageContainer) return;

  stageContainer.addEventListener(
    'touchstart',
    (event: TouchEvent) => {
      if (event.touches.length === 2 && selectedNode) {
        if (selectedNode.isDragging?.()) {
          selectedNode.stopDrag();
        }
        selectedNode.draggable(false);
        hideTrash();

        const t1 = event.touches[0];
        const t2 = event.touches[1];
        const distance = Math.max(1, Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY));
        const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
        const midpoint = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };

        touchGesture = {
          node: selectedNode,
          distance,
          angle,
          midpoint,
          nodePosition: { x: selectedNode.x(), y: selectedNode.y() },
          scaleX: selectedNode.scaleX(),
          scaleY: selectedNode.scaleY(),
          rotation: selectedNode.rotation(),
        };
      }
    },
    { passive: false },
  );

  stageContainer.addEventListener(
    'touchmove',
    (event: TouchEvent) => {
      if (touchGesture && event.touches.length === 2 && touchGesture.node === selectedNode) {
        event.preventDefault();
        const t1 = event.touches[0];
        const t2 = event.touches[1];
        const distance = Math.max(1, Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY));
        const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
        const midpoint = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };

        const factor = Math.max(0.15, Math.min(6, distance / touchGesture.distance));
        const angleDelta = angle - touchGesture.angle;
        const deltaDegrees = (angleDelta * 180) / Math.PI;

        const stageScale = stage?.scaleX() || 1;
        const dx = (midpoint.x - touchGesture.midpoint.x) / stageScale;
        const dy = (midpoint.y - touchGesture.midpoint.y) / stageScale;

        selectedNode.position({
          x: touchGesture.nodePosition.x + dx,
          y: touchGesture.nodePosition.y + dy,
        });

        selectedNode.scaleX(touchGesture.scaleX * factor);
        selectedNode.scaleY(touchGesture.scaleY * factor);
        selectedNode.rotation(touchGesture.rotation + deltaDegrees);

        overlayLayer?.batchDraw();
        uiLayer?.batchDraw();
        updateContextPosition();
      }
    },
    { passive: false },
  );

  const finishGesture = () => {
    if (touchGesture) {
      const node = touchGesture.node;
      touchGesture = null;
      if (node) {
        node.draggable(true);
        refreshSelection();
      }
    }
  };

  stageContainer.addEventListener('touchend', (event: TouchEvent) => {
    if (event.touches.length < 2 && touchGesture) {
      finishGesture();
    }
  });
  stageContainer.addEventListener('touchcancel', finishGesture);
};

const initializeStage = async () => {
  if (!stageContainer || !sourceImage) return;
  if (!stage) {
    stage = new Konva.Stage({
      container: stageContainer,
      width: virtualWidth,
      height: virtualHeight,
    });
    baseLayer = new Konva.Layer();
    overlayLayer = new Konva.Layer();
    uiLayer = new Konva.Layer();
    stage.add(baseLayer, overlayLayer, uiLayer);

    stage.on('click tap', (event: any) => {
      if (event.target === stage || event.target === baseNode || event.target === frameNode) {
        selectNode(null);
      }
    });

    transformer = new Konva.Transformer({
      keepRatio: true,
      rotateEnabled: false,
      enabledAnchors: [],
      borderStroke: '#ffc928',
      borderStrokeWidth: 1.5,
      borderDash: [6, 4],
      anchorStroke: '#ffc928',
      anchorFill: '#08111f',
      anchorSize: 0,
    });
    uiLayer.add(transformer);
    configureTransformer();

    baseNode = new Konva.Image({ image: sourceImage, listening: false });
    baseLayer.add(baseNode);

    setupTouchGestures();
  }

  fitStage();
  baseNode.image(sourceImage);
  baseNode.setAttrs(coverAttributes(sourceImage));
  await setFrame(activeFrame);

  if (!overlayLayer.findOne('.snap-mascot')) {
    const initialPose = config.poses[0];
    if (initialPose) await addOverlay(initialPose.asset, 'mascot');
  }
  stage.batchDraw();
};

const bringFront = () => {
  if (!selectedNode) return;
  selectedNode.moveToTop();
  overlayLayer?.batchDraw();
  if (moreMenu) moreMenu.hidden = true;
};

const sendBack = () => {
  if (!selectedNode) return;
  selectedNode.moveToBottom();
  overlayLayer?.batchDraw();
  if (moreMenu) moreMenu.hidden = true;
};

const mirrorSelected = () => {
  if (!selectedNode) return;
  selectedNode.scaleX(-selectedNode.scaleX());
  overlayLayer?.batchDraw();
  uiLayer?.batchDraw();
  if (moreMenu) moreMenu.hidden = true;
  document.querySelector('[data-snap-more]')?.setAttribute('aria-expanded', 'false');
};

const duplicateSelected = () => {
  if (!selectedNode || !overlayLayer) return;
  const clone = selectedNode.clone({
    x: selectedNode.x() + 30,
    y: selectedNode.y() + 30,
  });
  bindOverlayEvents(clone);
  overlayLayer.add(clone);
  clone.moveToTop();
  selectNode(clone);
  updateVisibility();
  if (moreMenu) moreMenu.hidden = true;
  document.querySelector('[data-snap-more]')?.setAttribute('aria-expanded', 'false');
};

const dataUrlToBlob = async (dataUrl: string) => (await fetch(dataUrl)).blob();

const exportSnap = async () => {
  if (!stage) return;
  setStatus('Criando seu Snap…');
  selectNode(null);
  transformer?.visible(false);
  uiLayer?.batchDraw();

  const exportRatio = virtualWidth / stage.width();
  const dataUrl = stage.toDataURL({ mimeType: 'image/png', pixelRatio: exportRatio });

  transformer?.visible(true);
  uiLayer?.batchDraw();
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
  setStatus('Salvo no seu dispositivo.', 'success');
};

const shareSnap = async () => {
  const src = resultImage?.src;
  if (!src) return;
  const blob = await dataUrlToBlob(src);
  const file = new File([blob], `fgf-snap-${activeFormat}-2026.png`, { type: 'image/png' });
  try {
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({
        title: 'Family Game Festival 2026',
        text: 'Meu Snap no Family Game Festival 2026! 🎮✨',
        files: [file],
      });
      setStatus('Compartilhado!', 'success');
      return;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
  }
  await downloadSnap();
  setStatus('Não foi possível compartilhar diretamente. A imagem foi salva no seu dispositivo.', 'success');
};

document.body.classList.add('snap-page');
document.querySelector('[data-snap-open-camera]')?.addEventListener('click', openCamera);
document.querySelector('[data-snap-open-gallery]')?.addEventListener('click', openGallery);
document.querySelector('[data-snap-editor-back]')?.addEventListener('click', () => showScreen('capture'));
document.querySelector('[data-snap-complete]')?.addEventListener('click', () => void exportSnap());

cameraInput?.addEventListener('change', () => {
  const file = cameraInput.files?.[0];
  if (file) loadSourceFile(file);
  cameraInput.value = '';
});

galleryInput?.addEventListener('change', () => {
  const file = galleryInput.files?.[0];
  if (file) loadSourceFile(file);
  galleryInput.value = '';
});

document.querySelectorAll<HTMLElement>('[data-snap-category]').forEach((button) =>
  button.addEventListener('click', () => setSheetCategory(button.dataset.snapCategory ?? 'frame')),
);

sheetHandle?.addEventListener('click', () => {
  if (suppressSheetClick) {
    suppressSheetClick = false;
    return;
  }
  setSheetState(sheetState === 'closed' ? 'half' : sheetState === 'half' ? 'expanded' : 'half');
});

sheetHandle?.addEventListener('pointerdown', (event) => {
  sheetDragStartY = event.clientY;
  sheetDragMoved = false;
  sheetHandle.setPointerCapture(event.pointerId);
});

sheetHandle?.addEventListener('pointermove', (event) => {
  if (sheetDragStartY === null) return;
  const distance = event.clientY - sheetDragStartY;
  if (Math.abs(distance) > 8) {
    sheetDragMoved = true;
    event.preventDefault();
  }
});

const finishSheetDrag = (event: PointerEvent) => {
  if (sheetDragStartY === null) return;
  const distance = event.clientY - sheetDragStartY;
  if (sheetDragMoved) {
    suppressSheetClick = true;
    if (distance < -44 && sheetState !== 'expanded') setSheetState(sheetState === 'closed' ? 'half' : 'expanded');
    if (distance > 44 && sheetState !== 'closed') setSheetState(sheetState === 'expanded' ? 'half' : 'closed');
  }
  sheetDragStartY = null;
  sheetDragMoved = false;
  if (sheetHandle?.hasPointerCapture(event.pointerId)) sheetHandle.releasePointerCapture(event.pointerId);
};

sheetHandle?.addEventListener('pointerup', finishSheetDrag);
sheetHandle?.addEventListener('pointercancel', finishSheetDrag);
sheetClose?.addEventListener('click', () => setSheetState('closed'));

document.querySelectorAll<HTMLElement>('[data-snap-frame-id]').forEach((button) =>
  button.addEventListener('click', () => {
    void setFrame(button.dataset.snapFrameId ?? 'none');
    setSheetState('half');
  }),
);

document.querySelectorAll<HTMLElement>('[data-snap-pose-id]').forEach((button) =>
  button.addEventListener('click', () => {
    void setPose(button.dataset.snapPoseId ?? '');
  }),
);

document.querySelectorAll<HTMLElement>('[data-snap-sticker-id]').forEach((button) =>
  button.addEventListener('click', () => {
    void setSticker(button.dataset.snapStickerId ?? '');
  }),
);

document.querySelector('[data-snap-mirror]')?.addEventListener('click', mirrorSelected);
document.querySelector('[data-snap-more]')?.addEventListener('click', () => {
  if (moreMenu) {
    moreMenu.hidden = !moreMenu.hidden;
    document.querySelector('[data-snap-more]')?.setAttribute('aria-expanded', String(!moreMenu.hidden));
  }
});
document.querySelector('[data-snap-duplicate]')?.addEventListener('click', duplicateSelected);
document.querySelector('[data-snap-bring-front]')?.addEventListener('click', bringFront);
document.querySelector('[data-snap-send-back]')?.addEventListener('click', sendBack);
document.querySelector('[data-snap-delete]')?.addEventListener('click', () => removeNode(selectedNode));

document.querySelectorAll<HTMLElement>('[data-snap-format-id]').forEach((button) =>
  button.addEventListener('click', () => {
    updateFormat(button.dataset.snapFormatId ?? activeFormat);
    if (formatMenu) formatMenu.hidden = true;
    formatToggle?.setAttribute('aria-expanded', 'false');
  }),
);

formatToggle?.addEventListener('click', (event) => {
  event.stopPropagation();
  if (formatMenu) formatMenu.hidden = !formatMenu.hidden;
  formatToggle.setAttribute('aria-expanded', String(!formatMenu?.hidden));
});

document.addEventListener('click', (event) => {
  if (formatMenu && formatToggle && !formatMenu.contains(event.target as Node) && !formatToggle.contains(event.target as Node)) {
    formatMenu.hidden = true;
    formatToggle.setAttribute('aria-expanded', 'false');
  }
  if (moreMenu && contextToolbar && !contextToolbar.contains(event.target as Node)) {
    moreMenu.hidden = true;
    document.querySelector('[data-snap-more]')?.setAttribute('aria-expanded', 'false');
  }
});

document.querySelector('[data-snap-download]')?.addEventListener('click', () => void downloadSnap());
document.querySelector('[data-snap-share]')?.addEventListener('click', () => void shareSnap());
document.querySelector('[data-snap-edit-again]')?.addEventListener('click', () => {
  showScreen('editor');
  setStatus('Continue editando seu Snap.');
});

window.addEventListener('resize', () => {
  fitStage();
  configureTransformer();
});

setSheetCategory(activeCategory);
setSheetState('closed');

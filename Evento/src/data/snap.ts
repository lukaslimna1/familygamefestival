import poseAlterstate from '../assets/snap/poses/Mascote - ALTERSTATE.png';
import poseCosplay from '../assets/snap/poses/Mascote - Cosplay.png';
import poseFootball from '../assets/snap/poses/Mascote - Futebol.png';
import poseGamer from '../assets/snap/poses/Mascote - Gamer.png';
import poseGroupInvite from '../assets/snap/poses/Mascote - Grupo Convite.png';
import poseGroupThumbs from '../assets/snap/poses/Mascote - Grupo Joinha.png';
import poseJustDance from '../assets/snap/poses/Mascote - Just Dance.png';
import poseKpop from '../assets/snap/poses/Mascote - K-Pop.png';
import poseFight from '../assets/snap/poses/Mascote - Luta.png';
import posePresenter from '../assets/snap/poses/Mascote - Apresentador.png';
import poseRetro from '../assets/snap/poses/Mascote - Retro Games.png';
const assetUrl = (asset: { src: string }) => asset.src;

const storyFrameModules = import.meta.glob('../assets/snap/frames/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const postFrameModules = import.meta.glob('../assets/snap/fremes post/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const frameSuffix = (path: string, prefixRegex: RegExp) =>
  path.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '').replace(prefixRegex, '').trim() ?? '';

const framePairKey = (suffix: string) =>
  suffix
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/s$/, '');

const frameId = (format: 'story' | 'post', suffix: string) => {
  const slug = suffix
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return format === 'post' ? `post-${slug}` : slug;
};

const storyFrames = Object.entries(storyFrameModules)
  .sort(([left], [right]) => left.localeCompare(right, 'pt-BR'))
  .map(([path, asset]) => {
    const label = frameSuffix(path, /^Moldura\s*-\s*/i);
    return {
      id: frameId('story', label),
      label,
      frame: asset,
      format: 'story' as const,
      pairKey: framePairKey(label),
    };
  });

const postFrames = Object.entries(postFrameModules)
  .sort(([left], [right]) => left.localeCompare(right, 'pt-BR'))
  .map(([path, asset]) => {
    const label = frameSuffix(path, /^Post\s*-\s*/i);
    return {
      id: frameId('post', label),
      label,
      frame: asset,
      format: 'post' as const,
      pairKey: framePairKey(label),
    };
  });

const stickerModules = import.meta.glob('../assets/snap/stikers/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const stickerLabel = (path: string) => path.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '').replace(/^Stiker\s*-\s*/i, '').trim() ?? 'Figurinha';
const stickerId = (label: string) => label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const stickers = Object.entries(stickerModules)
  .sort(([left], [right]) => left.localeCompare(right, 'pt-BR'))
  .map(([path, asset]) => {
    const label = stickerLabel(path);
    return { id: stickerId(label), label, asset };
  });

export const snapConfig = {
  modes: storyFrames,
  storyFrames,
  postFrames,
  stickers,
  poses: [
    { id: 'left', label: 'Apresentador', asset: assetUrl(posePresenter), position: 'left', layout: 'vertical' },
    { id: 'right', label: 'Convite', asset: assetUrl(poseGroupInvite), position: 'right', layout: 'horizontal' },
    { id: 'bottom-center', label: 'Luta', asset: assetUrl(poseFight), position: 'center', layout: 'vertical' },
    { id: 'pointing', label: 'Apontando', asset: assetUrl(poseJustDance), position: 'left', layout: 'vertical' },
    { id: 'thumbs', label: 'Joinha', asset: assetUrl(poseAlterstate), position: 'right', layout: 'vertical' },
    { id: 'victory', label: 'Vitória', asset: assetUrl(poseFootball), position: 'center', layout: 'vertical' },
    { id: 'kpop', label: 'Coração K-pop', asset: assetUrl(poseKpop), position: 'center', layout: 'vertical' },
    { id: 'cosplay', label: 'Cosplay', asset: assetUrl(poseCosplay), position: 'right', layout: 'vertical' },
    { id: 'gamer', label: 'Gamer', asset: assetUrl(poseGamer), position: 'left', layout: 'vertical' },
    { id: 'grupo-joinha', label: 'Grupo joinha', asset: assetUrl(poseGroupThumbs), position: 'right', layout: 'horizontal' },
    { id: 'retro', label: 'Retro Games', asset: assetUrl(poseRetro), position: 'right', layout: 'vertical' },
  ],
  positions: [
    { id: 'left', label: 'Esquerda' },
    { id: 'center', label: 'Centro' },
    { id: 'right', label: 'Direita' },
  ],
  formats: [
    { id: 'story', label: 'Story', ratio: '9:16', width: 1080, height: 1920 },
    { id: 'post', label: 'Post', ratio: '1:1', width: 1080, height: 1080 },
  ],
} as const;

export type SnapConfig = typeof snapConfig;

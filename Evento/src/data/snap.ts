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
import frameAlterstate from '../assets/snap/frames/Moldura - ALTERSTATE.png';
import framePresenter from '../assets/snap/frames/Moldura - Apresentador.png';
import frameCosplay from '../assets/snap/frames/Moldura - Cosplay.png';
import frameFootball from '../assets/snap/frames/Moldura - Futebol.png';
import frameGamer from '../assets/snap/frames/Moldura - Gamer Moderno.png';
import frameGroupWelcome from '../assets/snap/frames/Moldura - Grupo Boas-Vindas.png';
import frameGroupInvite from '../assets/snap/frames/Moldura - Grupo Convite.png';
import frameFight from '../assets/snap/frames/Moldura - Jogos de Luta.png';
import frameJustDance from '../assets/snap/frames/Moldura - Just Dance.png';
import frameKpop from '../assets/snap/frames/Moldura - K-Pop.png';
import frameRetro from '../assets/snap/frames/Moldura - Retro Games.png';

const assetUrl = (asset: { src: string }) => asset.src;

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
  modes: [
    { id: 'alterstate', label: 'Alterstate', frame: assetUrl(frameAlterstate) },
    { id: 'presenter', label: 'Apresentador', frame: assetUrl(framePresenter) },
    { id: 'cosplay', label: 'Cosplay', frame: assetUrl(frameCosplay) },
    { id: 'football', label: 'Futebol', frame: assetUrl(frameFootball) },
    { id: 'gamer', label: 'Gamer Moderno', frame: assetUrl(frameGamer) },
    { id: 'group-welcome', label: 'Grupo Boas-vindas', frame: assetUrl(frameGroupWelcome) },
    { id: 'group-invite', label: 'Grupo Convite', frame: assetUrl(frameGroupInvite) },
    { id: 'fight', label: 'Jogos de Luta', frame: assetUrl(frameFight) },
    { id: 'just-dance', label: 'Just Dance', frame: assetUrl(frameJustDance) },
    { id: 'kpop', label: 'K-pop', frame: assetUrl(frameKpop) },
    { id: 'retro', label: 'Retro Games', frame: assetUrl(frameRetro) },
  ],
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

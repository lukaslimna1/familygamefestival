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

const poseModules = import.meta.glob('../assets/snap/poses/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const stickerModules = import.meta.glob('../assets/snap/stikers/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const cleanSuffix = (path: string, prefixRegex: RegExp) =>
  path.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '').replace(prefixRegex, '').trim() ?? '';

const slugId = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const framePairKey = (suffix: string) =>
  suffix
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/s$/, '');

const frameId = (format: 'story' | 'post', suffix: string) => {
  const slug = slugId(suffix);
  return format === 'post' ? `post-${slug}` : slug;
};

const storyFrames = Object.entries(storyFrameModules)
  .sort(([left], [right]) => left.localeCompare(right, 'pt-BR'))
  .map(([path, asset]) => {
    const label = cleanSuffix(path, /^Moldura\s*-\s*/i);
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
    const label = cleanSuffix(path, /^Post\s*-\s*/i);
    return {
      id: frameId('post', label),
      label,
      frame: asset,
      format: 'post' as const,
      pairKey: framePairKey(label),
    };
  });

const poses = Object.entries(poseModules)
  .sort(([left], [right]) => left.localeCompare(right, 'pt-BR'))
  .map(([path, asset]) => {
    const label = cleanSuffix(path, /^Mascote\s*-\s*/i);
    return {
      id: slugId(label),
      label,
      asset,
    };
  });

const stickers = Object.entries(stickerModules)
  .sort(([left], [right]) => left.localeCompare(right, 'pt-BR'))
  .map(([path, asset]) => {
    const label = cleanSuffix(path, /^(?:Sticker|Stiker)\s*-\s*/i);
    return {
      id: slugId(label),
      label,
      asset,
    };
  });

export const snapConfig = {
  modes: storyFrames,
  storyFrames,
  postFrames,
  poses,
  stickers,
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

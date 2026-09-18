import competitionDefinitions from '../config/competitions.json';

export const event = {
  name: 'Family Game Festival 2026',
  edition: '1ª edição',
  dates: '19 e 20 de setembro de 2026',
  dateShort: '19—20 SET 2026',
  hours: '11h—21h',
  dayOne: '19/09 · sábado',
  dayTwo: '20/09 · domingo',
  venue: 'SORRI Bauru · Arena Tauste',
  address: 'Av. Nações Unidas, 53-40 · Bauru/SP',
  instagram: '@familygamex',
  instagramUrl: 'https://www.instagram.com/familygamex/',
  ticketUrl: 'https://www.eventiza.com.br/evento/family-game-festival',
  whatsapp: {
    exhibitors: 'https://wa.me/5514991152263?text=Ol%C3%A1%2C%20quero%20saber%20como%20participar%20como%20expositor%20no%20Family%20Game%20Festival.',
    artistAlley: 'https://wa.me/5514991152263?text=Ol%C3%A1%2C%20quero%20saber%20como%20participar%20do%20Artist%20Alley%20do%20Family%20Game%20Festival.',
    sponsors: 'https://wa.me/5514991152263?text=Ol%C3%A1%2C%20quero%20receber%20mais%20informa%C3%A7%C3%B5es%20sobre%20como%20patrocinar%20o%20Family%20Game%20Festival.',
    press: 'https://wa.me/5514991152263?text=Ol%C3%A1%2C%20sou%20da%20imprensa%20e%20quero%20receber%20o%20Press%20Kit%20do%20Family%20Game%20Festival.'
  },
  experienceLine: 'A primeira edição nasce apoiada por mais de 13 anos de experiência em arenas gamers, campeonatos e eventos voltados ao público geek.',
  socialImpact: 'Parte da arrecadação será revertida para a SORRI Bauru.',
  contact: {
    ctaHref: ''
  }
} as const;

export const navItems = [
  { label: 'Início', href: '#inicio', children: [] },
  { label: 'Cronograma', href: '#cronograma', children: [] },
  {
    label: 'Atrações',
    href: '#atracoes',
    children: [
      { label: 'Atrações e convidados', href: '#presencas-confirmadas' },
      { label: 'Vídeos', href: '#videos' }
    ]
  },
  {
    label: 'Expositores',
    href: '#expositores',
    children: [
      { label: 'Lojas', href: '#lojas' },
      { label: 'Artist Alley', href: '#artist-alley' }
    ]
  },
  {
    label: 'Campeonatos',
    href: '#campeonatos',
    children: [
      { label: 'Sábado · 19/09', href: '/campeonatos/sabado' },
      { label: 'Domingo · 20/09', href: '/campeonatos/domingo' }
    ]
  },
  { label: 'Ingressos', href: '#ingressos', children: [] },
  {
    label: 'Parcerias',
    href: '#patrocinadores',
    children: [
      { label: 'Parcerias e apoiadores', href: '#patrocinadores' },
      { label: 'Para quem divulga', href: '#para-quem-divulga' }
    ]
  },
  { label: 'Contato', href: '#contato', children: [] }
] as const;

export const guests = [
  {
    name: 'Lana VGS',
    slug: 'lana',
    handle: '@lana_vgs',
    instagramUrl: 'https://www.instagram.com/lana_vgs/',
    badge: 'ATRAÇÃO CONFIRMADA',
    role: 'Just Dance 2026',
    accent: 'cyan',
    image: '/assets/atraction/Lana VGS.png',
    description: 'Jogadora de Just Dance, com mais de 10 anos de experiência no universo geek e da dança; campeã, produtora e apresentadora de eventos geek.',
    highlight: 'Seletiva valendo vaga para o Nacional de Just Dance 2026 · 19/09'
  },
  {
    name: 'Raul Schlosser',
    slug: 'raul',
    handle: '@raul_schlosser',
    instagramUrl: 'https://www.instagram.com/raul_schlosser/',
    badge: 'ATRAÇÃO CONFIRMADA',
    role: 'Painel de dublagem',
    accent: 'pink',
    image: '/assets/atraction/Raul Schlosser 02.png',
    description: 'Dublador brasileiro de Jiraiya, Wolverine, Luigi, Cell e outros personagens queridos pelo público.',
    highlight: 'Painel, fotos, autógrafos e interação com o público · 19/09'
  },
  {
    name: 'Hélia de Cosplay',
    slug: 'heliades',
    handle: '@heliadescosplay',
    instagramUrl: 'https://www.instagram.com/heliadescosplay/',
    badge: 'JURADA CONFIRMADA',
    role: 'Jurada do Concurso Cosplay',
    accent: 'yellow',
    image: '/assets/atraction/Heliades Cosplay.png',
    description: 'Jurada convidada para avaliar o Concurso Cosplay do Family Game Festival.',
    highlight: 'Concurso Cosplay · 20/09'
  },
  {
    name: 'Ana Julia Bettini Sousa',
    slug: 'ana-julia',
    handle: '@naju_bss',
    instagramUrl: 'https://www.instagram.com/naju_bss/',
    badge: 'JURADA CONFIRMADA',
    role: 'Jurada do Concurso Cosplay',
    accent: 'red',
    image: '/assets/atraction/naju_bss.png',
    description: 'Jurada convidada para avaliar o Concurso Cosplay do Family Game Festival.',
    highlight: 'Concurso Cosplay · 20/09'
  },
  {
    name: 'Jeni',
    slug: 'jeni',
    handle: '@jeni.cosplay',
    instagramUrl: 'https://www.instagram.com/jeni.cosplay/',
    badge: 'JURADA CONFIRMADA',
    role: 'Jurada do Concurso Cosplay',
    accent: 'pink',
    image: '/assets/atraction/Jeni.cosplay.png',
    description: 'Jurada convidada para avaliar o Concurso Cosplay do Family Game Festival.',
    highlight: 'Concurso Cosplay · 20/09'
  },
  {
    name: 'Bunny',
    slug: 'bunny',
    handle: '@bunny.b00h',
    instagramUrl: 'https://www.instagram.com/bunny.b00h/',
    badge: 'JURADA CONFIRMADA',
    role: 'Jurada do Concurso K-Pop',
    accent: 'cyan',
    image: '/assets/atraction/bunny.b00h.png',
    description: 'Professora do Studio 4 Dança e dançarina do Studio 4 Dança, Dea Bauru e Medusa 4 DG.',
    highlight: 'Concurso K-Pop Individual · 20/09'
  },
  {
    name: '_mooniexbae',
    slug: 'mooniexbae',
    handle: '@_mooniexbae',
    instagramUrl: 'https://www.instagram.com/_mooniexbae',
    badge: 'JURADA CONFIRMADA',
    role: 'Jurada do Concurso K-Pop',
    accent: 'pink',
    image: '/assets/atraction/_mooniexbae.png',
    description: 'Maria Eduarda, professora de K-Pop no Studio 4 Dança.',
    highlight: 'Concurso K-Pop Individual · 20/09'
  },
  {
    name: 'marinex_7',
    slug: 'marinex-7',
    handle: '@marinex_7',
    instagramUrl: 'https://www.instagram.com/marinex_7',
    badge: 'JURADA CONFIRMADA',
    role: 'Jurada do Concurso K-Pop',
    accent: 'yellow',
    image: '/assets/atraction/marinex_7.png',
    description: 'Estudante de Educação Física na UNESP.',
    highlight: 'Concurso K-Pop Individual · 20/09'
  }
] as const;

export const attractions = [
  { eyebrow: 'COMPITA', title: 'Arena de campeonatos', text: 'Uma grade oficial de campeonatos atuais e retrô ao longo dos dois dias do festival.', icon: 'trophy.svg', accent: 'red' },
  { eyebrow: 'DANCE MODE', title: 'Just Dance 2026', text: 'Uma seletiva especial no dia 19/09 valendo vaga para o Nacional de Just Dance 2026.', icon: 'controller.svg', accent: 'cyan' },
  { eyebrow: 'COSPLAY', title: 'Concurso Cosplay', text: 'Solte a criatividade com temas de games, anime, mangá, filmes, séries, quadrinhos e cultura geek.', icon: 'crown.svg', accent: 'pink' },
  { eyebrow: 'COMUNIDADE', title: 'Random Play Dance', text: 'K-pop no centro do festival durante os dois dias: a música toca, a roda abre e quem souber a coreografia entra para dançar.', icon: 'star.svg', accent: 'yellow' }
] as const;

export const artistAlleyArtists = [
  {
    name: 'CraftCat Studio',
    handle: '@craftcatstudio',
    instagramUrl: 'https://www.instagram.com/craftcatstudio/',
    role: 'Ilustrações e cerâmica',
    accent: 'cyan',
    image: '/assets/artisti-alley/craftcatstudio.png',
    description: 'Gosto de gatos, então desenhei um gato ✍️',
    detail: 'Ilustrações e Cerâmica de alta temperatura',
    note: 'Presença confirmada · 19 e 20/09'
  },
  {
    name: 'Bruno Werner',
    handle: '@werner_nos_drawings12',
    instagramUrl: 'https://www.instagram.com/werner_nos_drawings12/',
    role: 'Quadrinista & roteirista',
    accent: 'yellow',
    image: '/assets/artisti-alley/Bruno Werner.png',
    description: '🖋️ Autor de The Second Guy',
    detail: '🏆 2º lugar em engajamento — Monthly Awards Shueisha Abril/2025',
    note: 'Aprimorando estilo e carreira'
  }
] as const;

function formatCurrency(cents: number) {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const tournaments = [
  ...competitionDefinitions.map((competition) => ({
  id: competition.id,
  category: competition.category,
  title: competition.name,
  accent: competition.accent,
  prize: competition.prizeLabel,
  detail: competition.detail ?? '',
  registrationPrice: competition.registrationPriceCents === null
    ? 'Gratuita'
    : formatCurrency(competition.registrationPriceCents),
  registrationUrl: competition.registrationFree ? '' : event.ticketUrl,
  ...(competition.prizeNote ? { prizeNote: competition.prizeNote } : {}),
  ...(competition.format ? { format: competition.format } : {}),
  ...(competition.participantsLabel ? { participants: competition.participantsLabel } : {}),
  ...(competition.registrationNote ? { registrationNote: competition.registrationNote } : {}),
  ...(competition.registrationFree ? { registrationFree: true } : {}),
  ...(competition.regulationId ? { regulationId: competition.regulationId } : {}),
  ...(competition.featured ? { featured: true } : {})
  }))
];

export const tournamentCategories = [
  { title: 'Cosplay', kicker: 'COSPLAY', accent: 'pink', category: 'Cosplay' },
  { title: 'Competição de Dança', kicker: 'COMPETIÇÃO DE DANÇA', accent: 'yellow', category: 'Dance Game' },
  { title: 'Fight Games', kicker: 'FIGHT GAMES', accent: 'red', category: 'Fight Games' },
  { title: 'eSports Games', kicker: 'ESPORTS GAMES', accent: 'cyan', category: 'Esport Games' },
  { title: 'Retrô Games', kicker: 'RETRÔ GAMES', accent: 'yellow', category: 'Retrô Games' }
] as const;

export const tournamentGroups = tournamentCategories
  .filter(({ category }) => category !== 'Cosplay' && category !== 'Dance Game')
  .map(({ title, kicker, accent, category }) => ({
    title,
    kicker,
    accent,
    ids: competitionDefinitions
      .filter((competition) => competition.category === category)
      .map((competition) => competition.id)
  }));

export const tournamentSchedule = competitionDefinitions.map((competition) => ({
  tournamentId: competition.id,
  day: competition.eventDay,
  date: competition.displayDate,
  time: competition.startTime,
  note: competition.detail ?? ''
}));

export const eventScheduleExtras = [
  { day: 'SÁBADO', date: '19/09', time: '15h00', title: 'Painel Dublador', detail: 'Raul Schlosser', category: 'Atração', note: 'Painel, fotos e autógrafos', href: '#presencas-confirmadas', linkLabel: 'Ver convidado', accent: 'pink' },
  { day: 'SÁBADO', date: '19/09', time: 'TODO O DIA', title: 'Random Play Dance K-pop', detail: 'Música tocando para você dançar', category: 'Dança', note: 'Durante todo o dia', accent: 'yellow', allDay: true },
  { day: 'SÁBADO', date: '19/09', time: 'TODO O DIA', title: 'Free Play', detail: 'Jogue à vontade', category: 'Experiência', note: 'Durante todo o dia', accent: 'cyan', allDay: true },
  { day: 'SÁBADO', date: '19/09', time: 'TODO O DIA', title: 'Desafio Geek', detail: 'Brincadeiras, quizzes e outros desafios', category: 'Atividade', note: 'Diversão e brindes · Durante todo o dia', accent: 'pink', allDay: true },
  { day: 'DOMINGO', date: '20/09', time: 'TODO O DIA', title: 'Random Play Dance K-pop', detail: 'Música tocando para você dançar', category: 'Dança', note: 'Durante todo o dia', accent: 'yellow', allDay: true },
  { day: 'DOMINGO', date: '20/09', time: 'TODO O DIA', title: 'Free Play', detail: 'Jogue à vontade', category: 'Experiência', note: 'Durante todo o dia', accent: 'cyan', allDay: true },
  { day: 'DOMINGO', date: '20/09', time: 'TODO O DIA', title: 'Desafio Geek', detail: 'Brincadeiras, quizzes e outros desafios', category: 'Atividade', note: 'Diversão e brindes · Durante todo o dia', accent: 'pink', allDay: true }
] as const;

export const schedulePanels: readonly { day: string }[] = [];

export const gameArt = [
  {
    title: 'K-Pop Individual',
    image: '/assets/flyers/K-Pop.png',
    alt: 'Arte oficial do K-Pop Individual',
    accent: 'pink',
    fit: 'contain'
  },
  {
    title: 'Mortal Kombat 1',
    image: '/assets/flyers/mortal-kombat-1-cover.png',
    alt: 'Capa de Mortal Kombat 1',
    accent: 'red',
    fit: 'cover'
  },
  {
    title: 'Street Fighter 6',
    image: '/assets/flyers/street-fighter-6-cover.png',
    alt: 'Capa de Street Fighter 6',
    accent: 'cyan',
    fit: 'cover'
  },
  {
    title: 'Tekken 8',
    image: '/assets/flyers/tekken-8-cover.png',
    alt: 'Capa de Tekken 8',
    accent: 'pink',
    fit: 'cover'
  },
  {
    title: 'Just Dance 2026',
    image: 'https://staticctf.ubisoft.com/J3yJr34U2pZ2Ieem48Dwy9uqj5PNUQTn/4Nwp82G3p7gEI2XPbr8z3A/d92177cd6dac0da4602e1f7264e866a6/jd26-boxshot.jpg',
    alt: 'Capa de Just Dance 2026',
    accent: 'yellow',
    fit: 'contain'
  },
  {
    title: 'FC 2026',
    image: 'https://image.api.playstation.com/vulcan/ap/rnd/202606/0422/30afecf5deecc449b0290aa843cfe179b3977b388e8e4e9b.png',
    alt: 'Capa oficial de EA SPORTS FC 26 Standard Edition',
    accent: 'cyan',
    fit: 'contain'
  },
  {
    title: 'eFootball',
    image: '/assets/flyers/efootball-26-cover.png',
    alt: 'Arte de eFootball 26',
    accent: 'yellow',
    fit: 'cover'
  },
  {
    title: 'Naruto Storm 4',
    image: '/assets/flyers/NARUTO USAR ESSA.jpg',
    alt: 'Capa de Naruto Shippuden: Ultimate Ninja Storm 4',
    accent: 'yellow',
    fit: 'contain'
  },
  {
    title: 'Top Gear 1',
    image: 'https://images.launchbox-app.com//97538188-65b0-4e08-8870-316a07cad1d1.jpg',
    alt: 'Capa original de Top Gear 1 para Super Nintendo',
    accent: 'red',
    fit: 'contain'
  },
  {
    title: 'Street Fighter Zero 2',
    image: 'https://www.webmulator.com/img/roms/street-fighter-zero-2-japan-snes.jpg',
    alt: 'Capa de Street Fighter Zero 2',
    accent: 'cyan',
    fit: 'contain'
  },
  {
    title: 'Sonic 2',
    image: 'https://cdn.wikimg.net/en/strategywiki/images/4/4d/Sonic_2_genesis_boxart.jpg',
    alt: 'Capa de Sonic the Hedgehog 2',
    accent: 'yellow',
    fit: 'contain'
  },
  {
    title: 'Budokai Tenkaichi 3',
    image: '/assets/flyers/budokai-tenkaichi-3-cover.png',
    alt: 'Capa de Dragon Ball Z Budokai Tenkaichi 3',
    accent: 'red',
    fit: 'contain'
  },
  {
    title: 'Super Bomberman 4',
    image: 'https://www.gavas.jp/upload/save_image/3419.jpg',
    alt: 'Capa de Super Bomberman 4',
    accent: 'cyan',
    fit: 'contain'
  },
  {
    title: 'Guitar Hero 3',
    image: 'https://cdn.media.amplience.net/i/metallica/20150806_195154_7549_752637',
    alt: 'Capa de Guitar Hero III: Legends of Rock',
    accent: 'pink',
    fit: 'contain'
  },
  {
    title: 'Top Gear 2',
    image: 'https://www.jnlgame.com/cdn/shop/products/51431_front.jpg?v=1686849833&width=5760',
    alt: 'Capa de Top Gear 2 para Super Nintendo',
    accent: 'red',
    fit: 'contain'
  },
  {
    title: 'The King of Fighters 2002',
    image: 'https://images.launchbox-app.com/232808eb-8c95-4ce3-9ba5-5c5639479d0f.jpg',
    alt: 'Capa de The King of Fighters 2002',
    accent: 'red',
    fit: 'contain'
  },
  {
    title: 'Cosplay',
    image: '/assets/highlights/cosplay-feature.png',
    alt: 'Cosplayer em destaque sob luzes de um palco geek',
    accent: 'pink',
    fit: 'cover'
  }
] as const;

export const experiences = [
  { number: '01', title: 'Free Play', text: 'Games atuais e clássicos para jogar no seu ritmo.', icon: 'controller.svg' },
  { number: '02', title: 'Retrô em play', text: 'Top Gear 1 e outros clássicos para revisitar grandes fases.', icon: 'coin.svg' },
  { number: '03', title: 'Cultura geek', text: 'K-pop, painéis, convidados, cosplay e expositores.', icon: 'pixels.svg' },
  { number: '04', title: 'Todo mundo joga', text: 'Experiências para diferentes públicos e atividades para toda a família.', icon: 'dpad.svg' }
] as const;

export const tickets = [
  {
    day: 'SÁBADO',
    date: '19/09 · sábado',
    slug: 'sabado',
    passes: [
      { icon: '🎟️', name: 'Ingresso comum · 1º lote', price: 'R$ 30,00', fee: '+ R$ 2,55 de taxa', installments: 'em até 7x de R$ 5,35', detail: 'Acesso ao festival em 19/09.', note: 'Entrada para um dia do evento.', accent: 'cyan' },
      { icon: '👥', name: 'Family Pack · 4 pessoas', price: 'R$ 100,00', fee: '+ R$ 8,50 de taxa', installments: 'em até 12x de R$ 11,10', detail: 'Acesso ao festival em 19/09.', note: 'Família ou grupo de amigos; não é necessário comprovar parentesco.', accent: 'yellow' }
    ]
  },
  {
    day: 'DOMINGO',
    date: '20/09 · domingo',
    slug: 'domingo',
    passes: [
      { icon: '🎟️', name: 'Ingresso comum · 1º lote', price: 'R$ 30,00', fee: '+ R$ 2,55 de taxa', installments: 'em até 7x de R$ 5,35', detail: 'Acesso ao festival em 20/09.', note: 'Entrada para um dia do evento.', accent: 'cyan' },
      { icon: '👥', name: 'Family Pack · 4 pessoas', price: 'R$ 100,00', fee: '+ R$ 8,50 de taxa', installments: 'em até 12x de R$ 11,10', detail: 'Acesso ao festival em 20/09.', note: 'Família ou grupo de amigos; não é necessário comprovar parentesco.', accent: 'yellow' }
    ]
  }
] as const;

export const vipTickets = [
  { label: 'VIP Diamante', audience: 'Inteira', price: 'R$ 100,00', fee: '+ R$ 8,50 de taxa', installments: 'em até 12x de R$ 11,10' },
  { label: 'VIP Diamante', audience: 'Meia-entrada PCD/TEA e demais beneficiários', price: 'R$ 50,00', fee: '+ R$ 4,25 de taxa', installments: 'em até 12x de R$ 5,55' }
] as const;

const standardCompetitorTicket = { price: 'R$ 30,00', fee: '+ R$ 2,55 de taxa', installments: 'em até 7x de R$ 5,35', note: 'Premiação de R$ 100,00 com mínimo de 10 participantes. Abaixo disso, o valor estará sujeito a alteração.' } as const;
const thousandCompetitorTicket = { price: 'R$ 60,00', fee: '+ R$ 5,10 de taxa', installments: 'em até 12x de R$ 6,66', note: 'Premiação de R$ 1.000,00 com mínimo de 22 participantes. Abaixo disso, o valor estará sujeito a alteração.' } as const;

export const competitorTickets = [
  { tournamentId: 'efootball', icon: '⚽', ...standardCompetitorTicket, accent: 'yellow' },
  { tournamentId: 'street-fighter-zero-2', icon: '🥊', ...standardCompetitorTicket, accent: 'cyan' },
  { tournamentId: 'sonic-2', icon: '🦔', ...standardCompetitorTicket, accent: 'yellow' },
  { tournamentId: 'top-gear-1', icon: '🚗', ...standardCompetitorTicket, accent: 'red' },
  { tournamentId: 'just-dance-2026', icon: '💃', price: 'Gratuita', fee: 'Sem taxa de inscrição', installments: 'Ingresso do evento obrigatório', note: 'Inscrição gratuita para a seletiva. Basta comprar o ingresso do evento.', accent: 'yellow' },
  { tournamentId: 'budokai-tenkaichi-3', icon: '🐉', ...standardCompetitorTicket, accent: 'red' },
  { tournamentId: 'super-bomberman-4', icon: '💣', ...standardCompetitorTicket, accent: 'cyan' },
  { tournamentId: 'mortal-kombat-1', icon: '⚔️', ...thousandCompetitorTicket, accent: 'red' },
  { tournamentId: 'naruto-storm-4', icon: '🥷', ...standardCompetitorTicket, accent: 'yellow' },
  { tournamentId: 'guitar-hero-3', icon: '🎸', ...standardCompetitorTicket, accent: 'pink' },
  { tournamentId: 'tekken-8', icon: '👊', ...thousandCompetitorTicket, accent: 'pink' },
  { tournamentId: 'fc-2026', icon: '⚽', ...standardCompetitorTicket, accent: 'cyan' },
  { tournamentId: 'top-gear-2', icon: '🚗', ...standardCompetitorTicket, accent: 'red' },
  { tournamentId: 'cosplay', icon: '🎭', ...thousandCompetitorTicket, note: 'Participação sujeita ao regulamento oficial e limite máximo de 32 participantes.', accent: 'pink' },
  { tournamentId: 'street-fighter-6', icon: '🥊', ...thousandCompetitorTicket, accent: 'cyan' },
  { tournamentId: 'kof-2002', icon: '👊', ...standardCompetitorTicket, accent: 'red' }
] as const;

export const partners = [
  { name: 'Family Games', handle: 'Realização', level: 'Realização', status: 'Responsável pela realização do Family Game Festival.', href: '', merchant: false, accent: 'yellow' },
  { name: 'Edge 3D Studio', handle: '@edge3dstudio', level: 'Power-up', status: 'Patrocinador oficial · lojista confirmado', href: 'https://www.instagram.com/edge3dstudio/', merchant: true, accent: 'yellow' },
  { name: 'Alterstate', handle: '@usealterstate', level: 'Apoio', status: 'Apoio confirmado', href: 'https://www.instagram.com/usealterstate/', merchant: false, accent: 'cyan' },
  { name: 'SORRI Bauru', handle: 'sorribauru.com.br', level: 'Apoio', status: 'Apoio institucional · sede do festival', href: 'https://sorribauru.com.br', merchant: false, accent: 'pink' },
  { name: 'Bauru Box', handle: '@bauruboxvideogames', level: 'Apoio', status: 'Apoio confirmado · lojista confirmado', href: 'https://www.instagram.com/bauruboxvideogames/', merchant: true, accent: 'cyan' }
] as const;

export const stores = [
  {
    name: 'Edge 3D Studio',
    handle: '@edge3dstudio',
    role: 'Lojista e patrocinador',
    description: 'Lojista confirmado no Family Game Festival.',
    note: 'Patrocinador oficial · lojista confirmado',
    image: '/assets/logos/parceiros/Edge%203D%20Studio.webp',
    href: 'https://www.instagram.com/edge3dstudio/',
    accent: 'yellow'
  },
  {
    name: 'Bauru Box',
    handle: '@bauruboxvideogames',
    role: 'Apoio e loja',
    description: 'Apoio e loja confirmados no Family Game Festival.',
    note: 'Apoio confirmado · lojista confirmado',
    image: '/assets/logos/lojas/Bauru%20Box.png',
    href: 'https://www.instagram.com/bauruboxvideogames/',
    accent: 'cyan'
  },
  {
    name: 'Facai Games',
    handle: '@facaicentergames',
    role: 'Loja',
    description: 'Loja confirmada no Family Game Festival.',
    note: 'Lojista confirmado',
    image: '/assets/logos/lojas/Facai.png',
    href: 'https://www.instagram.com/facaicentergames/',
    accent: 'pink'
  },
  {
    name: 'NayCraftlab',
    handle: '@naycraftlab',
    role: 'Loja',
    description: 'Loja confirmada no Family Game Festival.',
    note: 'Lojista confirmado',
    image: '/assets/logos/lojas/NayCraftLabs3d.png',
    href: 'https://www.instagram.com/naycraftlab/',
    accent: 'yellow'
  }
] as const;

export const mediaPartners = [
  {
    name: 'Salada Pop',
    handle: '@salada.pop',
    image: '/assets/logos/midias/Salada%20Pop.png',
    href: 'https://www.instagram.com/salada.pop/',
    accent: 'pink'
  },
  {
    name: 'Diga Ação Podcast',
    handle: '@digaacao.podcast',
    image: '/assets/logos/midias/Diaga%20A%C3%A7%C3%A3o%20Podcast.png',
    href: 'https://www.instagram.com/digaacao.podcast',
    accent: 'yellow'
  },
  {
    name: 'Voando Bauru',
    handle: '@voandobauru',
    image: '/assets/logos/midias/Voando%20Bauru.png',
    href: 'https://www.instagram.com/voandobauru',
    accent: 'cyan'
  },
  {
    name: 'Rackoon',
    handle: 'rackoon.com.br',
    image: '/assets/logos/midias/Rackoon.png',
    href: 'https://rackoon.com.br',
    accent: 'yellow'
  },
  {
    name: 'JWave',
    handle: 'jwave.com.br',
    image: '/assets/logos/midias/JWave-Logo-.png',
    href: 'https://www.jwave.com.br/',
    accent: 'pink',
    lightLogo: true
  },
  {
    name: 'Calendário Nerd',
    handle: 'calendarionerd.com.br',
    image: '/assets/logos/midias/Calendario%20Nerd.webp',
    href: 'https://calendarionerd.com.br/',
    accent: 'cyan',
    lightLogo: true
  },
  {
    name: 'Vaga Nerd',
    handle: '@vaganerd',
    image: '/assets/logos/midias/Vaga%20Nerd%20Portal.webp',
    href: 'https://www.instagram.com/vaganerd/',
    accent: 'red'
  },
  {
    name: 'Geek Connection',
    handle: '@geek_connection',
    image: '/assets/logos/midias/Geek%20Connection.png',
    href: 'https://www.geekconnection.net/',
    accent: 'yellow',
    lightLogo: true
  }
] as const;

export const sponsorTiers = [
  { name: 'Player', slots: '8 cotas', amount: 'R$ 500', detail: 'Entrada da marca no grupo oficial de patrocinadores.', accent: 'cyan' },
  { name: 'Power-up', slots: '4 cotas', amount: 'R$ 1.000', detail: 'Mais destaque nas comunicações e peças do evento.', accent: 'red' },
  { name: 'Champion', slots: '2 cotas', amount: 'R$ 2.000', detail: 'Alta visibilidade e presença nos momentos de destaque.', accent: 'yellow' },
  { name: 'Legend', slots: '1 cota', amount: 'R$ 5.000', detail: 'Máxima hierarquia como principal parceiro institucional.', accent: 'pink' }
] as const;

export const sponsorBenefits = [
  'Site e painel geral de patrocinadores',
  'Menção coletiva nas redes sociais',
  'Destaque individual e peças prioritárias',
  'Menções durante a programação',
  'Hierarquia visual ampliada',
  'Principal parceiro institucional'
] as const;

export const directSponsorOptions = [
  {
    title: 'Arena Partner',
    kicker: '1 parceiro por competição',
    amount: 'R$ 1.500',
    detail: 'Patrocínio direto de um campeonato, com associação à disputa, ao troféu e à premiação.',
    items: tournaments.map((tournament) => tournament.title),
    accent: 'red'
  },
  {
    title: 'Attraction Partner',
    kicker: '1 cota para cada atração',
    amount: 'R$ 1.000',
    detail: 'Associe sua marca diretamente a uma das atrações especiais confirmadas.',
    items: ['Raul Schlosser', 'Lana VGS'],
    accent: 'yellow'
  }
] as const;

export const supportOptions = [
  { number: '01', title: 'Alimentação', text: 'Refeições, lanches e bebidas para apoiar a operação, a equipe e os convidados.', accent: 'yellow' },
  { number: '02', title: 'Prêmios & brindes', text: 'Produtos, vouchers, kits e benefícios para competidores e participantes.', accent: 'cyan' },
  { number: '03', title: 'Estrutura & serviços', text: 'Tecnologia, impressão, mobiliário, audiovisual, logística e serviços úteis à realização.', accent: 'pink' },
  { number: '04', title: 'Mídia & divulgação', text: 'Cobertura e apoio de comunicação local ou digital para ampliar o alcance do festival.', accent: 'red' }
] as const;

export const pressKitAngles = [
  { title: 'Portal & jornal', text: 'Agenda cultural, impacto regional, cultura geek, campeonatos, premiações e histórias dos participantes.', accent: 'cyan' },
  { title: 'Rádio & podcast', text: 'Serviço do fim de semana, entrevistas com a organização, atrações, games, entretenimento e comportamento.', accent: 'yellow' },
  { title: 'TV & vídeo', text: 'Competição, cosplay, dança, Free Play, público, bastidores e entrevistas com forte potencial visual.', accent: 'pink' }
] as const;

export const pressKitSnippets = [
  { label: 'Rádio / podcast · locução 30s', text: 'Bauru recebe nos dias 19 e 20 de setembro o Family Game Festival. Das 11h às 21h, a Arena Tauste - SORRI Bauru terá campeonatos, cosplay, Just Dance, K-pop, Free Play, atrações e jogos atuais e retrô. Informações em familygamefestival.vercel.app.', accent: 'yellow' },
  { label: 'TV / vídeo · cabeça de 20s', text: 'Bauru entra no universo dos games nos dias 19 e 20 de setembro. O Family Game Festival reúne campeonatos, cosplay, Just Dance, atrações, K-pop e Free Play na Arena Tauste - SORRI Bauru, das 11h às 21h.', accent: 'cyan' },
  { label: 'Portal / jornal · abertura', text: 'Bauru recebe nos dias 19 e 20 de setembro de 2026 o Family Game Festival, evento que reúne games, cultura geek, campeonatos, cosplay, dança e atrações especiais. A programação acontece das 11h às 21h, na Arena Tauste - SORRI Bauru.', accent: 'pink' },
  { label: 'Agenda / serviço · nota curta', text: 'Family Game Festival · 19 e 20/09/2026 · 11h às 21h · Arena Tauste - SORRI Bauru · Av. Nações Unidas, 53-40, Bauru/SP · Site: familygamefestival.vercel.app · Instagram: @familygamex.', accent: 'red' }
] as const;

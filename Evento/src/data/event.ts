export const event = {
  name: 'Family Game Festival 2026',
  edition: '1ª edição',
  dates: '19 e 20 de setembro de 2026',
  dateShort: '19—20 SET 2026',
  dayOne: '19/09 · sábado',
  dayTwo: '20/09 · domingo',
  venue: 'SORRI Bauru · Arena Tauste',
  address: 'Av. Nações Unidas, 53-40 · Bauru/SP',
  instagram: '@familygamex',
  instagramUrl: 'https://www.instagram.com/familygamex/',
  ticketUrl: 'https://eventiza.com.br/evento/family-game-festival?utm_source=chatgpt.com',
  whatsapp: {
    exhibitors: 'https://wa.me/5514991152263?text=Ol%C3%A1%2C%20quero%20saber%20como%20participar%20como%20expositor%20no%20Family%20Game%20Festival.',
    sponsors: 'https://wa.me/5514991152263?text=Ol%C3%A1%2C%20quero%20receber%20mais%20informa%C3%A7%C3%B5es%20sobre%20como%20apoiar%20o%20Family%20Game%20Festival.'
  },
  experienceLine: 'A primeira edição nasce apoiada por mais de 13 anos de experiência em arenas gamers, campeonatos e eventos voltados ao público geek.',
  socialImpact: 'Parte da arrecadação será revertida para a SORRI Bauru.',
  contact: {
    ctaHref: ''
  }
} as const;

export const navItems = [
  { label: 'Início', href: '#inicio' },
  { label: 'Atrações', href: '#atracoes' },
  { label: 'Campeonatos', href: '#campeonatos' },
  { label: 'Ingressos', href: '#ingressos' },
  { label: 'Expositores', href: '#expositores' },
  { label: 'Contato', href: '#contato' }
] as const;

export const guests = [
  {
    name: 'Lana VGS',
    handle: '@lana_vgs',
    instagramUrl: 'https://www.instagram.com/lana_vgs/',
    role: 'Just Dance 2026',
    accent: 'cyan',
    image: '/assets/mascot-original.png',
    description: 'Embaixadora e referência de Just Dance, bacharel em Dança, jogadora campeã e produtora de eventos geek.',
    highlight: 'Seletiva valendo vaga para o Nacional de Just Dance 2026 · 19/09'
  },
  {
    name: 'Raul Schlosser',
    handle: '@raul_schlosser',
    instagramUrl: 'https://www.instagram.com/raul_schlosser/',
    role: 'Painel de dublagem',
    accent: 'pink',
    image: '/assets/mascot-invite.png',
    description: 'Dublador brasileiro de Jiraiya, Wolverine, Luigi, Cell e outros personagens queridos pelo público.',
    highlight: 'Painel, fotos, autógrafos e interação com o público · 19/09'
  }
] as const;

export const attractions = [
  { eyebrow: 'COMPITA', title: 'Arena de campeonatos', text: 'Mortal Kombat 1, Street Fighter 6 e Tekken 8 com premiação de R$ 1.000 para cada campeão.', icon: 'trophy.svg', accent: 'red' },
  { eyebrow: 'DANCE MODE', title: 'Just Dance 2026', text: 'Uma seletiva especial no dia 19/09 valendo vaga para o Nacional de Just Dance 2026.', icon: 'controller.svg', accent: 'cyan' },
  { eyebrow: 'COSPLAY', title: 'Concurso Cosplay', text: 'Solte a criatividade com temas de games, anime, mangá, filmes, séries, quadrinhos e cultura geek.', icon: 'crown.svg', accent: 'pink' },
  { eyebrow: 'COMUNIDADE', title: 'Random Play Dance', text: 'A música toca, a roda abre e quem souber a coreografia entra para dançar.', icon: 'star.svg', accent: 'yellow' }
] as const;

export const tournaments = [
  { title: 'Mortal Kombat 1', icon: 'controller.svg', time: '14h', accent: 'red', prize: 'R$ 1.000', detail: '20/09 · domingo' },
  { title: 'Street Fighter 6', icon: 'dpad.svg', time: '16h', accent: 'cyan', prize: 'R$ 1.000', detail: '20/09 · domingo' },
  { title: 'Tekken 8', icon: 'lightning.svg', time: '18h', accent: 'pink', prize: 'R$ 1.000', detail: '20/09 · domingo' }
] as const;

export const experiences = [
  { number: '01', title: 'Free Play', text: 'Games atuais e clássicos para jogar no seu ritmo.', icon: 'controller.svg' },
  { number: '02', title: 'Retrô em play', text: 'Games retrô e campeonatos retrô para revisitar grandes fases.', icon: 'coin.svg' },
  { number: '03', title: 'Cultura geek', text: 'K-pop, painéis, convidados, cosplay e expositores.', icon: 'pixels.svg' },
  { number: '04', title: 'Todo mundo joga', text: 'Experiências para diferentes públicos e atividades para toda a família.', icon: 'dpad.svg' }
] as const;

export const tickets = [
  { name: 'Ingresso diário', price: 'R$ 30', fee: '+ R$ 2,55 de taxa', detail: 'Acesso por um dia', note: 'Escolha 19/09 ou 20/09.', accent: 'cyan' },
  { name: 'Família / grupo', price: 'R$ 100', fee: '+ R$ 8,50 de taxa', detail: 'Quatro pessoas no mesmo dia', note: 'Sem comprovação de parentesco.', accent: 'yellow' },
  { name: 'VIP', price: 'R$ 100', fee: '+ R$ 8,50 de taxa', detail: 'Acesso aos dois dias · 100 unidades', note: 'Entrada antecipada, prioridade, credencial e 3 brindes. Não inclui campeonatos.', accent: 'pink' },
  { name: 'Meia / benefício', price: 'R$ 50', fee: '+ R$ 4,25 de taxa', detail: 'PCD, TEA e demais beneficiários', note: 'Conforme legislação e regras aplicáveis.', accent: 'red' }
] as const;

export const partners = [
  { name: 'Edge 3D Studio', handle: '@edge3dstudio', status: 'Patrocinador oficial · expositor confirmado', href: 'https://www.instagram.com/edge3dstudio/', accent: 'yellow' },
  { name: 'Alterstate', handle: '@usealterstate', status: 'Apoio confirmado', href: 'https://www.instagram.com/usealterstate/', accent: 'cyan' }
] as const;

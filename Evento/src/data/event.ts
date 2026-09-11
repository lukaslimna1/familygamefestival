export const event = {
  name: 'Family Game Festival 2026',
  edition: '1ª edição',
  dates: '19 e 20 de setembro de 2026',
  dateShort: '19—20 SET 2026',
  dayOne: '19/09 — sábado',
  dayTwo: '20/09 — domingo',
  venue: 'SORRI Bauru — Arena Tauste',
  address: 'Av. Nações Unidas, 53-40 · Bauru/SP',
  instagram: '@familygamex',
  instagramUrl: 'https://www.instagram.com/familygamex/',
  ticketUrl: 'https://eventiza.com.br/evento/family-game-festival?utm_source=chatgpt.com',
  experienceLine: 'A primeira edição nasce apoiada por mais de 13 anos de experiência em arenas gamers, campeonatos e eventos voltados ao público geek.',
  socialImpact: 'Parte da arrecadação será revertida para a SORRI Bauru.',
  contact: {
    // Preencher quando o canal comercial oficial for definido.
    ctaHref: ''
  }
} as const;

export const navItems = [
  { label: 'Início', href: '#inicio' },
  { label: 'Atrações', href: '#atracoes' },
  { label: 'Campeonatos', href: '#campeonatos' },
  { label: 'Ingressos', href: '#ingressos' },
  { label: 'Expositores', href: '#expositores' },
  { label: 'Patrocínio', href: '#patrocinio' },
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
    imageAlt: 'Mascote Family Game em pose de celebração',
    description: 'Embaixadora e referência de Just Dance, bacharel em Dança, jogadora campeã e produtora de eventos geek.',
    highlight: 'Seletiva valendo vaga para o Nacional de Just Dance 2026 · 19/09'
  },
  {
    name: 'Raul Schlosser',
    handle: '@raul_schlosser',
    instagramUrl: 'https://www.instagram.com/raul_schlosser/',
    role: 'Painel de Dublagem',
    accent: 'pink',
    image: '/assets/mascot-invite.png',
    imageAlt: 'Mascote Family Game convidando o público para o festival',
    description: 'Dublador brasileiro de Jiraiya, Wolverine, Luigi, Cell e outros personagens queridos pelo público.',
    highlight: 'Painel, fotos, autógrafos e interação com o público · 19/09'
  }
] as const;

export const tournaments = [
  { title: 'Mortal Kombat 1', icon: 'controller.svg', time: '14h', accent: 'red' },
  { title: 'Street Fighter 6', icon: 'dpad.svg', time: '16h', accent: 'cyan' },
  { title: 'Tekken 8', icon: 'lightning.svg', time: '18h', accent: 'pink' }
] as const;

export const attractions = [
  { eyebrow: 'COMPITA', title: 'Arena de campeonatos', text: 'Mortal Kombat 1, Street Fighter 6 e Tekken 8 com premiação de R$ 1.000 para cada campeão.', icon: 'trophy.svg', accent: 'red' },
  { eyebrow: 'DANCE MODE', title: 'Just Dance 2026', text: 'Uma seletiva especial no dia 19/09 valendo vaga para o Nacional de Just Dance 2026.', icon: 'controller.svg', accent: 'cyan' },
  { eyebrow: 'COSPLAY', title: 'Crie sua entrada', text: 'Concurso Cosplay com temas de games, anime, mangá, filmes, séries, quadrinhos e cultura geek.', icon: 'crown.svg', accent: 'pink' },
  { eyebrow: 'COMUNIDADE', title: 'Random Play Dance', text: 'A música toca, a roda abre e quem souber a coreografia entra para dançar.', icon: 'star.svg', accent: 'yellow' }
] as const;

export const experiences = [
  { number: '01', title: 'Free Play', text: 'Games atuais e clássicos para jogar no seu ritmo.', icon: 'controller.svg' },
  { number: '02', title: 'Retrô em play', text: 'Games retrô e campeonatos retrô para revisitar grandes fases.', icon: 'coin.svg' },
  { number: '03', title: 'Cultura geek', text: 'K-pop, painéis, convidados, cosplay e expositores.', icon: 'pixels.svg' },
  { number: '04', title: 'Todo mundo joga', text: 'Experiências para diferentes públicos e atividades para toda a família.', icon: 'dpad.svg' }
] as const;

export const tickets = [
  { name: 'Ingresso diário', price: 'R$ 30', fee: '+ R$ 2,55 de taxa', detail: 'Acesso por um dia', note: 'Disponível para 19/09 ou 20/09', accent: 'cyan' },
  { name: 'Família / grupo', price: 'R$ 100', fee: '+ R$ 8,50 de taxa', detail: 'Válido para quatro pessoas no mesmo dia', note: 'Família ou grupo de amigos. Sem comprovação de parentesco.', accent: 'yellow' },
  { name: 'VIP', price: 'R$ 100', fee: '+ R$ 8,50 de taxa', detail: 'Acesso aos dois dias · apenas 100 unidades', note: 'Entrada uma hora antes, prioridade, credencial exclusiva e 3 brindes. Não inclui campeonatos.', accent: 'pink' },
  { name: 'Meia / benefício', price: 'R$ 50', fee: '+ R$ 4,25 de taxa', detail: 'PCD, TEA e demais beneficiários', note: 'Conforme legislação e regras aplicáveis.', accent: 'red' }
] as const;

export const sponsorshipTiers = [
  { name: 'Start', price: 'R$ 500', availability: '8 cotas', position: 'Entrada para sua marca no festival', accent: 'cyan' },
  { name: 'Power-up', price: 'R$ 1.000', availability: '4 cotas', position: 'Mais presença para a sua marca', accent: 'yellow' },
  { name: 'Champion', price: 'R$ 2.000', availability: '2 cotas', position: 'Destaque para quem quer competir junto', accent: 'pink' },
  { name: 'Legend', price: 'R$ 5.000', availability: '1 cota', position: 'Cota principal do festival', accent: 'red' }
] as const;

export const experienceProperties = [
  'Campeonato Mortal Kombat 1',
  'Campeonato Street Fighter 6',
  'Campeonato Tekken 8',
  'Concurso Cosplay',
  'Just Dance 2026',
  'Painel de Dublagem'
] as const;

export const partners = [
  { name: 'Edge 3D Studio', handle: '@edge3dstudio', status: 'Patrocinador oficial + expositor confirmado', href: 'https://www.instagram.com/edge3dstudio/', accent: 'yellow' },
  { name: 'Alterstate', handle: '@usealterstate', status: 'Apoio confirmado', href: '', accent: 'cyan' }
] as const;

export const inKindOptions = ['alimentação', 'água e bebidas', 'brindes', 'impressão e materiais', 'equipamentos e estrutura', 'serviços e logística', 'mídia e divulgação', 'produtos e outras soluções'] as const;

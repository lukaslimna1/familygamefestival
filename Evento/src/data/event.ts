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
    sponsors: 'https://wa.me/5514991152263?text=Ol%C3%A1%2C%20quero%20receber%20mais%20informa%C3%A7%C3%B5es%20sobre%20como%20patrocinar%20o%20Family%20Game%20Festival.'
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
  { label: 'Patrocinadores', href: '#patrocinadores' },
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
    image: '/assets/mascots/1 - Pose Aqui.svg',
    description: 'Jogadora de Just Dance, com mais de 10 anos de experiência no universo geek e da dança; campeã, produtora e apresentadora de eventos geek.',
    highlight: 'Seletiva valendo vaga para o Nacional de Just Dance 2026 · 19/09'
  },
  {
    name: 'Raul Schlosser',
    handle: '@raul_schlosser',
    instagramUrl: 'https://www.instagram.com/raul_schlosser/',
    role: 'Painel de dublagem',
    accent: 'pink',
    image: '/assets/mascots/4 - Pose Ok.svg',
    description: 'Dublador brasileiro de Jiraiya, Wolverine, Luigi, Cell e outros personagens queridos pelo público.',
    highlight: 'Painel, fotos, autógrafos e interação com o público · 19/09'
  }
] as const;

export const attractions = [
  { eyebrow: 'COMPITA', title: 'Arena de campeonatos', text: 'Mortal Kombat 1, Street Fighter 6, Tekken 8, FC 26, eFootball e Top Gear 1.', icon: 'trophy.svg', accent: 'red' },
  { eyebrow: 'DANCE MODE', title: 'Just Dance 2026', text: 'Uma seletiva especial no dia 19/09 valendo vaga para o Nacional de Just Dance 2026.', icon: 'controller.svg', accent: 'cyan' },
  { eyebrow: 'COSPLAY', title: 'Concurso Cosplay', text: 'Solte a criatividade com temas de games, anime, mangá, filmes, séries, quadrinhos e cultura geek.', icon: 'crown.svg', accent: 'pink' },
  { eyebrow: 'COMUNIDADE', title: 'Random Play Dance', text: 'K-pop no centro do festival: a música toca, a roda abre e quem souber a coreografia entra para dançar.', icon: 'star.svg', accent: 'yellow' }
] as const;

export const tournaments = [
  { id: 'cosplay', category: 'Cosplay', title: 'Concurso Cosplay', time: '16h00', date: '20', accent: 'pink', prize: 'R$ 1.000', detail: 'Participação sujeita ao regulamento oficial e limite de vagas.', featured: true },
  { id: 'just-dance-2026', category: 'Dance Game', title: 'Just Dance 2026', time: '', date: '19', accent: 'yellow', prize: '1 vaga', detail: 'Seletiva valendo 1 vaga para o Nacional de Just Dance 2026.', featured: true },
  { id: 'mortal-kombat-1', category: 'Fight Games', title: 'Mortal Kombat 1', time: '14h00', date: '20', accent: 'red', prize: 'R$ 1.000', detail: 'Vagas limitadas.' },
  { id: 'street-fighter-6', category: 'Fight Games', title: 'Street Fighter 6', time: '18h00', date: '20', accent: 'cyan', prize: 'R$ 1.000', detail: 'Vagas limitadas.' },
  { id: 'tekken-8', category: 'Fight Games', title: 'Tekken 8', time: '16h00', date: '20', accent: 'pink', prize: 'R$ 1.000', detail: 'Vagas limitadas.' },
  { id: 'fc-26', category: 'Esport Games', title: 'FC 26', time: '', date: '19 e 20', accent: 'cyan', prize: 'R$ 100', detail: 'Inscrição R$ 30 · vagas limitadas.' },
  { id: 'efootball', category: 'Esport Games', title: 'eFootball', time: '', date: '19 e 20', accent: 'yellow', prize: 'R$ 100', detail: 'Inscrição R$ 30 · vagas limitadas.' },
  { id: 'top-gear-1', category: 'Retrô Games', title: 'Top Gear 1', time: '', date: '19 e 20', accent: 'red', prize: 'R$ 100', detail: 'Inscrição R$ 30 · vagas limitadas.' }
] as const;

export const tournamentGroups = [
  { title: 'Fight Games', kicker: 'FIGHT GAMES', accent: 'red', ids: ['mortal-kombat-1', 'street-fighter-6', 'tekken-8'] },
  { title: 'Esport Games', kicker: 'ESPORT GAMES', accent: 'cyan', ids: ['fc-26', 'efootball'] },
  { title: 'Retrô Games', kicker: 'RETRÔ GAMES', accent: 'yellow', ids: ['top-gear-1'] }
] as const;

export const gameArt = [
  {
    title: 'Mortal Kombat 1',
    image: 'https://mortalkombatgamessupport.wbgames.com/hc/article_attachments/32814706772371',
    alt: 'Arte oficial de Mortal Kombat 1',
    accent: 'red',
    fit: 'cover'
  },
  {
    title: 'Street Fighter 6',
    image: 'https://img-eshop.cdn.nintendo.net/i/0d7ec0b23a532e3d3ebb8c8a1f8287703d57212b71c97286c954220f1320dba7.jpg',
    alt: 'Arte oficial de Street Fighter 6',
    accent: 'cyan',
    fit: 'cover'
  },
  {
    title: 'Tekken 8',
    image: 'https://us-east-1-bandai.graphassets.com/AXzioIclSWilEjFtsMJPwz/cm8xnqwr6jlkt07lccbz2dcqa',
    alt: 'Arte oficial de Tekken 8',
    accent: 'pink',
    fit: 'cover'
  },
  {
    title: 'Just Dance 2026',
    image: 'https://staticctf.ubisoft.com/J3yJr34U2pZ2Ieem48Dwy9uqj5PNUQTn/5l2jwO39hbiuxP6YflvAMz/08e8183e56b5be38032f9a563a9387c6/JD26-logo-header.png',
    alt: 'Logo oficial de Just Dance 2026',
    accent: 'yellow',
    fit: 'contain'
  },
  {
    title: 'FC 26',
    image: 'https://drop-assets.ea.com/images/6g5Yie1DUeAS4zbSBADAr0/0aee1e0e6d4c371042db4ad7b521e377/EAS_FC26_WGE_KeyArt-no-copy-16x9.jpg?im=AspectCrop%3D%2816%2C9%29%2CxPosition%3D0.5%2CyPosition%3D0.5',
    alt: 'Arte oficial de EA SPORTS FC 26',
    accent: 'cyan',
    fit: 'cover'
  },
  {
    title: 'eFootball',
    image: '/assets/game-art/efootball-konami.png',
    alt: 'Logo oficial de eFootball da KONAMI',
    accent: 'yellow',
    fit: 'contain'
  },
  {
    title: 'Top Gear',
    image: 'https://images.launchbox-app.com/d7c80b5e-dc9c-4539-ae2e-3d192ca4e563.jpg',
    alt: 'Capa clássica de Top Gear para Super Nintendo',
    accent: 'red',
    fit: 'cover'
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
  { name: 'Ingresso diário', price: 'R$ 30', fee: '+ R$ 2,55 de taxa', detail: 'Acesso por um dia', note: 'Escolha 19/09 ou 20/09.', accent: 'cyan' },
  { name: 'Família / grupo', price: 'R$ 100', fee: '+ R$ 8,50 de taxa', detail: 'Quatro pessoas no mesmo dia', note: 'Sem comprovação de parentesco.', accent: 'yellow' },
  { name: 'Meia / benefício', price: 'R$ 50', fee: '+ R$ 4,25 de taxa', detail: 'PCD, TEA e demais beneficiários', note: 'Conforme legislação e regras aplicáveis.', accent: 'red' }
] as const;

export const competitorTickets = [
  { name: 'Tekken 8', icon: '👊', price: 'R$ 60,00', fee: '+ R$ 5,10 de taxa', installments: 'em até 12x de R$ 6,66', schedule: '20 · 16h00', prize: 'R$ 1.000', note: 'Premiação de R$ 1.000 para o campeão. Vagas limitadas.', accent: 'pink' },
  { name: 'Mortal Kombat 1', icon: '⚔️', price: 'R$ 60,00', fee: '+ R$ 5,10 de taxa', installments: 'em até 12x de R$ 6,66', schedule: '20 · 14h00', prize: 'R$ 1.000', note: 'Premiação de R$ 1.000 para o campeão. Vagas limitadas.', accent: 'red' },
  { name: 'Street Fighter 6', icon: '🥊', price: 'R$ 60,00', fee: '+ R$ 5,10 de taxa', installments: 'em até 12x de R$ 6,66', schedule: '20 · 18h00', prize: 'R$ 1.000', note: 'Premiação de R$ 1.000 para o campeão. Vagas limitadas.', accent: 'cyan' },
  { name: 'Concurso Cosplay', icon: '🎭', price: 'R$ 60,00', fee: '+ R$ 5,10 de taxa', installments: 'em até 12x de R$ 6,66', schedule: '20 · 16h00', prize: 'R$ 1.000', note: 'Participação sujeita ao regulamento oficial e limite de vagas.', accent: 'yellow' }
] as const;

export const partners = [
  { name: 'Family Games', handle: 'Realização', level: 'Realização', status: 'Responsável pela realização do Family Game Festival.', href: '', merchant: false, accent: 'yellow' },
  { name: 'Edge 3D Studio', handle: '@edge3dstudio', level: 'Power-up', status: 'Patrocinador oficial · lojista confirmado', href: 'https://www.instagram.com/edge3dstudio/', merchant: true, accent: 'yellow' },
  { name: 'Alterstate', handle: '@usealterstate', level: 'Apoio', status: 'Apoio confirmado', href: 'https://www.instagram.com/usealterstate/', merchant: false, accent: 'cyan' },
  { name: 'SORRI Bauru', handle: 'sorribauru.com.br', level: 'Apoio', status: 'Apoio institucional · sede do festival', href: 'https://sorribauru.com.br', merchant: false, accent: 'pink' }
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
    items: ['Cosplay', 'Just Dance', 'Mortal Kombat 1', 'Street Fighter 6', 'Tekken 8', 'FC 26', 'eFootball', 'Top Gear 1'],
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

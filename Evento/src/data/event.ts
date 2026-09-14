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
    slug: 'lana',
    handle: '@lana_vgs',
    instagramUrl: 'https://www.instagram.com/lana_vgs/',
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
    role: 'Painel de dublagem',
    accent: 'pink',
    image: '/assets/atraction/Raul Schlosser 02.png',
    description: 'Dublador brasileiro de Jiraiya, Wolverine, Luigi, Cell e outros personagens queridos pelo público.',
    highlight: 'Painel, fotos, autógrafos e interação com o público · 19/09'
  },
  {
    name: 'Héliades Cosplay',
    slug: 'heliades',
    handle: '@heliadescosplay',
    instagramUrl: 'https://www.instagram.com/heliadescosplay/',
    role: 'Jurada do Concurso Cosplay',
    accent: 'yellow',
    image: '/assets/atraction/Heliades Cosplay.png',
    description: 'Jurada convidada para avaliar o Concurso Cosplay do Family Game Festival.',
    highlight: 'Concurso Cosplay · 20/09'
  }
] as const;

export const attractions = [
  { eyebrow: 'COMPITA', title: 'Arena de campeonatos', text: 'Mortal Kombat 1, Street Fighter 6, Tekken 8, Naruto Storm 4, FC 26, eFootball e Top Gear 1.', icon: 'trophy.svg', accent: 'red' },
  { eyebrow: 'DANCE MODE', title: 'Just Dance 2026', text: 'Uma seletiva especial no dia 19/09 valendo vaga para o Nacional de Just Dance 2026.', icon: 'controller.svg', accent: 'cyan' },
  { eyebrow: 'COSPLAY', title: 'Concurso Cosplay', text: 'Solte a criatividade com temas de games, anime, mangá, filmes, séries, quadrinhos e cultura geek.', icon: 'crown.svg', accent: 'pink' },
  { eyebrow: 'COMUNIDADE', title: 'Random Play Dance', text: 'K-pop no centro do festival: a música toca, a roda abre e quem souber a coreografia entra para dançar.', icon: 'star.svg', accent: 'yellow' }
] as const;

export const tournaments = [
  { id: 'cosplay', category: 'Cosplay', title: 'Concurso Cosplay', time: '16h00', date: '20', accent: 'pink', prize: 'R$ 1.000', detail: 'Participação sujeita ao regulamento oficial e limite de vagas.', featured: true },
  { id: 'just-dance-2026', category: 'Dance Game', title: 'Just Dance 2026', time: '', date: '19', accent: 'yellow', prize: '1 vaga para o Nacional', detail: 'Seletiva valendo 1 vaga para o Nacional de Just Dance 2026.', featured: true },
  { id: 'mortal-kombat-1', category: 'Fight Games', title: 'Mortal Kombat 1', time: '14h00', date: '20', accent: 'red', prize: 'R$ 1.000', detail: 'Vagas limitadas.' },
  { id: 'street-fighter-6', category: 'Fight Games', title: 'Street Fighter 6', time: '18h00', date: '20', accent: 'cyan', prize: 'R$ 1.000', detail: 'Vagas limitadas.' },
  { id: 'tekken-8', category: 'Fight Games', title: 'Tekken 8', time: '16h00', date: '20', accent: 'pink', prize: 'R$ 1.000', detail: 'Vagas limitadas.' },
  { id: 'naruto-storm-4', category: 'Fight Games', title: 'Naruto Storm 4', time: '14h00', date: '20', accent: 'yellow', prize: 'R$ 100', detail: 'PS4 · Single Elimination · Inscrição via PIX.' },
  { id: 'fc-26', category: 'Esport Games', title: 'FC 26', time: '', date: '19 e 20', accent: 'cyan', prize: 'R$ 100', detail: 'Inscrição R$ 30 · vagas limitadas.' },
  { id: 'efootball', category: 'Esport Games', title: 'eFootball', time: '', date: '19 e 20', accent: 'yellow', prize: 'R$ 100', detail: 'Inscrição R$ 30 · vagas limitadas.' },
  { id: 'top-gear-1', category: 'Retrô Games', title: 'Top Gear 1', time: '', date: '19 e 20', accent: 'red', prize: 'R$ 100', detail: 'Inscrição R$ 30 · vagas limitadas.' }
] as const;

export const tournamentGroups = [
  { title: 'Fight Games', kicker: 'FIGHT GAMES', accent: 'red', ids: ['mortal-kombat-1', 'street-fighter-6', 'tekken-8', 'naruto-storm-4'] },
  { title: 'Esport Games', kicker: 'ESPORT GAMES', accent: 'cyan', ids: ['fc-26', 'efootball'] },
  { title: 'Retrô Games', kicker: 'RETRÔ GAMES', accent: 'yellow', ids: ['top-gear-1'] }
] as const;

export const gameArt = [
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
    title: 'FC 26',
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
    title: 'Top Gear',
    image: 'https://images.launchbox-app.com//97538188-65b0-4e08-8870-316a07cad1d1.jpg',
    alt: 'Capa original de Top Gear para Super Nintendo',
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
  { name: 'Ingresso diário', price: 'R$ 30', fee: '+ R$ 2,55 de taxa', detail: 'Acesso por um dia', note: 'Escolha 19/09 ou 20/09.', accent: 'cyan' },
  { name: 'Família / grupo', price: 'R$ 100', fee: '+ R$ 8,50 de taxa', detail: 'Quatro pessoas no mesmo dia', note: 'Sem comprovação de parentesco.', accent: 'yellow' },
  { name: 'Meia / benefício', price: 'R$ 50', fee: '+ R$ 4,25 de taxa', detail: 'PCD, TEA e demais beneficiários', note: 'Conforme legislação e regras aplicáveis.', accent: 'red' }
] as const;

export const competitorTickets = [
  { name: 'Tekken 8', icon: '👊', price: 'R$ 60,00', fee: '+ R$ 5,10 de taxa', installments: 'em até 12x de R$ 6,66', schedule: '20 · 16h00', prize: 'R$ 1.000', note: 'Premiação de R$ 1.000 para o campeão. Vagas limitadas.', accent: 'pink' },
  { name: 'Mortal Kombat 1', icon: '⚔️', price: 'R$ 60,00', fee: '+ R$ 5,10 de taxa', installments: 'em até 12x de R$ 6,66', schedule: '20 · 14h00', prize: 'R$ 1.000', note: 'Premiação de R$ 1.000 para o campeão. Vagas limitadas.', accent: 'red' },
  { name: 'Street Fighter 6', icon: '🥊', price: 'R$ 60,00', fee: '+ R$ 5,10 de taxa', installments: 'em até 12x de R$ 6,66', schedule: '20 · 18h00', prize: 'R$ 1.000', note: 'Premiação de R$ 1.000 para o campeão. Vagas limitadas.', accent: 'cyan' },
  { name: 'Naruto Storm 4', icon: '🍥', price: 'R$ 30,00', fee: 'Pagamento via PIX', installments: 'PS4 · Single Elimination', schedule: '20 · 14h00', prize: 'R$ 100', note: 'Inscrições online; presencial com valor maior. familygameeventos@gmail.com', accent: 'yellow' },
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
    items: ['Cosplay', 'Just Dance', 'Mortal Kombat 1', 'Street Fighter 6', 'Tekken 8', 'Naruto Storm 4', 'FC 26', 'eFootball', 'Top Gear 1'],
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

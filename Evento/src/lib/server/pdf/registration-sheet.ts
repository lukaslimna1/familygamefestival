import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import { formatCpf, formatPhone } from '../../registration-validation';

export type RegistrationSheetData = {
  publicCode: string;
  participant: {
    fullName: string;
    cpf: string;
    phone: string;
    email: string;
    dateOfBirth: string;
    city?: string | null;
    state?: string | null;
    instagram?: string | null;
    tiktok?: string | null;
    facebook?: string | null;
    otherSocials?: string | null;
  };
  competition: {
    title: string;
    category: string;
    eventDay: string;
    eventDate: string;
    startTime: string;
    eventAccessIncluded: boolean;
  };
  guardian?: {
    fullName: string;
    cpf: string;
    phone: string;
    email: string;
    relationship: string;
  } | null;
  cosplay?: {
    stageName?: string | null;
    stageCallName: string;
    characterName: string;
    sourceWork: string;
    presentationType: string;
    cosplayDescription?: string | null;
    presentationDescription?: string | null;
    presentationNotes?: string | null;
    technicalNotes?: string | null;
    judgeNotes?: string | null;
    musicTitle?: string | null;
  } | null;
  kpop?: {
    stageName?: string | null;
    originalArtist: string;
    songTitle: string;
    songVersion?: string | null;
    editedCut: string;
    referenceUrl: string;
    audioNotes?: string | null;
    judgeNotes?: string | null;
    pendriveAcknowledged: boolean;
  } | null;
  links?: Array<{ label: string; url: string }>;
  files?: Array<{ fileType: string; originalName: string; mimeType: string; sizeBytes: number }>;
  consents: Array<{ type: string; granted: boolean; policyVersion: string; grantedAt: string }>;
  generatedAt: string;
  updatedAt?: string | null;
};

export type GuardianAuthorizationCompetition = {
  id: string;
  title: string;
  category: string;
  eventDay?: string;
  eventDate: string;
  displayDate?: string;
  startTime?: string;
};

export type GuardianAuthorizationData = {
  mode?: 'blank' | 'filled';
  publicCode?: string | null;
  version?: number | null;
  participant?: { fullName?: string | null; cpf?: string | null; dateOfBirth?: string | null };
  guardian?: { fullName?: string | null; cpf?: string | null; phone?: string | null; email?: string | null; relationship?: string | null };
  competitions: GuardianAuthorizationCompetition[];
  selectedCompetitionIds?: string[];
  location?: string;
  eventDates?: string;
  generatedAt?: string;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 48;
const CONTENT_BOTTOM = 62;
const PAPER = rgb(0.965, 0.973, 0.976);
const NAVY = rgb(0.031, 0.067, 0.122);
const INK = rgb(0.063, 0.094, 0.157);
const MUTED = rgb(0.35, 0.42, 0.5);
const LINE = rgb(0.82, 0.85, 0.88);
const YELLOW = rgb(1, 0.788, 0.157);
const CYAN = rgb(0.098, 0.776, 0.949);
const PINK = rgb(0.929, 0.176, 0.569);

function valueOf(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatHumanDate(value: string | null | undefined) {
  const match = valueOf(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : valueOf(value);
}

function formatOtherSocials(value: string | null | undefined) {
  if (!valueOf(value)) return '';
  try {
    const parsed = JSON.parse(value as string) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is { label?: unknown; url?: unknown } => typeof item === 'object' && item !== null)
        .map((item) => `${valueOf(typeof item.label === 'string' ? item.label : '')}: ${valueOf(typeof item.url === 'string' ? item.url : '')}`.replace(/^: |: $/g, ''))
        .filter(Boolean)
        .join('\n');
    }
  } catch {
    // Preserve a legacy free-text value.
  }
  return valueOf(value);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  const paragraphs = text.replace(/\r\n?/g, '\n').split('\n');
  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      if (paragraphs.length > 1) lines.push('');
      continue;
    }

    let current = '';
    const pushWord = (word: string) => {
      let remainder = word;
      while (remainder && font.widthOfTextAtSize(remainder, size) > maxWidth) {
        let splitAt = 1;
        while (splitAt < remainder.length && font.widthOfTextAtSize(remainder.slice(0, splitAt + 1), size) <= maxWidth) splitAt += 1;
        if (current) {
          lines.push(current);
          current = '';
        }
        lines.push(remainder.slice(0, splitAt));
        remainder = remainder.slice(splitAt);
      }
      if (!remainder) return;
      const candidate = current ? `${current} ${remainder}` : remainder;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
      else {
        if (current) lines.push(current);
        current = remainder;
      }
    };

    for (const word of words) pushWord(word);
    if (current) lines.push(current);
  }
  while (lines.at(-1) === '') {
    lines.pop();
  }
  return lines;
}

function consentLabel(type: string) {
  return ({
    competition_regulation: 'Regulamento aplicável',
    image_use: 'Uso de imagem',
    pendrive_backup: 'Backup de áudio em pendrive'
  } as Record<string, string>)[type] || 'Confirmação registrada';
}

export async function createRegistrationSheetPdf(data: RegistrationSheetData) {
  const document = await PDFDocument.create();
  document.setTitle(`Ficha de inscrição - ${data.publicCode}`);
  document.setSubject('Ficha de inscrição do Family Game Festival 2026');
  document.setCreator('Family Game Festival');
  const font = await document.embedFont(StandardFonts.Helvetica);
  const boldFont = await document.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedOfficialLogo(document);
  let pageNumber = 0;
  let page!: PDFPage;
  let y = 0;
  let sectionNumber = 0;
  const newPage = () => {
    pageNumber += 1;
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawHeader(page, logo, boldFont, 'FICHA DE INSCRIÇÃO', data.publicCode);
    y = 758;
  };
  const moveToNextPage = () => {
    drawFooter(page, font, pageNumber);
    newPage();
  };
  const ensure = (height: number) => {
    if (y - height < CONTENT_BOTTOM) moveToNextPage();
  };
  const drawAdaptiveLongField = (label: string, value: string | null | undefined) => {
    const text = valueOf(value);
    if (!text) return;
    const lines = wrapText(text, font, 9.2, PAGE_WIDTH - (MARGIN * 2));
    if (!lines.length) return;

    // Keep the label and at least two lines together. If the text is larger
    // than a page, continue it naturally on the next page with a clear marker.
    ensure(43);
    page.drawText(label.toUpperCase(), { x: MARGIN, y, size: 7.4, font: boldFont, color: MUTED });
    y -= 16;
    for (const [index, line] of lines.entries()) {
      if (y - 11 < CONTENT_BOTTOM) {
        moveToNextPage();
        page.drawText(`${label.toUpperCase()} (CONTINUAÇÃO)`, { x: MARGIN, y, size: 7.4, font: boldFont, color: MUTED });
        y -= 16;
      }
      page.drawText(line, { x: MARGIN, y, size: 9.2, font, color: INK, maxWidth: PAGE_WIDTH - (MARGIN * 2) });
      y -= 13;
      if (index === lines.length - 1) y -= 9;
    }
  };
  const section = (title: string, fields: Array<[string, string | null | undefined]>, longFields: Array<[string, string | null | undefined]> = []) => {
    if (!fields.some(([, value]) => valueOf(value)) && !longFields.some(([, value]) => valueOf(value))) return;
    sectionNumber += 1;
    ensure(55);
    y = drawSectionHeading(page, String(sectionNumber).padStart(2, '0'), title, y, boldFont);
    fields.forEach(([label, value]) => { ensure(24); y = drawRow(page, label, valueOf(value), y, font, boldFont); });
    longFields.forEach(([label, value]) => drawAdaptiveLongField(label, value));
    y -= 4;
  };

  newPage();
  section('INSCRIÇÃO / COMPETIÇÃO', [
    ['Competição', data.competition.title],
    ['Categoria', data.competition.category === data.competition.title ? '' : data.competition.category],
    ['Data', `${valueOf(data.competition.eventDay)} - ${formatHumanDate(data.competition.eventDate)}`],
    ['Horário', data.competition.startTime],
    ['Acesso ao evento', data.competition.eventAccessIncluded ? 'Incluído no ingresso de competidor' : 'Não incluído']
  ]);
  section('PARTICIPANTE', [
    ['Nome completo', data.participant.fullName],
    ['CPF', formatCpf(data.participant.cpf)],
    ['Nascimento', formatHumanDate(data.participant.dateOfBirth)],
    ['Telefone', formatPhone(data.participant.phone)],
    ['E-mail', data.participant.email],
    ['Cidade / UF', [data.participant.city, data.participant.state].filter(Boolean).join(' / ')]
  ]);
  if (data.guardian) section('RESPONSÁVEL LEGAL', [
    ['Nome completo', data.guardian.fullName],
    ['CPF', formatCpf(data.guardian.cpf)],
    ['Telefone', formatPhone(data.guardian.phone)],
    ['E-mail', data.guardian.email],
    ['Parentesco / relação', data.guardian.relationship]
  ]);
  section('REDES E LINKS', [
    ['Instagram', data.participant.instagram],
    ['TikTok', data.participant.tiktok],
    ['Facebook', data.participant.facebook],
    ['Outras redes', formatOtherSocials(data.participant.otherSocials)],
    ...((data.links || []).map((link) => [link.label, link.url] as [string, string]))
  ]);
  if (data.cosplay) {
    section('COSPLAY', [
      ['Nome artístico', data.cosplay.stageName],
      ['Nome para chamada', data.cosplay.stageCallName],
      ['Personagem', data.cosplay.characterName],
      ['Obra / franquia', data.cosplay.sourceWork]
    ], [['Descrição do cosplay', data.cosplay.cosplayDescription]]);
    section('APRESENTAÇÃO', [
      ['Formato', data.cosplay.presentationType],
      ['Título do áudio', data.cosplay.musicTitle]
    ], [
      ['Descrição da apresentação', data.cosplay.presentationDescription],
      ['Observações da apresentação', data.cosplay.presentationNotes],
      ['Observações técnicas', data.cosplay.technicalNotes],
      ['Observações para os jurados', data.cosplay.judgeNotes]
    ]);
  }
  if (data.kpop) {
    section('DADOS DA APRESENTAÇÃO', [
      ['Nome artístico', data.kpop.stageName],
      ['Artista / grupo original', data.kpop.originalArtist],
      ['Nome da música', data.kpop.songTitle],
      ['Versão da música', data.kpop.songVersion],
      ['Música editada ou cortada?', data.kpop.editedCut === 'yes' ? 'Sim' : 'Não'],
      ['Referência', data.kpop.referenceUrl],
      ['Cópia em pendrive', data.kpop.pendriveAcknowledged ? 'Confirmado' : 'Não confirmado']
    ], [
      ['Observações sobre o áudio', data.kpop.audioNotes],
      ['Observações para os jurados', data.kpop.judgeNotes]
    ]);
  }
  section('ACEITES', data.consents.filter((consent) => consent.granted).map((consent) => [consentLabel(consent.type), 'Confirmado'] as [string, string]));
  drawFooter(page, font, pageNumber);
  return document.save();
}

async function embedOfficialLogo(document: PDFDocument) {
  const candidates = [
    join(process.cwd(), 'public', 'assets', 'logo.png'),
    fileURLToPath(new URL('../../../../public/assets/logo.png', import.meta.url))
  ];
  for (const candidate of candidates) {
    try {
      return await document.embedPng(await readFile(candidate));
    } catch {
      // Try the next runtime path.
    }
  }
  return null;
}

function drawFooter(page: PDFPage, font: PDFFont, pageNumber: number) {
  page.drawLine({ start: { x: MARGIN, y: 47 }, end: { x: PAGE_WIDTH - MARGIN, y: 47 }, thickness: 0.7, color: LINE });
  page.drawText('Family Game Festival 2026  -  19 e 20 de setembro  -  Bauru/SP  -  @familygamex', {
    x: MARGIN, y: 31, size: 7.6, font, color: MUTED, maxWidth: 440
  });
  page.drawText(String(pageNumber).padStart(2, '0'), { x: PAGE_WIDTH - 70, y: 31, size: 8, font, color: MUTED });
}

function drawHeader(page: PDFPage, logo: PDFImage | null, boldFont: PDFFont, title: string, code?: string) {
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: PAPER });
  page.drawRectangle({ x: 0, y: 785, width: PAGE_WIDTH, height: 57, color: NAVY });
  page.drawRectangle({ x: 0, y: 785, width: PAGE_WIDTH, height: 4, color: YELLOW });
  if (logo) {
    const height = 39;
    const width = logo.width * (height / logo.height);
    page.drawImage(logo, { x: MARGIN, y: 794, width, height });
  } else {
    page.drawText('FAMILY GAME', { x: MARGIN, y: 813, size: 15, font: boldFont, color: rgb(1, 1, 1) });
    page.drawText('FESTIVAL', { x: MARGIN, y: 798, size: 9, font: boldFont, color: YELLOW });
  }
  page.drawText('FAMILY GAME FESTIVAL 2026', { x: 173, y: 816, size: 8.5, font: boldFont, color: CYAN });
  page.drawText(title, { x: 173, y: 797, size: 16, font: boldFont, color: rgb(1, 1, 1), maxWidth: 255 });
  if (code) {
    page.drawRectangle({ x: 446, y: 798, width: 101, height: 24, color: YELLOW });
    page.drawText(code, { x: 454, y: 806, size: 9, font: boldFont, color: NAVY, maxWidth: 85 });
  }
}

function drawSectionHeading(page: PDFPage, number: string, title: string, y: number, boldFont: PDFFont) {
  page.drawRectangle({ x: MARGIN, y: y - 2, width: 20, height: 20, color: YELLOW });
  page.drawText(number, { x: MARGIN + 5.5, y: y + 4, size: 8, font: boldFont, color: NAVY });
  page.drawText(title, { x: MARGIN + 29, y: y + 4, size: 11, font: boldFont, color: NAVY });
  page.drawLine({ start: { x: MARGIN + 29, y: y - 5 }, end: { x: PAGE_WIDTH - MARGIN, y: y - 5 }, thickness: 1.2, color: CYAN });
  return y - 29;
}

function drawRow(page: PDFPage, label: string, value: string, y: number, font: PDFFont, boldFont: PDFFont, labelWidth = 135) {
  const text = valueOf(value);
  if (!text) return y;
  const valueX = MARGIN + labelWidth;
  const lines = wrapText(text, font, 9.2, PAGE_WIDTH - valueX - MARGIN);
  const labelLines = wrapText(label.toUpperCase(), boldFont, 7.4, labelWidth - 9);
  labelLines.forEach((line, index) => page.drawText(line, { x: MARGIN, y: y - index * 10, size: 7.4, font: boldFont, color: MUTED, maxWidth: labelWidth - 9 }));
  lines.forEach((line, index) => page.drawText(line, { x: valueX, y: y - index * 12, size: 9.2, font, color: INK, maxWidth: PAGE_WIDTH - valueX - MARGIN }));
  return y - Math.max(20, lines.length * 12, labelLines.length * 10);
}


function drawSmallField(page: PDFPage, x: number, width: number, label: string, value: string, y: number, font: PDFFont, boldFont: PDFFont) {
  page.drawText(label.toUpperCase(), { x, y, size: 7.1, font: boldFont, color: MUTED, maxWidth: width });
  const lines = wrapText(valueOf(value) || '________________________________', font, 9, width);
  lines.slice(0, 2).forEach((line, index) => page.drawText(line, { x, y: y - 13 - index * 11, size: 9, font, color: INK, maxWidth: width }));
}

function drawAuthorizationCheckbox(page: PDFPage, x: number, y: number, label: string, selected: boolean, font: PDFFont, boldFont: PDFFont) {
  page.drawRectangle({ x, y: y - 2, width: 11, height: 11, borderWidth: 0.9, borderColor: selected ? CYAN : MUTED, color: selected ? CYAN : PAPER });
  if (selected) {
    page.drawLine({ start: { x: x + 2, y: y + 2 }, end: { x: x + 5, y: y - 1 }, thickness: 1.2, color: NAVY });
    page.drawLine({ start: { x: x + 5, y: y - 1 }, end: { x: x + 10, y: y + 6 }, thickness: 1.2, color: NAVY });
  }
  page.drawText(label, { x: x + 18, y, size: 8.2, font: selected ? boldFont : font, color: INK, maxWidth: 225 });
}

function authorizationDate(competition: GuardianAuthorizationCompetition) {
  return competition.displayDate || formatHumanDate(competition.eventDate);
}

export async function createGuardianAuthorizationPdf(data: GuardianAuthorizationData) {
  const isBlank = data.mode === 'blank';
  const document = await PDFDocument.create();
  const identifier = data.publicCode ? `${data.publicCode} - V${data.version ?? 1}` : 'MODELO EM BRANCO';
  document.setTitle(`Autorização do responsável - ${identifier}`);
  document.setSubject('Autorização para participação de menor no Family Game Festival 2026');
  document.setCreator('Family Game Festival');
  const font = await document.embedFont(StandardFonts.Helvetica);
  const boldFont = await document.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedOfficialLogo(document);
  const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeader(page, logo, boldFont, 'AUTORIZAÇÃO DE MENOR', data.publicCode || undefined);
  let y = 758;
  page.drawText('AUTORIZAÇÃO DE PARTICIPAÇÃO DE MENOR DE IDADE', { x: MARGIN, y, size: 14, font: boldFont, color: NAVY, maxWidth: 390 });
  page.drawText(`Identificador técnico: ${identifier}`, { x: MARGIN, y: y - 18, size: 7.2, font, color: MUTED });
  y -= 40;

  y = drawSectionHeading(page, '01', 'PARTICIPANTE MENOR', y, boldFont);
  drawSmallField(page, MARGIN, 235, 'Nome completo', isBlank ? '' : valueOf(data.participant?.fullName), y, font, boldFont);
  drawSmallField(page, 315, 232, 'CPF', isBlank ? '' : formatCpf(data.participant?.cpf), y, font, boldFont);
  y -= 43;
  drawSmallField(page, MARGIN, 235, 'Data de nascimento', isBlank ? '' : formatHumanDate(data.participant?.dateOfBirth), y, font, boldFont);
  y -= 43;

  y = drawSectionHeading(page, '02', 'RESPONSÁVEL LEGAL', y, boldFont);
  drawSmallField(page, MARGIN, 235, 'Nome completo', isBlank ? '' : valueOf(data.guardian?.fullName), y, font, boldFont);
  drawSmallField(page, 315, 232, 'CPF', isBlank ? '' : formatCpf(data.guardian?.cpf), y, font, boldFont);
  y -= 43;
  drawSmallField(page, MARGIN, 235, 'Telefone / WhatsApp', isBlank ? '' : formatPhone(data.guardian?.phone), y, font, boldFont);
  drawSmallField(page, 315, 232, 'E-mail', isBlank ? '' : valueOf(data.guardian?.email), y, font, boldFont);
  y -= 43;
  drawSmallField(page, MARGIN, 235, 'Parentesco / relação', isBlank ? '' : valueOf(data.guardian?.relationship), y, font, boldFont);
  y -= 43;

  y = drawSectionHeading(page, '03', 'COMPETIÇÕES AUTORIZADAS', y, boldFont);
  const selected = new Set(data.selectedCompetitionIds || []);
  const groups = new Map<string, GuardianAuthorizationCompetition[]>();
  [...data.competitions].sort((a, b) => `${a.eventDate}-${a.startTime || ''}`.localeCompare(`${b.eventDate}-${b.startTime || ''}`)).forEach((competition) => {
    const key = `${valueOf(competition.eventDay) || 'EVENTO'} - ${authorizationDate(competition)}`;
    groups.set(key, [...(groups.get(key) || []), competition]);
  });
  for (const [groupName, competitions] of groups) {
    page.drawText(groupName, { x: MARGIN, y, size: 8, font: boldFont, color: PINK });
    y -= 17;
    const columns = [competitions.filter((_, index) => index % 2 === 0), competitions.filter((_, index) => index % 2 === 1)];
    const groupY = y;
    columns.forEach((column, columnIndex) => column.forEach((competition, index) => {
      const label = `${competition.title}${competition.startTime ? ` - ${competition.startTime}` : ''}`;
      drawAuthorizationCheckbox(page, columnIndex === 0 ? MARGIN : 315, groupY - index * 18, label, !isBlank && selected.has(competition.id), font, boldFont);
    }));
    y -= Math.max(columns[0].length, columns[1].length) * 18 + 8;
  }

  y = drawSectionHeading(page, '04', 'DECLARAÇÃO E ASSINATURA', y, boldFont);
  const declaration = 'Eu, responsável legal identificado acima, autorizo o participante menor a participar do Family Game Festival 2026 e das competições assinaladas neste documento. Declaro que os dados informados são verdadeiros e estou ciente de que a autorização assinada poderá ser solicitada pela organização.';
  const declarationLines = wrapText(declaration, font, 8.8, PAGE_WIDTH - (MARGIN * 2));
  declarationLines.forEach((line, index) => page.drawText(line, { x: MARGIN, y: y - index * 12, size: 8.8, font, color: INK, maxWidth: PAGE_WIDTH - (MARGIN * 2) }));
  y -= declarationLines.length * 12 + 20;
  page.drawText(`Local: ${isBlank ? '________________________________________' : valueOf(data.location) || 'Arena Tauste - SORRI Bauru'}`, { x: MARGIN, y, size: 8.8, font, color: INK });
  page.drawText(`Data: ${isBlank ? '____/____/________' : valueOf(data.eventDates) || '19 e 20 de setembro de 2026'}`, { x: 350, y, size: 8.8, font, color: INK, maxWidth: 195 });
  y -= 45;
  page.drawLine({ start: { x: 70, y }, end: { x: 275, y }, thickness: 0.9, color: INK });
  page.drawLine({ start: { x: 325, y }, end: { x: 525, y }, thickness: 0.9, color: INK });
  page.drawText('Assinatura manuscrita do responsável', { x: 78, y: y - 15, size: 7.8, font, color: MUTED });
  page.drawText('Data da assinatura', { x: 385, y: y - 15, size: 7.8, font, color: MUTED });
  drawFooter(page, font, 1);
  return document.save();
}

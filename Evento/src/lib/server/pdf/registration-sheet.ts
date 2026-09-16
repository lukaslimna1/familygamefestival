import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

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
  links?: Array<{ label: string; url: string }>;
  files?: Array<{ fileType: string; originalName: string; mimeType: string; sizeBytes: number }>;
  consents: Array<{
    type: string;
    granted: boolean;
    policyVersion: string;
    grantedAt: string;
  }>;
  generatedAt: string;
  updatedAt?: string | null;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const INK = rgb(0.16, 0.16, 0.2);
const MUTED = rgb(0.35, 0.35, 0.4);
const RED = rgb(0.76, 0.08, 0.2);

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (words.length === 0) return ['-'];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawHeader(page: PDFPage, font: PDFFont, boldFont: PDFFont, publicCode: string) {
  page.drawRectangle({ x: 0, y: 770, width: PAGE_WIDTH, height: 72, color: rgb(0.1, 0.07, 0.16) });
  page.drawText('FAMILY GAME FESTIVAL 2026', {
    x: 52,
    y: 808,
    size: 20,
    font: boldFont,
    color: rgb(1, 1, 1)
  });
  page.drawText('Ficha de inscrição', {
    x: 52,
    y: 786,
    size: 12,
    font,
    color: rgb(0.8, 0.9, 1)
  });
  page.drawText('CÓDIGO PÚBLICO', { x: 400, y: 811, size: 8, font: boldFont, color: rgb(0.75, 0.8, 0.9) });
  page.drawText(publicCode, { x: 400, y: 792, size: 13, font: boldFont, color: rgb(1, 0.82, 0.25) });
}

function drawSection(page: PDFPage, title: string, y: number, boldFont: PDFFont) {
  page.drawText(title, { x: 52, y, size: 12, font: boldFont, color: RED });
  return y - 28;
}

function drawField(
  page: PDFPage,
  label: string,
  value: string,
  y: number,
  font: PDFFont,
  boldFont: PDFFont,
  maxWidth = 350
) {
  page.drawText(`${label}:`, { x: 52, y, size: 10, font: boldFont, color: INK, maxWidth: 128 });
  const lines = wrapText(value || '-', font, 10, maxWidth);
  lines.forEach((line, index) => {
    page.drawText(line, { x: 190, y: y - index * 14, size: 10, font, color: INK, maxWidth });
  });
  return y - Math.max(20, lines.length * 14);
}

function drawLongField(page: PDFPage, label: string, value: string, y: number, font: PDFFont, boldFont: PDFFont) {
  page.drawText(label, { x: 52, y, size: 10, font: boldFont, color: INK });
  const lines = wrapText(value || '-', font, 10, 490);
  lines.forEach((line, index) => {
    page.drawText(line, { x: 52, y: y - 15 - index * 14, size: 10, font, color: INK, maxWidth: 490 });
  });
  return y - 29 - (lines.length - 1) * 14;
}

function formatOtherSocials(value: string | null | undefined) {
  if (!value) return value;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      const formatted = parsed
        .filter((item): item is { label?: unknown; url?: unknown } => typeof item === 'object' && item !== null)
        .map((item) => {
          const label = typeof item.label === 'string' ? item.label.trim() : '';
          const url = typeof item.url === 'string' ? item.url.trim() : '';
          return [label, url].filter(Boolean).join(': ');
        })
        .filter(Boolean)
        .join('\n');
      return formatted || '-';
    }
  } catch {
    // Preserve legacy free-text values that predate structured social links.
  }
  return value;
}

export async function createRegistrationSheetPdf(data: RegistrationSheetData) {
  const document = await PDFDocument.create();
  document.setTitle(`Ficha de inscrição - ${data.publicCode}`);
  document.setSubject('Ficha de inscrição do Family Game Festival 2026');
  document.setCreator('Family Game Festival');

  const font = await document.embedFont(StandardFonts.Helvetica);
  const boldFont = await document.embedFont(StandardFonts.HelveticaBold);
  const pages: PDFPage[] = [];
  const addPage = () => {
    const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    drawHeader(page, font, boldFont, data.publicCode);
    return page;
  };

  let page = addPage();
  let y = 720;
  const ensureSpace = (height: number) => {
    if (y - height < 70) {
      page = addPage();
      y = 720;
    }
  };
  const section = (title: string) => {
    ensureSpace(48);
    y = drawSection(page, title, y, boldFont);
  };
  const field = (label: string, value: string | null | undefined) => {
    ensureSpace(32);
    y = drawField(page, label, value || '-', y, font, boldFont);
  };
  const longField = (label: string, value: string | null | undefined) => {
    ensureSpace(48);
    page.drawText(label, { x: 52, y, size: 10, font: boldFont, color: INK });
    y -= 15;
    const lines = wrapText(value || '-', font, 10, 490);
    for (const line of lines) {
      if (y < 70) {
        page = addPage();
        y = 720;
      }
      page.drawText(line, { x: 52, y, size: 10, font, color: INK, maxWidth: 490 });
      y -= 14;
    }
    y -= 14;
  };

  section('COMPETIÇÃO');
  field('Modalidade', data.competition.title);
  field('Categoria', data.competition.category);
  field('Data', `${data.competition.eventDay} - ${data.competition.eventDate}`);
  field('Horário', data.competition.startTime);
  field('Acesso ao evento', data.competition.eventAccessIncluded ? 'Incluído no ingresso competidor' : 'Não incluído');

  section('PARTICIPANTE');
  field('Nome', data.participant.fullName);
  field('CPF', data.participant.cpf);
  field('Telefone', data.participant.phone);
  field('E-mail', data.participant.email);
  field('Nascimento', data.participant.dateOfBirth);
  field('Cidade / estado', [data.participant.city, data.participant.state].filter(Boolean).join(' / '));

  section('REDES SOCIAIS');
  field('Instagram', data.participant.instagram);
  field('TikTok', data.participant.tiktok);
  field('Facebook', data.participant.facebook);
  field('Outras redes', formatOtherSocials(data.participant.otherSocials));

  if (data.guardian) {
    section('RESPONSÁVEL LEGAL');
    field('Nome', data.guardian.fullName);
    field('CPF', data.guardian.cpf);
    field('Telefone', data.guardian.phone);
    field('E-mail', data.guardian.email);
    field('Relação', data.guardian.relationship);
  }

  if (data.cosplay) {
    section('COSPLAY E APRESENTAÇÃO');
    field('Nome artístico', data.cosplay.stageName);
    field('Nome para chamada', data.cosplay.stageCallName);
    field('Personagem', data.cosplay.characterName);
    field('Obra / franquia', data.cosplay.sourceWork);
    field('Modalidade', data.cosplay.presentationType);
    longField('Descrição do cosplay', data.cosplay.cosplayDescription);
    longField('Descrição da apresentação', data.cosplay.presentationDescription);
    longField('Observações da apresentação', data.cosplay.presentationNotes);
    longField('Observações técnicas', data.cosplay.technicalNotes);
    longField('Observações para os jurados', data.cosplay.judgeNotes);
    field('Título do áudio', data.cosplay.musicTitle);
  }

  if (data.links && data.links.length > 0) {
    section('LINKS DE REFERÊNCIA');
    data.links.forEach((link) => field(link.label, link.url));
  }

  if (data.files && data.files.length > 0) {
    section('ARQUIVOS');
    data.files.forEach((file) => field(file.fileType, `${file.originalName} · ${file.mimeType} · ${file.sizeBytes} bytes`));
  }

  section('ACEITES');
  data.consents.forEach((consent) => {
    field(consent.type, `${consent.granted ? 'Concedido' : 'Não concedido'} · ${consent.policyVersion} · ${consent.grantedAt}`);
  });

  ensureSpace(70);
  page.drawText(`Gerado em: ${data.generatedAt}`, { x: 52, y, size: 9, font, color: MUTED });
  y -= 18;
  page.drawText(`Última atualização: ${data.updatedAt || data.generatedAt}`, { x: 52, y, size: 9, font, color: MUTED });
  y -= 18;
  page.drawText('Documento gerado automaticamente pelo Family Game Festival.', {
    x: 52,
    y,
    size: 9,
    font,
    color: MUTED
  });

  // Keep the array referenced so the page lifecycle remains explicit for future
  // visual additions such as reference thumbnails.
  void pages;
  return document.save();
}
export type GuardianAuthorizationCompetition = {
  id: string;
  title: string;
  category: string;
  eventDate: string;
};

export type GuardianAuthorizationData = {
  mode?: 'blank' | 'filled' | 'editable';
  publicCode?: string | null;
  version?: number | null;
  participant?: {
    fullName?: string | null;
    cpf?: string | null;
    dateOfBirth?: string | null;
  };
  guardian?: {
    fullName?: string | null;
    cpf?: string | null;
    phone?: string | null;
    email?: string | null;
    relationship?: string | null;
  };
  competitions: GuardianAuthorizationCompetition[];
  selectedCompetitionIds?: string[];
  location?: string;
  eventDates?: string;
  generatedAt: string;
};

function drawAuthorizationCheckbox(
  page: PDFPage,
  x: number,
  y: number,
  label: string,
  selected: boolean,
  font: PDFFont,
  boldFont: PDFFont,
  form: ReturnType<PDFDocument['getForm']> | null,
  fieldName: string
) {
  if (form) {
    const checkbox = form.createCheckBox(fieldName);
    if (selected) checkbox.check();
    checkbox.addToPage(page, { x, y: y - 2, width: 12, height: 12, borderWidth: 1, borderColor: INK });
  } else {
    page.drawRectangle({ x, y: y - 2, width: 12, height: 12, borderWidth: 1, borderColor: INK });
    if (selected) page.drawText('X', { x: x + 2, y: y, size: 9, font: boldFont, color: RED });
  }
  page.drawText(label, { x: x + 20, y, size: 8.2, font, color: INK, maxWidth: 230 });
}

function addAuthorizationTextField(
  page: PDFPage,
  form: ReturnType<PDFDocument['getForm']> | null,
  label: string,
  value: string,
  fieldName: string,
  y: number,
  font: PDFFont,
  boldFont: PDFFont,
  width = 390
) {
  page.drawText(`${label}:`, { x: 52, y: y + 5, size: 9, font: boldFont, color: INK });
  if (form) {
    const field = form.createTextField(fieldName);
    if (value) field.setText(value);
    field.addToPage(page, { x: 178, y: y - 2, width, height: 20, borderWidth: 1, borderColor: INK, textColor: INK });
  } else {
    page.drawLine({ start: { x: 178, y }, end: { x: Math.min(PAGE_WIDTH - 52, 178 + width), y }, thickness: 1, color: INK });
    if (value) page.drawText(value, { x: 184, y: y + 5, size: 9, font, color: INK, maxWidth: width - 12 });
  }
  return y - 25;
}

export async function createGuardianAuthorizationPdf(data: GuardianAuthorizationData) {
  const mode = data.mode ?? 'filled';
  const isBlank = mode === 'blank';
  const isEditable = mode === 'editable';
  const document = await PDFDocument.create();
  const identifier = data.publicCode ? `${data.publicCode}-AUT-V${data.version ?? 1}` : 'AUTORIZAÇÃO EM BRANCO';
  document.setTitle(`Autorização do responsável - ${identifier}`);
  document.setSubject('Autorização universal para participação de menor no Family Game Festival 2026');
  document.setCreator('Family Game Festival');
  const font = await document.embedFont(StandardFonts.Helvetica);
  const boldFont = await document.embedFont(StandardFonts.HelveticaBold);
  const form = isEditable ? document.getForm() : null;
  const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  page.drawRectangle({ x: 0, y: 770, width: PAGE_WIDTH, height: 72, color: rgb(0.1, 0.07, 0.16) });
  page.drawText('FAMILY GAME FESTIVAL 2026', { x: 52, y: 808, size: 20, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText('Autorização universal do responsável legal', { x: 52, y: 786, size: 12, font, color: rgb(0.8, 0.9, 1) });
  page.drawText(identifier, { x: 335, y: 796, size: 10, font: boldFont, color: rgb(1, 0.82, 0.25), maxWidth: 208 });

  let y = 742;
  page.drawText('IDENTIFICAÇÃO DO DOCUMENTO', { x: 52, y, size: 11, font: boldFont, color: RED });
  y -= 25;
  y = addAuthorizationTextField(page, form, 'Código', isBlank ? '' : (data.publicCode ?? ''), 'authorization_code', y, font, boldFont, 170);
  y = addAuthorizationTextField(page, form, 'Versão', isBlank ? '' : `Versão ${data.version ?? 1}`, 'authorization_version', y, font, boldFont, 170);

  page.drawText('DADOS DO PARTICIPANTE MENOR', { x: 52, y, size: 11, font: boldFont, color: RED });
  y -= 25;
  y = addAuthorizationTextField(page, form, 'Nome completo', isBlank ? '' : (data.participant?.fullName ?? ''), 'participant_full_name', y, font, boldFont);
  y = addAuthorizationTextField(page, form, 'CPF', isBlank ? '' : (data.participant?.cpf ?? ''), 'participant_cpf', y, font, boldFont, 170);
  y = addAuthorizationTextField(page, form, 'Nascimento', isBlank ? '' : (data.participant?.dateOfBirth ?? ''), 'participant_date_of_birth', y, font, boldFont, 170);

  page.drawText('DADOS DO RESPONSÁVEL LEGAL', { x: 52, y, size: 11, font: boldFont, color: RED });
  y -= 25;
  y = addAuthorizationTextField(page, form, 'Nome completo', isBlank ? '' : (data.guardian?.fullName ?? ''), 'guardian_full_name', y, font, boldFont);
  y = addAuthorizationTextField(page, form, 'CPF', isBlank ? '' : (data.guardian?.cpf ?? ''), 'guardian_cpf', y, font, boldFont, 170);
  y = addAuthorizationTextField(page, form, 'Telefone', isBlank ? '' : (data.guardian?.phone ?? ''), 'guardian_phone', y, font, boldFont, 170);
  y = addAuthorizationTextField(page, form, 'E-mail', isBlank ? '' : (data.guardian?.email ?? ''), 'guardian_email', y, font, boldFont);
  y = addAuthorizationTextField(page, form, 'Relação', isBlank ? '' : (data.guardian?.relationship ?? ''), 'guardian_relationship', y, font, boldFont, 170);

  page.drawText('COMPETIÇÕES AUTORIZADAS', { x: 52, y, size: 11, font: boldFont, color: RED });
  y -= 22;
  const selectedIds = new Set(data.selectedCompetitionIds ?? []);
  const columns = [data.competitions.slice(0, Math.ceil(data.competitions.length / 2)), data.competitions.slice(Math.ceil(data.competitions.length / 2))];
  const competitionStartY = y;
  columns.forEach((column, columnIndex) => {
    let columnY = competitionStartY;
    column.forEach((competition) => {
      drawAuthorizationCheckbox(
        page,
        columnIndex === 0 ? 52 : 315,
        columnY,
        `${competition.title} · ${competition.eventDate}`,
        !isBlank && selectedIds.has(competition.id),
        font,
        boldFont,
        form,
        `competition_${competition.id}`
      );
      columnY -= 24;
    });
  });
  y -= Math.ceil(Math.max(columns[0].length, columns[1].length) * 24) + 3;

  const declaration = 'Eu, responsável legal identificado acima, autorizo o participante menor a participar do Family Game Festival 2026 e das competições assinaladas neste documento, conforme os regulamentos oficiais. Declaro que os dados informados são verdadeiros e estou ciente de que esta autorização poderá ser solicitada pela organização.';
  y = drawLongField(page, 'DECLARAÇÃO', declaration, y, font, boldFont);
  y -= 25;
  y = addAuthorizationTextField(page, form, 'Local', isBlank ? '' : (data.location ?? 'Arena Tauste · Bauru'), 'event_location', y, font, boldFont);
  y = addAuthorizationTextField(page, form, 'Data do evento', isBlank ? '' : (data.eventDates ?? '19 e 20/09/2026'), 'event_dates', y, font, boldFont, 170);
  y -= 15;
  page.drawLine({ start: { x: 72, y }, end: { x: 280, y }, thickness: 1, color: INK });
  page.drawLine({ start: { x: 315, y }, end: { x: 523, y }, thickness: 1, color: INK });
  page.drawText('Assinatura manuscrita do responsável', { x: 78, y: y - 18, size: 8.5, font, color: MUTED });
  page.drawText('Data da assinatura', { x: 375, y: y - 18, size: 8.5, font, color: MUTED });
  page.drawText(`Gerado em: ${data.generatedAt}`, { x: 52, y: 58, size: 8.5, font, color: MUTED });
  page.drawText('A assinatura permanece manuscrita. O documento assinado pode ser enviado pelo sistema ou entregue presencialmente.', { x: 52, y: 42, size: 8.5, font, color: MUTED, maxWidth: 490 });

  if (form) form.updateFieldAppearances(font);
  return document.save();
}

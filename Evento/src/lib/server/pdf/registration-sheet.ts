import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export type RegistrationSheetData = {
  publicCode: string;
  participant: {
    fullName: string;
    cpf: string;
    phone: string;
    email: string;
    dateOfBirth: string;
  };
  competition: {
    title: string;
    category: string;
    eventDay: string;
    eventDate: string;
    startTime: string;
    eventAccessIncluded: boolean;
  };
  consents: Array<{
    type: string;
    granted: boolean;
    policyVersion: string;
    grantedAt: string;
  }>;
  generatedAt: string;
};

function drawField(page: ReturnType<PDFDocument['addPage']>, label: string, value: string, y: number, font: Awaited<ReturnType<PDFDocument['embedFont']>>, boldFont: Awaited<ReturnType<PDFDocument['embedFont']>>) {
  page.drawText(`${label}:`, { x: 52, y, size: 10, font: boldFont, color: rgb(0.16, 0.16, 0.2) });
  page.drawText(value, { x: 190, y, size: 10, font, color: rgb(0.16, 0.16, 0.2), maxWidth: 350 });
}

export async function createRegistrationSheetPdf(data: RegistrationSheetData) {
  const document = await PDFDocument.create();
  document.setTitle(`Ficha de inscricao - ${data.publicCode}`);
  document.setSubject('Registro de teste server-side do Family Game Festival 2026');
  document.setCreator('Family Game Festival');

  const page = document.addPage([595, 842]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const boldFont = await document.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 770, width: 595, height: 72, color: rgb(0.1, 0.07, 0.16) });
  page.drawText('FAMILY GAME FESTIVAL 2026', {
    x: 52,
    y: 808,
    size: 20,
    font: boldFont,
    color: rgb(1, 1, 1)
  });
  page.drawText('Ficha de inscricao', {
    x: 52,
    y: 786,
    size: 12,
    font,
    color: rgb(0.8, 0.9, 1)
  });

  page.drawText('CODIGO PUBLICO', { x: 400, y: 811, size: 8, font: boldFont, color: rgb(0.75, 0.8, 0.9) });
  page.drawText(data.publicCode, { x: 400, y: 792, size: 13, font: boldFont, color: rgb(1, 0.82, 0.25) });

  let y = 720;
  page.drawText('COMPETICAO', { x: 52, y, size: 12, font: boldFont, color: rgb(0.76, 0.08, 0.2) });
  y -= 28;
  drawField(page, 'Modalidade', data.competition.title, y, font, boldFont);
  y -= 20;
  drawField(page, 'Categoria', data.competition.category, y, font, boldFont);
  y -= 20;
  drawField(page, 'Data', `${data.competition.eventDay} - ${data.competition.eventDate}`, y, font, boldFont);
  y -= 20;
  drawField(page, 'Horario', data.competition.startTime, y, font, boldFont);
  y -= 20;
  drawField(page, 'Acesso ao evento', data.competition.eventAccessIncluded ? 'Incluido no ingresso competidor' : 'Nao incluido', y, font, boldFont);

  y -= 48;
  page.drawText('PARTICIPANTE', { x: 52, y, size: 12, font: boldFont, color: rgb(0.76, 0.08, 0.2) });
  y -= 28;
  drawField(page, 'Nome', data.participant.fullName, y, font, boldFont);
  y -= 20;
  drawField(page, 'CPF de teste', data.participant.cpf, y, font, boldFont);
  y -= 20;
  drawField(page, 'Telefone', data.participant.phone, y, font, boldFont);
  y -= 20;
  drawField(page, 'E-mail', data.participant.email, y, font, boldFont);
  y -= 20;
  drawField(page, 'Nascimento', data.participant.dateOfBirth, y, font, boldFont);

  y -= 48;
  page.drawText('CONSENTIMENTOS', { x: 52, y, size: 12, font: boldFont, color: rgb(0.76, 0.08, 0.2) });
  y -= 28;
  for (const consent of data.consents) {
    const status = consent.granted ? 'Concedido' : 'Nao concedido';
    drawField(page, consent.type, `${status} - ${consent.policyVersion}`, y, font, boldFont);
    y -= 20;
  }

  y -= 28;
  page.drawText(`Gerado em: ${data.generatedAt}`, { x: 52, y, size: 9, font, color: rgb(0.35, 0.35, 0.4) });
  y -= 18;
  page.drawText('Documento gerado automaticamente para validacao tecnica do fluxo de inscricao.', {
    x: 52,
    y,
    size: 9,
    font,
    color: rgb(0.35, 0.35, 0.4)
  });

  return document.save();
}

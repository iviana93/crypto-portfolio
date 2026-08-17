const BCB_CDI_SERIES = 12;
const BCB_API_BASE = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${BCB_CDI_SERIES}/dados/ultimos`;

function parseISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toISOFromBCBDate(value) {
  const [day, month, year] = String(value).split('/');
  if (!day || !month || !year) return null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function daysBetweenInclusive(start, end) {
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

export default async function handler(req, res) {
  // API route própria do Vercel: o navegador não chama o BCB diretamente.
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const startDate = parseISODate(req.query?.dataInicial);
  const endDate = parseISODate(req.query?.dataFinal);

  if (!startDate || !endDate || startDate > endDate) {
    return res.status(400).json({
      error: 'Informe dataInicial e dataFinal no formato YYYY-MM-DD.'
    });
  }

  try {
    // Evita o endpoint de consulta por intervalo do SGS, que pode responder
    // 404 em algumas situações. O endpoint "ultimos/N" é mais estável.
    // O CDI é diário, portanto dias corridos + margem é suficiente para
    // obter todas as observações do período solicitado.
    const calendarDays = daysBetweenInclusive(startDate, endDate);
    const numberOfObservations = Math.min(Math.max(calendarDays + 10, 20), 10000);

    const url = `${BCB_API_BASE}/${numberOfObservations}?formato=json`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Banco Central respondeu HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Formato inesperado retornado pelo Banco Central.');
    }

    const filtered = data
      .map((item) => {
        const iso = toISOFromBCBDate(item?.data);
        const value = Number(String(item?.valor ?? '').replace(',', '.'));
        return { data: iso, valor: value };
      })
      .filter((item) =>
        item.data &&
        Number.isFinite(item.valor) &&
        item.data >= req.query.dataInicial &&
        item.data <= req.query.dataFinal
      );

    return res.status(200).json(filtered);
  } catch (error) {
    console.error('Erro na API CDI:', error);
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Erro ao consultar o Banco Central.'
    });
  }
}

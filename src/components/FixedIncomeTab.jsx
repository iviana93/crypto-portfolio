import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from "../supabaseClient";

const BCB_CDI_SERIES = 12;
const BCB_API_BASE = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados';

const getLocalDateISO = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const formatMoney = (value) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatPct = (value) => `${Number(value || 0).toFixed(2)}%`;

const formatDate = (date) => {
  if (!date) return '—';
  const [year, month, day] = String(date).split('-');
  return `${day}/${month}/${year}`;
};

const toBrazilApiDate = (isoDate) => {
  const [year, month, day] = String(isoDate).split('-');
  return `${day}/${month}/${year}`;
};

const calculateInvestment = (investment, cdiByDate) => {
  const amount = Number(investment.amount) || 0;
  const cdiPercent = Number(investment.cdi_percent) || 0;
  const startDate = investment.start_date;
  const today = getLocalDateISO();

  if (!amount || !startDate || cdiPercent <= 0 || startDate > today) {
    return {
      ...investment,
      factor: 1,
      rendimentoPct: 0,
      rendimento: 0,
      currentValue: amount,
      businessDays: 0,
    };
  }

  const dates = Object.keys(cdiByDate)
    .filter((date) => date >= startDate && date <= today)
    .sort();

  let factor = 1;
  dates.forEach((date) => {
    const dailyCdi = Number(cdiByDate[date]);
    if (Number.isFinite(dailyCdi)) {
      // A série 12 do BCB é CDI diário em % ao dia.
      // Ex.: 115% do CDI => taxa diária do CDI × 1,15.
      factor *= 1 + (dailyCdi / 100) * (cdiPercent / 100);
    }
  });

  const currentValue = amount * factor;

  return {
    ...investment,
    factor,
    rendimentoPct: (factor - 1) * 100,
    rendimento: currentValue - amount,
    currentValue,
    businessDays: dates.length,
  };
};

export default function FixedIncomeTab({ session }) {
  const [investments, setInvestments] = useState([]);
  const [cdiByDate, setCdiByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingCdi, setLoadingCdi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [cdiUpdatedAt, setCdiUpdatedAt] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(getLocalDateISO());
  const [cdiPercent, setCdiPercent] = useState('100');

  const loadInvestments = async () => {
    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase
      .from('fixed_income')
      .select('*')
      .eq('user_id', session.user.id)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Erro ao carregar renda fixa:', error);
      setErrorMsg(`Não foi possível carregar suas aplicações: ${error.message}`);
      setInvestments([]);
    } else {
      setInvestments(data || []);
    }

    setLoading(false);
  };

  const loadCdi = async (rows) => {
    if (!rows.length) {
      setCdiByDate({});
      return;
    }

    const earliestDate = rows.reduce((earliest, item) =>
      item.start_date < earliest ? item.start_date : earliest,
      rows[0].start_date
    );

    setLoadingCdi(true);
    setErrorMsg('');

    try {
      const params = new URLSearchParams({
        formato: 'json',
        dataInicial: toBrazilApiDate(earliestDate),
        dataFinal: toBrazilApiDate(getLocalDateISO()),
      });

      const response = await fetch(`${BCB_API_BASE}?${params.toString()}`);
      if (!response.ok) throw new Error(`Banco Central respondeu HTTP ${response.status}`);

      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Formato inesperado retornado pelo Banco Central.');

      const mapped = {};
      data.forEach((item) => {
        if (!item?.data) return;
        const [day, month, year] = String(item.data).split('/');
        const iso = `${year}-${month}-${day}`;
        const value = Number(String(item.valor).replace(',', '.'));
        if (Number.isFinite(value)) mapped[iso] = value;
      });

      setCdiByDate(mapped);
      setCdiUpdatedAt(new Date());
    } catch (err) {
      console.error('Erro ao buscar CDI oficial:', err);
      setErrorMsg(`Não foi possível atualizar o CDI do Banco Central. ${err.message}`);
    } finally {
      setLoadingCdi(false);
    }
  };

  useEffect(() => {
    loadInvestments();
  }, [session.user.id]);

  useEffect(() => {
    loadCdi(investments);
  }, [investments]);

  const calculatedInvestments = useMemo(
    () => investments.map((item) => calculateInvestment(item, cdiByDate)),
    [investments, cdiByDate]
  );

  const totals = useMemo(() => {
    return calculatedInvestments.reduce(
      (acc, item) => {
        acc.invested += Number(item.amount) || 0;
        acc.current += Number(item.currentValue) || 0;
        acc.earnings += Number(item.rendimento) || 0;
        return acc;
      },
      { invested: 0, current: 0, earnings: 0 }
    );
  }, [calculatedInvestments]);

  const totalReturnPct = totals.invested > 0 ? (totals.earnings / totals.invested) * 100 : 0;

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setAmount('');
    setStartDate(getLocalDateISO());
    setCdiPercent('100');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const parsedAmount = Number(String(amount).replace(',', '.'));
    const parsedCdi = Number(String(cdiPercent).replace(',', '.'));

    if (!name.trim()) return setErrorMsg('Informe o nome da aplicação.');
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return setErrorMsg('Informe um valor aplicado válido.');
    if (!startDate) return setErrorMsg('Informe a data da aplicação.');
    if (!Number.isFinite(parsedCdi) || parsedCdi <= 0) return setErrorMsg('Informe um percentual do CDI válido.');
    if (startDate > getLocalDateISO()) return setErrorMsg('A data da aplicação não pode estar no futuro.');

    setSaving(true);
    setErrorMsg('');

    const payload = {
      name: name.trim(),
      amount: parsedAmount,
      start_date: startDate,
      cdi_percent: parsedCdi,
    };

    const query = editingId
      ? supabase.from('fixed_income').update(payload).eq('id', editingId).eq('user_id', session.user.id)
      : supabase.from('fixed_income').insert([{ ...payload, user_id: session.user.id }]);

    const { error } = await query;

    if (error) {
      console.error('Erro ao salvar aplicação:', error);
      setErrorMsg(`Não foi possível salvar: ${error.message}`);
    } else {
      resetForm();
      await loadInvestments();
    }

    setSaving(false);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setName(item.name || '');
    setAmount(String(item.amount ?? ''));
    setStartDate(item.start_date || getLocalDateISO());
    setCdiPercent(String(item.cdi_percent ?? 100));
    setErrorMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(`Excluir a aplicação "${item.name}"?`);
    if (!confirmed) return;

    const { error } = await supabase
      .from('fixed_income')
      .delete()
      .eq('id', item.id)
      .eq('user_id', session.user.id);

    if (error) {
      setErrorMsg(`Não foi possível excluir: ${error.message}`);
      return;
    }

    if (editingId === item.id) resetForm();
    await loadInvestments();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '16px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', color: 'var(--text)' }}>🏦 Renda Fixa</h2>
            <p style={{ margin: '5px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Cadastre o valor, a data e o percentual do CDI. O rendimento é calculado automaticamente.
            </p>
          </div>
          <button
            onClick={() => loadCdi(investments)}
            disabled={loadingCdi || !investments.length}
            style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-muted)', cursor: loadingCdi || !investments.length ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: '700' }}
          >
            {loadingCdi ? 'Atualizando CDI...' : '↻ Atualizar CDI'}
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700' }}>
            Aplicação
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Caixinha Nubank" style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700' }}>
            Valor aplicado
            <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000" style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700' }}>
            Data
            <input type="date" value={startDate} max={getLocalDateISO()} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700' }}>
            % do CDI
            <input type="number" min="0.01" step="0.01" value={cdiPercent} onChange={(e) => setCdiPercent(e.target.value)} placeholder="115" style={inputStyle} />
          </label>
          <button type="submit" disabled={saving} style={{ padding: '10px 13px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap' }}>
            {saving ? 'Salvando...' : editingId ? 'Salvar' : '+ Adicionar'}
          </button>
        </form>

        {editingId && (
          <button onClick={resetForm} style={{ marginTop: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px' }}>
            Cancelar edição
          </button>
        )}

        {errorMsg && <p style={{ margin: '12px 0 0', color: '#f87171', fontSize: '11px' }}>{errorMsg}</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <SummaryCard label="Total aplicado" value={formatMoney(totals.invested)} />
        <SummaryCard label="Valor atual estimado" value={formatMoney(totals.current)} />
        <SummaryCard label="Rendimento bruto" value={`${formatMoney(totals.earnings)} (${formatPct(totalReturnPct)})`} positive={totals.earnings >= 0} />
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '14px' }}>Minhas aplicações</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-faint)', fontSize: '10px' }}>
              {loadingCdi ? 'Atualizando dados oficiais do CDI...' : `CDI oficial: Banco Central — série SGS ${BCB_CDI_SERIES}`}
            </p>
          </div>
          {cdiUpdatedAt && <span style={{ color: 'var(--text-faint)', fontSize: '10px' }}>Atualizado às {cdiUpdatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>

        {loading ? (
          <p style={{ padding: '24px 16px', margin: 0, color: 'var(--text-muted)', fontSize: '12px' }}>Carregando aplicações...</p>
        ) : calculatedInvestments.length === 0 ? (
          <div style={{ padding: '30px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🏦</div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>Nenhuma aplicação cadastrada.</p>
            <p style={{ margin: '5px 0 0', color: 'var(--text-faint)', fontSize: '11px' }}>Adicione sua primeira caixinha acima.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>
                  <th style={thStyle}>Aplicação</th>
                  <th style={thStyle}>Aplicado</th>
                  <th style={thStyle}>Data</th>
                  <th style={thStyle}>CDI</th>
                  <th style={thStyle}>Dias úteis</th>
                  <th style={thStyle}>Rendimento</th>
                  <th style={thStyle}>Valor atual</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {calculatedInvestments.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', color: 'var(--text)', fontSize: '12px' }}>
                    <td style={{ padding: '11px 8px', fontWeight: '700' }}>{item.name}</td>
                    <td style={{ padding: '11px 8px' }}>{formatMoney(item.amount)}</td>
                    <td style={{ padding: '11px 8px', color: 'var(--text-muted)' }}>{formatDate(item.start_date)}</td>
                    <td style={{ padding: '11px 8px', fontWeight: '700' }}>{formatPct(item.cdi_percent)} do CDI</td>
                    <td style={{ padding: '11px 8px', color: 'var(--text-muted)' }}>{item.businessDays}</td>
                    <td style={{ padding: '11px 8px', color: item.rendimento >= 0 ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                      +{formatMoney(item.rendimento)}<span style={{ display: 'block', fontSize: '10px' }}>+{formatPct(item.rendimentoPct)}</span>
                    </td>
                    <td style={{ padding: '11px 8px', color: '#38bdf8', fontWeight: '800' }}>{formatMoney(item.currentValue)}</td>
                    <td style={{ padding: '11px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => handleEdit(item)} style={actionButtonStyle}>Editar</button>
                      <button onClick={() => handleDelete(item)} style={{ ...actionButtonStyle, color: '#f87171', marginLeft: '5px' }}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p style={{ margin: '0 2px', color: 'var(--text-faint)', fontSize: '10px', lineHeight: '1.5' }}>
        * Cálculo bruto estimado usando a série diária de CDI do Banco Central (SGS {BCB_CDI_SERIES}). Não considera IR, IOF, taxas ou regras específicas do produto. O resultado pode diferir alguns centavos do saldo exibido pela instituição.
      </p>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '9px 10px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: '12px',
  boxSizing: 'border-box',
};

const thStyle = { padding: '9px 8px', fontWeight: '600' };

const actionButtonStyle = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  color: 'var(--text-muted)',
  padding: '4px 7px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '10px',
  fontWeight: '700',
};

function SummaryCard({ label, value, positive = null }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '13px 14px', minWidth: 0 }}>
      <p style={{ margin: '0 0 5px', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', fontWeight: '600' }}>{label}</p>
      <p style={{ margin: 0, color: positive === null ? 'var(--text)' : positive ? '#10b981' : '#ef4444', fontSize: '16px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</p>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#F7931A', '#627EEA', '#14F195', '#375BD2', '#E84142', '#F3BA2F', '#8C8C8C'];

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#f8fafc', backgroundColor: '#0f172a', minHeight: '100vh' }}>Carregando dashboard...</div>;

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh', padding: '16px 16px 40px 16px', boxSizing: 'border-box' }}>
      {!session ? <AuthScreen /> : <PortfolioDashboard session={session} />}
    </div>
  );
}

// --- TELA DE LOGIN / CADASTRO ---
function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [msg, setMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setMsg('');
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMsg(error.message);
      else setMsg('Conta criada com sucesso!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', background: '#1e293b', border: '1px solid #334155', padding: '24px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
      <h2 style={{ marginTop: 0, color: '#f8fafc', fontSize: '20px' }}>{isSignUp ? 'Criar Conta' : 'Entrar no Crypto Tracker'}</h2>
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <input 
          type="email" 
          placeholder="Seu e-mail" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          required 
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '14px' }}
        />
        <input 
          type="password" 
          placeholder="Sua senha" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          required 
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '14px' }}
        />
        <button type="submit" style={{ padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
          {isSignUp ? 'Cadastrar' : 'Entrar'}
        </button>
      </form>

      {msg && <p style={{ color: '#ef4444', marginTop: '16px', fontSize: '14px' }}>{msg}</p>}

      <p style={{ marginTop: '24px', fontSize: '14px', textAlign: 'center', color: '#94a3b8' }}>
        {isSignUp ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
        <button onClick={() => setIsSignUp(!isSignUp)} style={{ color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          {isSignUp ? 'Entrar' : 'Cadastrar-se'}
        </button>
      </p>
    </div>
  );
}

// --- DASHBOARD PRINCIPAL ---
function PortfolioDashboard({ session }) {
  const [portfolio, setPortfolio] = useState([]);
  const [prices, setPrices] = useState({});
  const [fetchingPrices, setFetchingPrices] = useState(true);

  // Estado da Moeda Selecionada
  const [currency, setCurrency] = useState('BRL');

  // Busca
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState(null);

  // Inputs
  const [amount, setAmount] = useState('');
  const [totalSpent, setTotalSpent] = useState('');
  const [txType, setTxType] = useState('buy');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);

  // Calendário
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

  const loadPortfolio = async () => {
    const { data, error } = await supabase.from('portfolio').select('*');
    if (!error) setPortfolio(data || []);
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  // Autocomplete
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${searchQuery}`);
        const data = await res.json();
        setSearchResults(data.coins?.slice(0, 5) || []);
      } catch (err) {
        console.error(err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Cotações em USD e BRL
  useEffect(() => {
    if (portfolio.length === 0) {
      setPrices({});
      setFetchingPrices(false);
      return;
    }

    const fetchPrices = async () => {
      const ids = [...new Set(portfolio.map(item => item.coin_id))].join(',');
      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,brl&include_24hr_change=true`);
        const data = await res.json();
        setPrices(data);
      } catch (err) {
        console.error(err);
      } finally {
        setFetchingPrices(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, [portfolio]);

  const currencySymbol = currency === 'BRL' ? 'R$' : '$';

  // Taxa USD -> BRL
  const btcBrl = prices['bitcoin']?.brl || 0;
  const btcUsd = prices['bitcoin']?.usd || 1;
  const usdToBrlRate = btcBrl && btcUsd ? btcBrl / btcUsd : 5.0;

  const formatCurrency = (valInUSD) => {
    const value = currency === 'BRL' ? valInUSD * usdToBrlRate : valInUSD;
    const formatted = Math.abs(value).toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return value < 0 ? `-${currencySymbol} ${formatted}` : `${currencySymbol} ${formatted}`;
  };

  // Lógica de Compra / Venda
  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!selectedCoin || !amount || !totalSpent) return;

    let parsedAmount = parseFloat(amount);
    let parsedTotalSpent = parseFloat(totalSpent);

    if (txType === 'sell') {
      parsedAmount = -parsedAmount;
    }

    let totalSpentUSD = parsedTotalSpent;
    if (currency === 'BRL') {
      totalSpentUSD = parsedTotalSpent / usdToBrlRate;
    }

    const newUnitPriceUSD = Math.abs(totalSpentUSD / parsedAmount);
    const existingAsset = portfolio.find(item => item.coin_id === selectedCoin.id);

    if (existingAsset) {
      const updatedAmount = existingAsset.amount + parsedAmount;

      if (updatedAmount <= 0) {
        await supabase.from('portfolio').delete().eq('id', existingAsset.id);
      } else {
        const updatedHistory = existingAsset.history ? [...existingAsset.history] : [];
        updatedHistory.push({ date: txDate, type: txType, amount: Math.abs(parsedAmount), total: parsedTotalSpent, currency });

        const totalPreviousCost = existingAsset.amount * existingAsset.buy_price;
        const updatedAvgPrice = txType === 'buy' 
          ? (totalPreviousCost + totalSpentUSD) / updatedAmount 
          : existingAsset.buy_price;

        await supabase
          .from('portfolio')
          .update({
            amount: updatedAmount,
            buy_price: updatedAvgPrice,
            history: updatedHistory
          })
          .eq('id', existingAsset.id);
      }
      loadPortfolio();
    } else {
      if (txType === 'sell') {
        alert('Você não tem esse ativo no portfólio para vender!');
        return;
      }

      const initialHistory = [{ date: txDate, type: txType, amount: parsedAmount, total: parsedTotalSpent, currency }];

      const { error } = await supabase.from('portfolio').insert([{
        coin_id: selectedCoin.id,
        coin_name: selectedCoin.name,
        coin_symbol: selectedCoin.symbol,
        amount: parsedAmount,
        buy_price: newUnitPriceUSD,
        history: initialHistory
      }]);

      if (!error) loadPortfolio();
    }

    setAmount('');
    setTotalSpent('');
    setSelectedCoin(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleDeleteAsset = async (id) => {
    const { error } = await supabase.from('portfolio').delete().eq('id', id);
    if (!error) loadPortfolio();
  };

  // Cálculos Globais
  const totalInvestedUSD = portfolio.reduce((acc, c) => acc + (c.amount * c.buy_price), 0);
  const currentValueUSD = portfolio.reduce((acc, c) => {
    const priceUSD = prices[c.coin_id]?.usd || c.buy_price;
    return acc + (c.amount * priceUSD);
  }, 0);
  const totalPnlUSD = currentValueUSD - totalInvestedUSD;
  const totalPnlPct = totalInvestedUSD > 0 ? (totalPnlUSD / totalInvestedUSD) * 100 : 0;

  // Pie Chart
  const pieChartData = portfolio.map((c) => {
    const priceUSD = prices[c.coin_id]?.usd || c.buy_price;
    const value = currency === 'BRL' ? (c.amount * priceUSD) * usdToBrlRate : c.amount * priceUSD;
    return {
      name: c.coin_symbol.toUpperCase(),
      value: value
    };
  });

  // Time Series Chart
  const timeSeriesData = [6, 5, 4, 3, 2, 1, 0].map((daysAgo) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dateStr = `${date.getDate()}/${date.getMonth() + 1}`;

    const factor = (7 - daysAgo) / 7;
    const estimatedPnlUSD = totalPnlUSD * factor;
    const displayPnl = currency === 'BRL' ? estimatedPnlUSD * usdToBrlRate : estimatedPnlUSD;

    return {
      date: dateStr,
      pnl: parseFloat(displayPnl.toFixed(2))
    };
  });

  // Transações Calendário
  const allTransactions = [];
  portfolio.forEach((asset) => {
    if (asset.history && Array.isArray(asset.history)) {
      asset.history.forEach((tx) => {
        allTransactions.push({
          ...tx,
          coin_name: asset.coin_name,
          coin_symbol: asset.coin_symbol
        });
      });
    }
  });

  const transactionDates = [...new Set(allTransactions.map(t => t.date))];

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      
      {/* Header Corrigido para Mobile */}
      <header style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h1 style={{ margin: 0, fontSize: '22px', color: '#f8fafc', fontWeight: '800' }}>
            Crypto Portfolio 🚀
          </h1>

          <button 
            onClick={() => supabase.auth.signOut()} 
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}
          >
            Sair
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Acompanhamento em tempo real</p>

          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '2px', display: 'flex', gap: '2px' }}>
            <button 
              onClick={() => setCurrency('BRL')}
              style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: currency === 'BRL' ? '#3b82f6' : 'transparent', color: '#fff', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}
            >
              🇧🇷 BRL
            </button>
            <button 
              onClick={() => setCurrency('USD')}
              style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: currency === 'USD' ? '#3b82f6' : 'transparent', color: '#fff', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}
            >
              🇺🇸 USD
            </button>
          </div>
        </div>
      </header>

      {/* Cards de Resumo Lado a Lado no Mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '14px', borderRadius: '14px' }}>
          <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Patrimônio</span>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '18px', color: '#f8fafc', fontWeight: '800' }}>
            {formatCurrency(currentValueUSD)}
          </h2>
        </div>

        <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '14px', borderRadius: '14px' }}>
          <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lucro / Prejuízo</span>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '17px', color: totalPnlUSD >= 0 ? '#10b981' : '#ef4444', fontWeight: '800' }}>
            {formatCurrency(totalPnlUSD)}
            <span style={{ fontSize: '11px', display: 'block', fontWeight: '600', marginTop: '2px' }}>
              ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)
            </span>
          </h2>
        </div>
      </div>

      {/* Grid de Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '16px', borderRadius: '16px' }}>
          <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '12px' }}>
            Evolução do P/L ({currency})
          </span>
          <div style={{ width: '100%', height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="pnlColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={totalPnlUSD >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={totalPnlUSD >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} />
                <Tooltip 
                  formatter={(val) => `${currencySymbol} ${val}`}
                  contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="pnl" stroke={totalPnlUSD >= 0 ? '#10b981' : '#ef4444'} fillOpacity={1} fill="url(#pnlColor)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '16px', borderRadius: '16px' }}>
          <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
            Alocação ({currency})
          </span>
          {portfolio.length > 0 ? (
            <div style={{ width: '100%', height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `${currencySymbol} ${value.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', margin: '40px 0' }}>Nenhum ativo para exibir</p>
          )}
        </div>
      </div>

      {/* Form de Nova Transação */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '16px', borderRadius: '16px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#f8fafc' }}>➕ Registrar Transação</h3>
        <form onSubmit={handleAddAsset} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
          
          <select 
            value={txType} 
            onChange={e => setTxType(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: txType === 'buy' ? '#10b981' : '#ef4444', fontWeight: 'bold', fontSize: '13px' }}
          >
            <option value="buy">🟢 Compra</option>
            <option value="sell">🔴 Venda</option>
          </select>

          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Moeda (ex: Bitcoin...)"
              value={selectedCoin ? `${selectedCoin.name} (${selectedCoin.symbol.toUpperCase()})` : searchQuery}
              onChange={(e) => {
                setSelectedCoin(null);
                setSearchQuery(e.target.value);
              }}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
            />

            {searchResults.length > 0 && !selectedCoin && (
              <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', margin: '4px 0 0 0', padding: 0, listStyle: 'none', zIndex: 100, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
                {searchResults.map((coin) => (
                  <li 
                    key={coin.id} 
                    onClick={() => {
                      setSelectedCoin(coin);
                      setSearchResults([]);
                    }}
                    style={{ padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #334155', color: '#fff', fontSize: '13px' }}
                  >
                    <img src={coin.thumb} alt={coin.name} width="18" height="18" />
                    <strong>{coin.name}</strong> <span style={{ color: '#94a3b8' }}>({coin.symbol.toUpperCase()})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <input 
            type="number" 
            step="any" 
            placeholder="Quantidade" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            required 
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '13px' }}
          />

          <input 
            type="number" 
            step="any" 
            placeholder={`Total (${currency})`} 
            value={totalSpent} 
            onChange={(e) => setTotalSpent(e.target.value)} 
            required 
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '13px' }}
          />

          <input 
            type="date" 
            value={txDate} 
            onChange={(e) => setTxDate(e.target.value)} 
            required 
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '13px' }}
          />

          <button type="submit" style={{ padding: '10px', background: txType === 'buy' ? '#10b981' : '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
            Salvar Operação
          </button>
        </form>
      </div>

      {/* Calendário de Transações */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '16px', borderRadius: '16px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#f8fafc' }}>📅 Operações por Data</h3>
        <p style={{ margin: '0 0 12px 0', color: '#94a3b8', fontSize: '12px' }}>
          Clique nos dias registrados para ver o histórico:
        </p>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
          {transactionDates.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>Nenhuma transação registrada com data.</p>
          ) : (
            transactionDates.map((date) => (
              <button
                key={date}
                onClick={() => setSelectedCalendarDate(selectedCalendarDate === date ? null : date)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: selectedCalendarDate === date ? '2px solid #3b82f6' : '1px solid #10b981',
                  background: '#0f172a',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}
              >
                📆 {date.split('-').reverse().join('/')}
              </button>
            ))
          )}
        </div>

        {selectedCalendarDate && (
          <div style={{ marginTop: '12px', padding: '12px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#60a5fa' }}>
              Transações em {selectedCalendarDate.split('-').reverse().join('/')}:
            </h4>
            <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', fontSize: '12px' }}>
              {allTransactions.filter(t => t.date === selectedCalendarDate).map((tx, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>
                  <span style={{ color: tx.type === 'buy' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                    {tx.type === 'buy' ? 'COMPRA' : 'VENDA'}
                  </span>: {tx.amount} {tx.coin_symbol.toUpperCase()} por {tx.currency === 'BRL' ? 'R$' : '$'} {tx.total}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Tabela de Ativos com Rolagem */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '16px', borderRadius: '16px', overflow: 'hidden' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#f8fafc' }}>💼 Meus Ativos ({currency})</h3>
        
        {fetchingPrices && portfolio.length > 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '12px' }}>Carregando cotações...</p>
        ) : portfolio.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '16px 0', fontSize: '13px' }}>Nenhuma moeda cadastrada.</p>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px' }}>Ativo</th>
                  <th style={{ padding: '8px' }}>Qtd</th>
                  <th style={{ padding: '8px' }}>P. Médio</th>
                  <th style={{ padding: '8px' }}>P. Atual</th>
                  <th style={{ padding: '8px' }}>24h</th>
                  <th style={{ padding: '8px' }}>P/L Total</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((item) => {
                  const currentPriceUSD = prices[item.coin_id]?.usd || 0;
                  const change24h = prices[item.coin_id]?.usd_24h_change || 0;
                  const itemPnlUSD = (currentPriceUSD - item.buy_price) * item.amount;

                  const buyPriceDisplay = currency === 'BRL' ? item.buy_price * usdToBrlRate : item.buy_price;
                  const currentPriceDisplay = currency === 'BRL' ? currentPriceUSD * usdToBrlRate : currentPriceUSD;

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #334155', color: '#f8fafc', fontSize: '12px' }}>
                      <td style={{ padding: '10px 8px', fontWeight: '600' }}>
                        {item.coin_name} <span style={{ color: '#64748b', fontSize: '10px' }}>({item.coin_symbol.toUpperCase()})</span>
                      </td>
                      <td style={{ padding: '10px 8px' }}>{item.amount}</td>
                      <td style={{ padding: '10px 8px', color: '#cbd5e1' }}>
                        {currencySymbol} {buyPriceDisplay.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>
                      <td style={{ padding: '10px 8px', fontWeight: '600' }}>
                        {currencySymbol} {currentPriceDisplay.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>
                      <td style={{ padding: '10px 8px', color: change24h >= 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                        {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                      </td>
                      <td style={{ padding: '10px 8px', color: itemPnlUSD >= 0 ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                        {formatCurrency(itemPnlUSD)}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteAsset(item.id)} 
                          style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
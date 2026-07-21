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
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', justifyContent: 'center' }}>
      {!session ? <AuthScreen /> : <MainDashboard session={session} />}
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
    <div style={{ width: '100%', maxWidth: '400px', margin: '40px 16px', background: '#1e293b', border: '1px solid #334155', padding: '24px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', boxSizing: 'border-box' }}>
      <h2 style={{ marginTop: 0, color: '#f8fafc', fontSize: '20px' }}>{isSignUp ? 'Criar Conta' : 'Entrar no Crypto Tracker'}</h2>
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <input
          type="email"
          placeholder="Seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
        />
        <input
          type="password"
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
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
function MainDashboard({ session }) {
  const [activeTab, setActiveTab] = useState('portfolio');
  const [currency, setCurrency] = useState('BRL');

  return (
    <div style={{ width: '100%', maxWidth: '850px', padding: '20px 16px 40px 16px', boxSizing: 'border-box' }}>

      <header style={{ width: '100%', marginBottom: '16px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#f8fafc', fontWeight: '800' }}>
            Crypto Tracker 🚀
          </h1>

          <button
            onClick={() => supabase.auth.signOut()}
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}
          >
            Sair
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', background: '#1e293b', padding: '4px', borderRadius: '10px', border: '1px solid #334155' }}>
            <button
              onClick={() => setActiveTab('portfolio')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'portfolio' ? '#3b82f6' : 'transparent',
                color: activeTab === 'portfolio' ? '#fff' : '#94a3b8',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              💼 Meu Portfólio
            </button>
            <button
              onClick={() => setActiveTab('market')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'market' ? '#3b82f6' : 'transparent',
                color: activeTab === 'market' ? '#fff' : '#94a3b8',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🌐 Mercado
            </button>
          </div>

          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '2px', display: 'flex', gap: '2px' }}>
            <button
              onClick={() => setCurrency('BRL')}
              style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: currency === 'BRL' ? '#3b82f6' : 'transparent', color: '#fff', fontWeight: '700', cursor: 'pointer', fontSize: '11px' }}
            >
              🇧🇷 BRL
            </button>
            <button
              onClick={() => setCurrency('USD')}
              style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: currency === 'USD' ? '#3b82f6' : 'transparent', color: '#fff', fontWeight: '700', cursor: 'pointer', fontSize: '11px' }}
            >
              🇺🇸 USD
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'portfolio' ? (
        <PortfolioTab session={session} currency={currency} />
      ) : (
        <MarketTab session={session} currency={currency} />
      )}

    </div>
  );
}

// --- ABA 1: PORTFÓLIO ---
// --- ABA 1: PORTFÓLIO ---
// --- ABA 1: PORTFÓLIO ---
function PortfolioTab({ session, currency }) {
  const [portfolio, setPortfolio] = useState([]);
  const [prices, setPrices] = useState({});
  const [coinImages, setCoinImages] = useState({});
  const [fetchingPrices, setFetchingPrices] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [amount, setAmount] = useState('');
  const [totalSpent, setTotalSpent] = useState('');
  const [txType, setTxType] = useState('buy');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const loadPortfolio = async () => {
    const { data, error } = await supabase.from('portfolio').select('*');
    if (!error) {
      setPortfolio(data || []);
      if (data && data.length > 0) {
        fetchCoinImages(data.map(item => item.coin_id));
      }
    }
  };

  const fetchCoinImages = async (coinIds) => {
    try {
      const ids = coinIds.join(',');
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&per_page=250`);
      const data = await res.json();
      const imageMap = {};
      data.forEach(coin => {
        imageMap[coin.id] = coin.image;
      });
      setCoinImages(imageMap);
    } catch (err) {
      console.error('Erro ao buscar imagens:', err);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

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

  // Buscar preços em USD e BRL
  useEffect(() => {
    if (portfolio.length === 0) {
      setPrices({});
      setFetchingPrices(false);
      return;
    }

    const fetchPrices = async () => {
      const ids = [...new Set(portfolio.map(item => item.coin_id))].join(',');
      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,brl`);
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

  // Registrar Transação - USANDO buy_price (sem _usd)
  const handleAddAsset = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!selectedCoin) {
      setErrorMsg('❌ Selecione uma moeda');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setErrorMsg('❌ Digite uma quantidade válida');
      return;
    }
    if (!totalSpent || parseFloat(totalSpent) <= 0) {
      setErrorMsg('❌ Digite o total pago');
      return;
    }

    try {
      let parsedAmount = parseFloat(amount);
      let parsedTotalSpent = parseFloat(totalSpent);

      if (txType === 'sell') {
        parsedAmount = -parsedAmount;
      }

      // Calcular preço unitário na moeda escolhida
      const unitPrice = parsedTotalSpent / parsedAmount;

      // Buscar preço atual em USD para referência
      let priceUSD = 0;
      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${selectedCoin.id}&vs_currencies=usd`);
        const data = await res.json();
        priceUSD = data[selectedCoin.id]?.usd || 0;
      } catch (err) {
        console.error('Erro ao buscar preço USD:', err);
      }

      const initialHistory = [{
        date: txDate,
        type: txType,
        amount: parsedAmount,
        total: parsedTotalSpent,
        currency: currency
      }];

      // USANDO buy_price (sem _usd) - compatível com seu banco
      const { error } = await supabase.from('portfolio').insert([{
        user_id: session.user.id,
        coin_id: selectedCoin.id,
        coin_name: selectedCoin.name,
        coin_symbol: selectedCoin.symbol,
        amount: parsedAmount,
        buy_price: unitPrice, // Salva na moeda que o usuário escolheu
        currency_bought: currency,
        history: initialHistory
      }]);

      if (error) {
        console.error('Erro ao inserir:', error);
        setErrorMsg(`❌ Erro ao salvar: ${error.message}`);
        return;
      }

      // Sucesso!
      setAmount('');
      setTotalSpent('');
      setSelectedCoin(null);
      setSearchQuery('');
      setSearchResults([]);
      setErrorMsg('✅ Operação registrada com sucesso!');
      
      loadPortfolio();
      if (selectedCoin) {
        fetchCoinImages([selectedCoin.id]);
      }

    } catch (err) {
      console.error('Erro:', err);
      setErrorMsg(`❌ Erro: ${err.message}`);
    }
  };

  const handleDeleteAsset = async (id) => {
    const { error } = await supabase.from('portfolio').delete().eq('id', id);
    if (!error) loadPortfolio();
  };

  // Cálculos Globais - USANDO buy_price
  const totalInvested = portfolio.reduce((acc, c) => {
    const amount = Math.abs(c.amount);
    let buyPrice = c.buy_price || 0;
    
    // Se a moeda atual for diferente da moeda de compra, converte
    if (currency !== c.currency_bought && prices.usd?.brl) {
      if (c.currency_bought === 'BRL' && currency === 'USD') {
        buyPrice = buyPrice / prices.usd.brl;
      } else if (c.currency_bought === 'USD' && currency === 'BRL') {
        buyPrice = buyPrice * prices.usd.brl;
      }
    }
    return acc + (amount * buyPrice);
  }, 0);

  const currentValue = portfolio.reduce((acc, c) => {
    const amount = Math.abs(c.amount);
    let currentPrice = 0;
    if (currency === 'BRL') {
      currentPrice = prices[c.coin_id]?.brl || 0;
    } else {
      currentPrice = prices[c.coin_id]?.usd || 0;
    }
    return acc + (amount * currentPrice);
  }, 0);

  const totalPnl = currentValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const pieChartData = portfolio.map((c) => {
    const amount = Math.abs(c.amount);
    let value = 0;
    if (currency === 'BRL') {
      value = amount * (prices[c.coin_id]?.brl || 0);
    } else {
      value = amount * (prices[c.coin_id]?.usd || 0);
    }
    return {
      name: c.coin_symbol.toUpperCase(),
      value: value
    };
  });

  // Gráfico Temporal
  const timeSeriesData = [6, 5, 4, 3, 2, 1, 0].map((daysAgo) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    const factor = (7 - daysAgo) / 7;
    const estimatedPnl = totalPnl * factor;
    return {
      date: dateStr,
      pnl: parseFloat(estimatedPnl.toFixed(2))
    };
  });

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
    <>
      {/* Mensagem de erro/sucesso */}
      {errorMsg && (
        <div style={{ 
          marginBottom: '16px', 
          padding: '12px', 
          borderRadius: '8px',
          background: errorMsg.includes('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${errorMsg.includes('✅') ? '#10b981' : '#ef4444'}`,
          color: errorMsg.includes('✅') ? '#10b981' : '#ef4444',
          fontSize: '14px'
        }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '14px', borderRadius: '14px', boxSizing: 'border-box' }}>
          <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Patrimônio Atual</span>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '18px', color: '#f8fafc', fontWeight: '800' }}>
            {currencySymbol} {currentValue.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>

        <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '14px', borderRadius: '14px', boxSizing: 'border-box' }}>
          <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Lucro / Prejuízo Total</span>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '17px', color: totalPnl >= 0 ? '#10b981' : '#ef4444', fontWeight: '800' }}>
            {currencySymbol} {totalPnl.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span style={{ fontSize: '11px', display: 'block', fontWeight: '600', marginTop: '2px' }}>
              ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)
            </span>
          </h2>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '16px', borderRadius: '16px', boxSizing: 'border-box' }}>
          <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '12px' }}>
            Evolução do P/L ({currency})
          </span>
          <div style={{ width: '100%', height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="pnlColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={totalPnl >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={totalPnl >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} />
                <Tooltip
                  formatter={(val) => `${currencySymbol} ${val}`}
                  contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="pnl" stroke={totalPnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={1} fill="url(#pnlColor)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '16px', borderRadius: '16px', boxSizing: 'border-box' }}>
          <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
            Alocação de Ativos ({currency})
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
            <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', margin: '40px 0' }}>Nenhum ativo registrado</p>
          )}
        </div>
      </div>

      {/* Formulário de Registro */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '16px', borderRadius: '16px', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#f8fafc' }}>➕ Registrar Nova Compra / Venda</h3>
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
              placeholder="Buscar moeda..."
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
            placeholder="Qtd"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
          />

          <input
            type="number"
            step="any"
            placeholder={`Total Pago (${currency})`}
            value={totalSpent}
            onChange={(e) => setTotalSpent(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
          />

          <input
            type="date"
            value={txDate}
            onChange={(e) => setTxDate(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
          />

          <button type="submit" style={{ padding: '10px', background: txType === 'buy' ? '#10b981' : '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
            Salvar Operação
          </button>
        </form>
      </div>

      {/* Calendário */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '16px', borderRadius: '16px', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
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
                  </span>: {Math.abs(tx.amount)} {tx.coin_symbol.toUpperCase()} por {tx.currency === 'BRL' ? 'R$' : '$'} {tx.total}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* TABELA DETALHADA */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '16px', borderRadius: '16px', width: '100%', boxSizing: 'border-box' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#f8fafc' }}>💼 Minhas Compras & Histórico ({currency})</h3>

        {fetchingPrices && portfolio.length > 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '12px' }}>Carregando cotações em tempo real...</p>
        ) : portfolio.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '16px 0', fontSize: '13px' }}>Nenhuma moeda cadastrada ainda.</p>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px' }}>Ativo</th>
                  <th style={{ padding: '8px' }}>Data Compra</th>
                  <th style={{ padding: '8px' }}>Qtd</th>
                  <th style={{ padding: '8px' }}>Preço na Compra</th>
                  <th style={{ padding: '8px' }}>Preço Hoje</th>
                  <th style={{ padding: '8px' }}>Total Pago</th>
                  <th style={{ padding: '8px' }}>Valor Hoje</th>
                  <th style={{ padding: '8px' }}>Profit / Loss</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((item) => {
                  const amount = Math.abs(item.amount);

                  // Preço de compra na moeda que foi comprada
                  let buyPrice = item.buy_price || 0;
                  
                  // Se a moeda atual for diferente da moeda de compra, converte
                  if (currency !== item.currency_bought && prices.usd?.brl) {
                    if (item.currency_bought === 'BRL' && currency === 'USD') {
                      buyPrice = buyPrice / prices.usd.brl;
                    } else if (item.currency_bought === 'USD' && currency === 'BRL') {
                      buyPrice = buyPrice * prices.usd.brl;
                    }
                  }

                  // Preço atual na moeda selecionada
                  let currentPrice = 0;
                  if (currency === 'BRL') {
                    currentPrice = prices[item.coin_id]?.brl || 0;
                  } else {
                    currentPrice = prices[item.coin_id]?.usd || 0;
                  }

                  const totalPaid = buyPrice * amount;
                  const totalCurrentValue = currentPrice * amount;
                  const itemPnl = totalCurrentValue - totalPaid;
                  const itemPnlPct = buyPrice > 0 ? ((currentPrice - buyPrice) / buyPrice) * 100 : 0;

                  const purchaseDate = item.history && item.history[0]?.date
                    ? item.history[0].date.split('-').reverse().join('/')
                    : 'N/A';

                  const imageUrl = coinImages[item.coin_id] || '';

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #334155', color: '#f8fafc', fontSize: '12px' }}>
                      <td style={{ padding: '10px 8px', fontWeight: '600' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {imageUrl && (
                            <img
                              src={imageUrl}
                              alt={item.coin_name}
                              style={{ width: '20px', height: '20px', borderRadius: '50%' }}
                            />
                          )}
                          <div>
                            <span>{item.coin_name}</span>
                            <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>
                              {item.coin_symbol.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '10px 8px', color: '#94a3b8', fontSize: '11px' }}>
                        📅 {purchaseDate}
                      </td>

                      <td style={{ padding: '10px 8px', fontWeight: '500' }}>
                        {amount}
                      </td>

                      <td style={{ padding: '10px 8px', color: '#cbd5e1' }}>
                        {currencySymbol} {buyPrice.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>

                      <td style={{ padding: '10px 8px', fontWeight: '700', color: '#38bdf8' }}>
                        {currencySymbol} {currentPrice.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>

                      <td style={{ padding: '10px 8px', color: '#cbd5e1' }}>
                        {currencySymbol} {totalPaid.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td style={{ padding: '10px 8px', fontWeight: '600' }}>
                        {currencySymbol} {totalCurrentValue.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td style={{ padding: '10px 8px', fontWeight: '700', color: itemPnl >= 0 ? '#10b981' : '#ef4444' }}>
                        {currencySymbol} {itemPnl.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span style={{ fontSize: '10px', display: 'block', fontWeight: '600' }}>
                          ({itemPnlPct >= 0 ? '+' : ''}{itemPnlPct.toFixed(2)}%)
                        </span>
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
    </>
  );
}
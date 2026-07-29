import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';

const COLORS = ['#F7931A', '#627EEA', '#14F195', '#375BD2', '#E84142', '#F3BA2F', '#8C8C8C'];

const THEME_VARS = {
  dark: {
    '--bg': '#0f172a',
    '--card': '#1e293b',
    '--border': '#334155',
    '--text': '#f8fafc',
    '--text-muted': '#94a3b8',
    '--text-faint': '#64748b',
    '--text-secondary': '#cbd5e1',
  },
  light: {
    '--bg': '#eef2f7',
    '--card': '#ffffff',
    '--border': '#dbe2ea',
    '--text': '#0f172a',
    '--text-muted': '#64748b',
    '--text-faint': '#94a3b8',
    '--text-secondary': '#334155',
  },
};

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');

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

  const themeVars = THEME_VARS[theme];

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: themeVars['--text'], backgroundColor: themeVars['--bg'], minHeight: '100vh' }}>Carregando dashboard...</div>;

  return (
    <div style={{ ...themeVars, width: '100%', minHeight: '100vh', backgroundColor: 'var(--bg)', display: 'flex', justifyContent: 'center' }}>
      {!session ? <AuthScreen /> : <MainDashboard session={session} theme={theme} setTheme={setTheme} />}
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
    <div style={{ width: '100%', maxWidth: '400px', margin: '40px 16px', background: 'var(--card)', border: '1px solid var(--border)', padding: '24px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', boxSizing: 'border-box' }}>
      <h2 style={{ marginTop: 0, color: 'var(--text)', fontSize: '20px' }}>{isSignUp ? 'Criar Conta' : 'Entrar no Crypto Tracker'}</h2>
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <input
          type="email"
          placeholder="Seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '14px', boxSizing: 'border-box' }}
        />
        <input
          type="password"
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '14px', boxSizing: 'border-box' }}
        />
        <button type="submit" style={{ padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
          {isSignUp ? 'Cadastrar' : 'Entrar'}
        </button>
      </form>

      {msg && <p style={{ color: '#ef4444', marginTop: '16px', fontSize: '14px' }}>{msg}</p>}

      <p style={{ marginTop: '24px', fontSize: '14px', textAlign: 'center', color: 'var(--text-muted)' }}>
        {isSignUp ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
        <button onClick={() => setIsSignUp(!isSignUp)} style={{ color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          {isSignUp ? 'Entrar' : 'Cadastrar-se'}
        </button>
      </p>
    </div>
  );
}

// --- DASHBOARD PRINCIPAL ---
function MainDashboard({ session, theme, setTheme }) {
  const [activeTab, setActiveTab] = useState('portfolio');
  const [currency, setCurrency] = useState('BRL');
  const [hasVisitedMarket, setHasVisitedMarket] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'market') setHasVisitedMarket(true);
  };

  return (
    <div style={{ width: '100%', maxWidth: '850px', padding: '20px 16px 40px 16px', boxSizing: 'border-box' }}>

      {/* Header */}
      <header style={{ width: '100%', marginBottom: '16px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', color: 'var(--text)', fontWeight: '800' }}>
            Crypto Tracker 🚀
          </h1>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <button
              onClick={() => supabase.auth.signOut()}
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}
            >
              Sair
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          {/* Navegação por Abas */}
          <div style={{ display: 'flex', gap: '8px', background: 'var(--card)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <button
              onClick={() => handleTabChange('portfolio')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'portfolio' ? '#3b82f6' : 'transparent',
                color: activeTab === 'portfolio' ? '#fff' : 'var(--text-muted)',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              💼 Meu Portfólio
            </button>
            <button
              onClick={() => handleTabChange('market')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'market' ? '#3b82f6' : 'transparent',
                color: activeTab === 'market' ? '#fff' : 'var(--text-muted)',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🌐 Mercado
            </button>
          </div>

          {/* Seletor de Moeda */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '2px', display: 'flex', gap: '2px' }}>
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

      <div style={{ display: activeTab === 'portfolio' ? 'block' : 'none' }}>
        <PortfolioTab session={session} currency={currency} />
      </div>
      {hasVisitedMarket && (
        <div style={{ display: activeTab === 'market' ? 'block' : 'none' }}>
          <MarketTab session={session} currency={currency} />
        </div>
      )}

    </div>
  );
}

// --- MODAL: GRÁFICO HISTÓRICO INDIVIDUAL (30 DIAS) ---
function AssetChartModal({ asset, currency, buyUnitPrice, onClose }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const currencySymbol = currency === 'BRL' ? 'R$' : '$';
  const vsCurrency = currency.toLowerCase();

  useEffect(() => {
    if (!asset) return;

    const cacheKey = `chart_30d_${asset.coin_id}_${vsCurrency}`;
    const cached = localStorage.getItem(cacheKey);
    const now = Date.now();

    if (cached) {
      try {
        const { data, ts } = JSON.parse(cached);
        // Cache de 30 minutos
        if (now - ts < 30 * 60 * 1000) {
          setChartData(data);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Erro ao ler cache do gráfico:', e);
      }
    }

    const fetchChart = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${asset.coin_id}/market_chart?vs_currency=${vsCurrency}&days=30`
        );
        if (res.status === 429) {
          throw new Error('Limite de requisições da CoinGecko excedido. Tente novamente em alguns instantes.');
        }
        if (!res.ok) throw new Error('Falha ao carregar gráfico histórico.');

        const json = await res.json();
        const formatted = (json.prices || []).map(([timestamp, price]) => {
          const dateObj = new Date(timestamp);
          return {
            timestamp,
            date: `${dateObj.getDate()}/${dateObj.getMonth() + 1}`,
            fullDate: dateObj.toLocaleDateString('pt-BR'),
            price: parseFloat(price.toFixed(price < 1 ? 6 : 2)),
          };
        });

        localStorage.setItem(cacheKey, JSON.stringify({ data: formatted, ts: Date.now() }));
        setChartData(formatted);
      } catch (err) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChart();
  }, [asset, vsCurrency]);

  if (!asset) return null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '620px', boxSizing: 'border-box' }}>
        
        {/* Cabeçalho do Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--text)' }}>
              📈 Desempenho de {asset.coin_name} <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>({asset.coin_symbol.toUpperCase()})</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-faint)' }}>Cotação dos últimos 30 dias ({currency})</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>

        {/* Corpo do Modal */}
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 0', fontSize: '13px' }}>Carregando dados históricos...</p>
        ) : errorMsg ? (
          <p style={{ textAlign: 'center', color: '#ef4444', padding: '40px 0', fontSize: '13px' }}>{errorMsg}</p>
        ) : (
          <div>
            <div style={{ width: '100%', height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="assetPriceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} interval="preserveStartEnd" />
                  <YAxis stroke="var(--text-muted)" fontSize={11} domain={['auto', 'auto']} tickFormatter={(v) => `${currencySymbol}${v}`} />
                  <Tooltip
                    formatter={(val) => `${currencySymbol} ${val.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US')}`}
                    labelFormatter={(label, payload) => payload[0]?.payload?.fullDate ? `Data: ${payload[0].payload.fullDate}` : label}
                    contentStyle={{ background: 'var(--bg)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '12px' }}
                  />
                  {buyUnitPrice > 0 && (
                    <ReferenceLine
                      y={buyUnitPrice}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{ value: `Preço de Compra: ${currencySymbol} ${buyUnitPrice.toFixed(2)}`, fill: '#10b981', fontSize: 10, position: 'insideTopLeft' }}
                    />
                  )}
                  <Area type="monotone" dataKey="price" stroke="#3b82f6" fillOpacity={1} fill="url(#assetPriceGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <span>🟢 <strong>Linha Pontilhada Verde:</strong> Seu preço médio de compra ({currencySymbol} {buyUnitPrice.toFixed(2)})</span>
              <span>🔵 <strong>Linha Azul:</strong> Cotação de mercado</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- ABA 1: PORTFÓLIO ---
function PortfolioTab({ session, currency }) {
  const [portfolio, setPortfolio] = useState([]);
  const [prices, setPrices] = useState({});
  const [fetchingPrices, setFetchingPrices] = useState(true);
  const [coinIcons, setCoinIcons] = useState({});
  const [coinCategories, setCoinCategories] = useState({});

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState(null);

  const [amount, setAmount] = useState('');
  const [totalSpent, setTotalSpent] = useState('');
  const [txType, setTxType] = useState('buy');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [walletLabel, setWalletLabel] = useState('');

  const [walletFilter, setWalletFilter] = useState('todas');
  const [editingTx, setEditingTx] = useState(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [officialExchangeRate, setOfficialExchangeRate] = useState(null);

  // NOVO: Estado para abrir o gráfico individual do ativo
  const [selectedChartAsset, setSelectedChartAsset] = useState(null);

  const loadPortfolio = async () => {
    const { data, error } = await supabase
      .from("portfolio")
      .select("*")
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Erro ao carregar portfólio:", error);
      return;
    }
    setPortfolio(data || []);
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  useEffect(() => {
    const fetchOfficialRate = async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        if (data?.rates?.BRL) setOfficialExchangeRate(data.rates.BRL);
      } catch (err) {
        console.warn('Câmbio oficial indisponível:', err.message);
      }
    };

    fetchOfficialRate();
    const interval = setInterval(fetchOfficialRate, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const derivedExchangeRate = (() => {
    const impliedRates = Object.values(prices)
      .map((p) => (p?.usd && p?.brl ? p.brl / p.usd : null))
      .filter((r) => r !== null);
    if (impliedRates.length === 0) return null;
    return impliedRates.reduce((a, b) => a + b, 0) / impliedRates.length;
  })();

  const exchangeRate = derivedExchangeRate || officialExchangeRate;

  const convertCurrency = (value, fromCurrency, toCurrency) => {
    if (!value) return 0;
    if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return value;
    if (!exchangeRate) return value;

    if (fromCurrency === 'USD' && toCurrency === 'BRL') return value * exchangeRate;
    if (fromCurrency === 'BRL' && toCurrency === 'USD') return value / exchangeRate;
    return value;
  };

  const convertToDisplayCurrency = (value) => convertCurrency(value, 'USD', currency);
  const convertAnyToUSD = (value, fromCurrency) => convertCurrency(value, fromCurrency, 'USD');

  const getItemTotalPaid = (item, targetCurrency) => {
    if (!item.history || item.history.length === 0) {
      return convertCurrency(item.buy_price * item.amount, 'USD', targetCurrency);
    }

    let cost = 0;
    let qty = 0;
    const sorted = [...item.history].sort((a, b) => new Date(a.date) - new Date(b.date));

    for (const tx of sorted) {
      const txTotalInDisplay = tx.currency === targetCurrency
        ? tx.total
        : convertCurrency(tx.total, tx.currency, targetCurrency);

      if (tx.type === 'buy') {
        cost += txTotalInDisplay;
        qty += tx.amount;
      } else {
        const soldQty = Math.abs(tx.amount);
        const avgCost = qty > 0 ? cost / qty : 0;
        cost -= avgCost * soldQty;
        qty -= soldQty;
      }
    }
    return Math.max(0, cost);
  };

  const computePositionFromHistory = (historyEntries) => {
    const sorted = [...historyEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
    let amount = 0;
    let avgCostUSD = 0;
    const enrichedHistory = [];

    for (const tx of sorted) {
      const txTotalUSD = convertAnyToUSD(tx.total, tx.currency);

      if (tx.type === 'buy') {
        const oldTotalCostUSD = amount * avgCostUSD;
        const newAmount = amount + tx.amount;
        avgCostUSD = newAmount > 0 ? (oldTotalCostUSD + txTotalUSD) / newAmount : avgCostUSD;
        amount = newAmount;
        enrichedHistory.push({ ...tx, realized_pnl_usd: 0 });
      } else {
        const soldAmount = Math.abs(tx.amount);
        const saleUnitPriceUSD = soldAmount > 0 ? txTotalUSD / soldAmount : 0;
        const realizedPnlUSD = (saleUnitPriceUSD - avgCostUSD) * soldAmount;
        amount = amount + tx.amount;
        enrichedHistory.push({ ...tx, realized_pnl_usd: realizedPnlUSD });
      }
    }

    return { amount, buyPriceUSD: avgCostUSD, history: enrichedHistory };
  };

  const savePositionFromHistory = async (existingRow, coinMeta, newHistory, walletLabelValue) => {
    if (newHistory.length === 0) {
      if (existingRow) {
        const { error } = await supabase.from('portfolio').delete().eq('id', existingRow.id);
        if (error) { alert(error.message); return false; }
      }
      return true;
    }

    const { amount, buyPriceUSD, history } = computePositionFromHistory(newHistory);
    const resolvedWalletLabel = walletLabelValue?.trim() || existingRow?.wallet_label || null;

    if (existingRow) {
      const { error } = await supabase
        .from('portfolio')
        .update({ amount, buy_price: buyPriceUSD, history, wallet_label: resolvedWalletLabel })
        .eq('id', existingRow.id);
      if (error) { alert(error.message); return false; }
    } else {
      const { error } = await supabase.from('portfolio').insert([
        {
          user_id: session.user.id,
          coin_id: coinMeta.id,
          coin_name: coinMeta.name,
          coin_symbol: coinMeta.symbol,
          amount,
          buy_price: buyPriceUSD,
          history,
          wallet_label: resolvedWalletLabel,
        },
      ]);
      if (error) { alert(error.message); return false; }
    }

    return true;
  };

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

  const [snapshotHistory, setSnapshotHistory] = useState([]);

  const loadSnapshots = async () => {
    const { data, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('user_id', session.user.id)
      .order('snapshot_date', { ascending: true })
      .limit(30);
    if (error) {
      console.error('Erro ao carregar snapshots:', error);
      return;
    }
    setSnapshotHistory(data || []);
  };

  useEffect(() => {
    loadSnapshots();
  }, []);

  const saveTodaySnapshot = async (freshPrices) => {
    if (portfolio.length === 0) return;

    const totalInvestedUSD = portfolio.reduce((acc, c) => acc + c.amount * c.buy_price, 0);
    const currentValueUSD = portfolio.reduce((acc, c) => {
      const priceUSD = freshPrices[c.coin_id]?.usd || c.buy_price;
      return acc + c.amount * priceUSD;
    }, 0);

    try {
      const { error } = await supabase.from('portfolio_snapshots').upsert(
        {
          user_id: session.user.id,
          snapshot_date: new Date().toISOString().split('T')[0],
          total_value_usd: currentValueUSD,
          total_invested_usd: totalInvestedUSD,
        },
        { onConflict: 'user_id,snapshot_date' }
      );
      if (error) {
        console.error('Erro ao salvar snapshot:', error);
        return;
      }
      loadSnapshots();
    } catch (err) {
      console.error('Erro ao salvar snapshot:', err);
    }
  };

  useEffect(() => {
    if (portfolio.length === 0) {
      setPrices({});
      setCoinIcons({});
      setFetchingPrices(false);
      return;
    }

    const fetchMarketData = async () => {
      const ids = [...new Set(portfolio.map(item => item.coin_id))].join(',');
      try {
        const usdRes = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}`);
        const usdData = await usdRes.json();

        const priceMap = {};
        const iconMap = {};
        (usdData || []).forEach((coin) => {
          priceMap[coin.id] = { usd: coin.current_price };
          iconMap[coin.id] = coin.image;
        });
        setCoinIcons(iconMap);

        const brlRes = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=brl&ids=${ids}`);
        const brlData = await brlRes.json();
        (brlData || []).forEach((coin) => {
          if (priceMap[coin.id]) priceMap[coin.id].brl = coin.current_price;
        });

        setPrices(priceMap);
        saveTodaySnapshot(priceMap);
      } catch (err) {
        console.error('Erro ao buscar cotações:', err);
      } finally {
        setFetchingPrices(false);
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 90000);
    return () => clearInterval(interval);
  }, [portfolio]);

  useEffect(() => {
    if (portfolio.length === 0) {
      setCoinCategories({});
      return;
    }

    const uniqueIds = [...new Set(portfolio.map((item) => item.coin_id))];
    const CACHE_KEY = 'crypto_tracker_coin_categories_v1';
    const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

    let cancelled = false;

    const fetchCategories = async () => {
      let cache = {};
      try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { cache = {}; }

      const now = Date.now();
      const fromCache = {};
      const idsToFetch = [];

      uniqueIds.forEach((id) => {
        const entry = cache[id];
        if (entry && (now - entry.ts) < CACHE_TTL_MS) {
          fromCache[id] = entry.category;
        } else {
          idsToFetch.push(id);
        }
      });

      if (Object.keys(fromCache).length > 0 && !cancelled) {
        setCoinCategories((prev) => ({ ...prev, ...fromCache }));
      }

      for (const id of idsToFetch) {
        if (cancelled) return;
        try {
          const res = await fetch(
            `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`
          );
          const data = await res.json();
          const category = (data.categories || []).find((c) => c && c.trim().length > 0) || 'Outros';
          cache[id] = { category, ts: Date.now() };
          if (!cancelled) setCoinCategories((prev) => ({ ...prev, [id]: category }));
        } catch (err) {
          console.warn(`Erro ao buscar categoria de ${id}:`, err.message);
        }
        await new Promise((r) => setTimeout(r, 800));
      }

      try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (err) { console.warn(err.message); }
    };

    const timer = setTimeout(fetchCategories, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [portfolio.map((p) => p.coin_id).sort().join(',')]);

  const currencySymbol = currency === 'BRL' ? 'R$' : '$';
  const currKey = currency.toLowerCase();

  const handleAddAsset = async (e) => {
    e.preventDefault();

    if (!selectedCoin || !amount || !totalSpent) {
      alert("Preencha todos os campos.");
      return;
    }

    let parsedAmount = parseFloat(amount);
    const parsedTotalSpent = parseFloat(totalSpent);

    if (txType === "sell") parsedAmount *= -1;

    const existingRow = portfolio.find((p) => p.coin_id === selectedCoin.id);

    if (!existingRow && txType === "sell") {
      alert("Você ainda não possui essa moeda na carteira.");
      return;
    }
    if (existingRow && txType === "sell" && Math.abs(parsedAmount) > existingRow.amount) {
      alert(`Você só possui ${existingRow.amount} ${existingRow.coin_symbol.toUpperCase()} para vender.`);
      return;
    }

    const newTx = {
      date: txDate,
      type: txType,
      amount: parsedAmount,
      total: parsedTotalSpent,
      currency,
    };

    const combinedHistory = [...(existingRow?.history || []), newTx];
    const ok = await savePositionFromHistory(existingRow, selectedCoin, combinedHistory, walletLabel);
    if (!ok) return;

    await loadPortfolio();

    setAmount("");
    setTotalSpent("");
    setSelectedCoin(null);
    setSearchQuery("");
    setSearchResults([]);
    setWalletLabel("");
  };

  const handleDeleteAsset = async (id, coinName) => {
    const confirmed = window.confirm(`Excluir toda a posição em ${coinName}? Isso apaga o histórico de transações dessa moeda.`);
    if (!confirmed) return;

    const { error } = await supabase.from('portfolio').delete().eq('id', id);
    if (!error) loadPortfolio();
    else alert(error.message);
  };

  const handleExportCSV = () => {
    const rows = [['coin_id', 'coin_name', 'coin_symbol', 'wallet_label', 'date', 'type', 'amount', 'total', 'currency']];

    portfolio.forEach((c) => {
      (c.history || []).forEach((tx) => {
        rows.push([
          c.coin_id,
          c.coin_name,
          c.coin_symbol,
          c.wallet_label || '',
          tx.date,
          tx.type,
          tx.amount,
          tx.total,
          tx.currency,
        ]);
      });
    });

    const escapeCsvField = (field) => {
      const str = String(field ?? '');
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const csvContent = rows.map((row) => row.map(escapeCsvField).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crypto-tracker-transacoes-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCsvLine = (line) => {
    const fields = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (insideQuotes) {
        if (char === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (char === '"') { insideQuotes = false; }
        else { current += char; }
      } else {
        if (char === '"') insideQuotes = true;
        else if (char === ',') { fields.push(current); current = ''; }
        else { current += char; }
      }
    }
    fields.push(current);
    return fields;
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length < 2) {
        alert('CSV vazio ou sem transações.');
        return;
      }

      const header = parseCsvLine(lines[0]).map((h) => h.trim());
      const requiredCols = ['coin_id', 'coin_name', 'coin_symbol', 'date', 'type', 'amount', 'total', 'currency'];
      const missing = requiredCols.filter((c) => !header.includes(c));
      if (missing.length > 0) {
        alert(`CSV com colunas faltando: ${missing.join(', ')}`);
        return;
      }

      const colIndex = Object.fromEntries(header.map((h, i) => [h, i]));
      const importedByCoin = {};

      for (let i = 1; i < lines.length; i++) {
        const fields = parseCsvLine(lines[i]);
        const coinId = fields[colIndex.coin_id];
        if (!coinId) continue;

        if (!importedByCoin[coinId]) {
          importedByCoin[coinId] = {
            coin_id: coinId,
            coin_name: fields[colIndex.coin_name],
            coin_symbol: fields[colIndex.coin_symbol],
            wallet_label: colIndex.wallet_label !== undefined ? fields[colIndex.wallet_label] : '',
            txs: [],
          };
        }

        importedByCoin[coinId].txs.push({
          date: fields[colIndex.date],
          type: fields[colIndex.type],
          amount: parseFloat(fields[colIndex.amount]),
          total: parseFloat(fields[colIndex.total]),
          currency: fields[colIndex.currency],
        });
      }

      const coinGroups = Object.values(importedByCoin);
      if (coinGroups.length === 0) {
        alert('Nenhuma transação válida encontrada no CSV.');
        return;
      }

      const confirmed = window.confirm(`Importar ${coinGroups.length} moeda(s) do CSV?`);
      if (!confirmed) return;

      for (const group of coinGroups) {
        const existingRow = portfolio.find((p) => p.coin_id === group.coin_id);
        const combinedHistory = [...(existingRow?.history || []), ...group.txs];
        await savePositionFromHistory(
          existingRow,
          { id: group.coin_id, name: group.coin_name, symbol: group.coin_symbol },
          combinedHistory,
          group.wallet_label
        );
      }

      await loadPortfolio();
      alert('Importação concluída!');
    } catch (err) {
      console.error('Erro ao importar CSV:', err);
      alert('Não foi possível ler esse CSV.');
    } finally {
      e.target.value = '';
    }
  };

  const handleStartEditTx = (tx) => {
    setEditingTx({
      portfolioId: tx.portfolioId,
      historyIndex: tx.historyIndex,
      date: tx.date,
      type: tx.type,
      amount: Math.abs(tx.amount),
      total: tx.total,
      currency: tx.currency,
    });
  };

  const handleSaveEditTx = async () => {
    const row = portfolio.find((p) => p.id === editingTx.portfolioId);
    if (!row) return;

    const signedAmount = editingTx.type === 'sell' ? -Math.abs(editingTx.amount) : Math.abs(editingTx.amount);
    const updatedHistory = [...row.history];
    updatedHistory[editingTx.historyIndex] = {
      date: editingTx.date,
      type: editingTx.type,
      amount: signedAmount,
      total: parseFloat(editingTx.total),
      currency: editingTx.currency,
    };

    const ok = await savePositionFromHistory(row, { id: row.coin_id, name: row.coin_name, symbol: row.coin_symbol }, updatedHistory, row.wallet_label);
    if (!ok) return;

    setEditingTx(null);
    await loadPortfolio();
  };

  const handleDeleteTx = async (tx) => {
    const confirmed = window.confirm('Excluir essa transação? A quantidade e o preço médio serão recalculados.');
    if (!confirmed) return;

    const row = portfolio.find((p) => p.id === tx.portfolioId);
    if (!row) return;

    const updatedHistory = row.history.filter((_, idx) => idx !== tx.historyIndex);
    const ok = await savePositionFromHistory(row, { id: row.coin_id, name: row.coin_name, symbol: row.coin_symbol }, updatedHistory, row.wallet_label);
    if (!ok) return;

    await loadPortfolio();
  };

  const totalInvested = portfolio.reduce((acc, c) => acc + getItemTotalPaid(c, currency), 0);

  const currentValue = portfolio.reduce((acc, c) => {
    const price = prices[c.coin_id]?.[currKey] || convertToDisplayCurrency(c.buy_price);
    return acc + (c.amount * price);
  }, 0);
  const totalPnl = currentValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const totalRealizedPnlUSD = portfolio.reduce((acc, c) => {
    const realized = (c.history || []).reduce((s, tx) => s + (tx.realized_pnl_usd || 0), 0);
    return acc + realized;
  }, 0);
  const totalRealizedPnl = convertToDisplayCurrency(totalRealizedPnlUSD);

  const assetsWithPnlPct = portfolio.map((c) => {
    const itemTotalPaid = getItemTotalPaid(c, currency);
    const buyPriceDisplay = c.amount > 0 ? itemTotalPaid / c.amount : 0;
    const currentPrice = prices[c.coin_id]?.[currKey] || buyPriceDisplay;
    const pnlPct = buyPriceDisplay > 0 ? ((currentPrice - buyPriceDisplay) / buyPriceDisplay) * 100 : 0;
    return { ...c, pnlPct };
  }).filter((c) => c.amount > 0);

  const bestAsset = assetsWithPnlPct.length > 0
    ? assetsWithPnlPct.reduce((best, c) => (c.pnlPct > best.pnlPct ? c : best))
    : null;
  const worstAsset = assetsWithPnlPct.length > 0
    ? assetsWithPnlPct.reduce((worst, c) => (c.pnlPct < worst.pnlPct ? c : worst))
    : null;

  const categoryAllocation = (() => {
    const totals = {};
    portfolio.forEach((c) => {
      const price = prices[c.coin_id]?.[currKey] || convertToDisplayCurrency(c.buy_price);
      const value = c.amount * price;
      const category = coinCategories[c.coin_id] || 'Outros';
      totals[category] = (totals[category] || 0) + value;
    });
    const sum = Object.values(totals).reduce((a, b) => a + b, 0);
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value, pct: sum > 0 ? (value / sum) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  })();

  const walletLabels = [...new Set(portfolio.map((c) => c.wallet_label).filter(Boolean))];
  const filteredPortfolio = walletFilter === 'todas'
    ? portfolio
    : portfolio.filter((c) => c.wallet_label === walletFilter);

  const pieChartData = portfolio.map((c) => {
    const price = prices[c.coin_id]?.[currKey] || convertToDisplayCurrency(c.buy_price);
    return {
      name: c.coin_symbol.toUpperCase(),
      value: c.amount * price
    };
  });

  const timeSeriesData = snapshotHistory.map((s) => {
    const date = new Date(`${s.snapshot_date}T00:00:00`);
    const dateStr = `${date.getDate()}/${date.getMonth() + 1}`;
    const pnlUSD = s.total_value_usd - s.total_invested_usd;
    const pnlDisplay = convertToDisplayCurrency(pnlUSD);
    return { date: dateStr, pnl: parseFloat(pnlDisplay.toFixed(2)) };
  });

  const allTransactions = [];
  portfolio.forEach((asset) => {
    if (asset.history && Array.isArray(asset.history)) {
      asset.history.forEach((tx, historyIndex) => {
        allTransactions.push({
          ...tx,
          coin_name: asset.coin_name,
          coin_symbol: asset.coin_symbol,
          portfolioId: asset.id,
          historyIndex,
        });
      });
    }
  });

  const transactionDates = [...new Set(allTransactions.map(t => t.date))];
  const isLoadingSummary = fetchingPrices && portfolio.length > 0;

  return (
    <>
      {/* Resumo do Patrimônio */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '14px', borderRadius: '14px', boxSizing: 'border-box' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Patrimônio Atual</span>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '18px', color: 'var(--text)', fontWeight: '800' }}>
            {isLoadingSummary ? (
              <span style={{ fontSize: '13px', color: 'var(--text-faint)', fontWeight: '600' }}>Carregando...</span>
            ) : (
              <>{currencySymbol} {currentValue.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
            )}
          </h2>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '14px', borderRadius: '14px', boxSizing: 'border-box' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Lucro / Prejuízo Total</span>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '17px', color: totalPnl >= 0 ? '#10b981' : '#ef4444', fontWeight: '800' }}>
            {isLoadingSummary ? (
              <span style={{ fontSize: '13px', color: 'var(--text-faint)', fontWeight: '600' }}>Carregando...</span>
            ) : (
              <>
                {currencySymbol} {totalPnl.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span style={{ fontSize: '11px', display: 'block', fontWeight: '600', marginTop: '2px' }}>
                  ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)
                </span>
              </>
            )}
          </h2>
        </div>
      </div>

      {/* Gráficos Consolidados */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '16px', borderRadius: '16px', boxSizing: 'border-box' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
            Evolução do P/L ({currency})
          </span>
          {timeSeriesData.length < 2 ? (
            <p style={{ color: 'var(--text-faint)', fontSize: '12px', textAlign: 'center', margin: '50px 0' }}>
              Ainda estamos coletando o histórico diário. Volte amanhã pra ver a evolução real.
            </p>
          ) : (
          <div style={{ width: '100%', height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="pnlColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={totalPnl >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={totalPnl >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} domain={['auto', 'auto']} />
                <Tooltip
                  formatter={(val) => `${currencySymbol} ${val}`}
                  contentStyle={{ background: 'var(--bg)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="pnl" stroke={totalPnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={1} fill="url(#pnlColor)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          )}
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '16px', borderRadius: '16px', boxSizing: 'border-box' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
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
                    contentStyle={{ background: 'var(--bg)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p style={{ color: 'var(--text-faint)', fontSize: '13px', textAlign: 'center', margin: '40px 0' }}>Nenhum ativo registrado</p>
          )}
        </div>
      </div>

      {/* Realizado vs Não Realizado + Destaques */}
      {portfolio.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '16px', borderRadius: '16px', boxSizing: 'border-box' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '12px' }}>
              Realizado vs. Não Realizado ({currency})
            </span>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div>
                <span style={{ color: 'var(--text-faint)', fontSize: '11px', textTransform: 'uppercase', fontWeight: '600' }}>Realizado (vendas)</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: '800', color: totalRealizedPnl >= 0 ? '#10b981' : '#ef4444' }}>
                  {currencySymbol} {totalRealizedPnl.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <span style={{ color: 'var(--text-faint)', fontSize: '11px', textTransform: 'uppercase', fontWeight: '600' }}>Não realizado (em aberto)</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: '800', color: totalPnl >= 0 ? '#10b981' : '#ef4444' }}>
                  {currencySymbol} {totalPnl.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {(bestAsset || worstAsset) && (
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '20px' }}>
                {bestAsset && (
                  <div>
                    <span style={{ color: 'var(--text-faint)', fontSize: '11px', textTransform: 'uppercase', fontWeight: '600' }}>🏆 Melhor ativo</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text)', fontWeight: '700' }}>
                      {bestAsset.coin_symbol.toUpperCase()} <span style={{ color: '#10b981' }}>+{bestAsset.pnlPct.toFixed(2)}%</span>
                    </p>
                  </div>
                )}
                {worstAsset && (
                  <div>
                    <span style={{ color: 'var(--text-faint)', fontSize: '11px', textTransform: 'uppercase', fontWeight: '600' }}>📉 Pior ativo</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text)', fontWeight: '700' }}>
                      {worstAsset.coin_symbol.toUpperCase()} <span style={{ color: worstAsset.pnlPct >= 0 ? '#10b981' : '#ef4444' }}>{worstAsset.pnlPct >= 0 ? '+' : ''}{worstAsset.pnlPct.toFixed(2)}%</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '16px', borderRadius: '16px', boxSizing: 'border-box' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '12px' }}>
              Alocação por Categoria
            </span>
            {categoryAllocation.length === 0 ? (
              <p style={{ color: 'var(--text-faint)', fontSize: '13px', textAlign: 'center', margin: '20px 0' }}>Carregando categorias...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {categoryAllocation.map((cat, index) => (
                  <div key={cat.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text)', fontWeight: '600' }}>{cat.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{cat.pct.toFixed(1)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${cat.pct}%`, height: '100%', background: COLORS[index % COLORS.length], borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Formulário de Registro */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '16px', borderRadius: '16px', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', color: 'var(--text)' }}>➕ Registrar Nova Compra / Venda</h3>
        <form onSubmit={handleAddAsset} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>

          <select
            value={txType}
            onChange={e => setTxType(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: txType === 'buy' ? '#10b981' : '#ef4444', fontWeight: 'bold', fontSize: '13px' }}
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
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', boxSizing: 'border-box' }}
            />

            {searchResults.length > 0 && !selectedCoin && (
              <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', margin: '4px 0 0 0', padding: 0, listStyle: 'none', zIndex: 100, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
                {searchResults.map((coin) => (
                  <li
                    key={coin.id}
                    onClick={() => {
                      setSelectedCoin(coin);
                      setSearchResults([]);
                    }}
                    style={{ padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', color: 'var(--text)', fontSize: '13px' }}
                  >
                    <img src={coin.thumb} alt={coin.name} width="18" height="18" />
                    <strong>{coin.name}</strong> <span style={{ color: 'var(--text-muted)' }}>({coin.symbol.toUpperCase()})</span>
                  </li>
                ))}
              </ul>
            )}

            {selectedCoin && portfolio.some((p) => p.coin_id === selectedCoin.id) && (
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#60a5fa' }}>
                Você já possui essa moeda — essa operação será somada à posição existente.
              </p>
            )}
          </div>

          <input
            type="number"
            step="any"
            placeholder="Qtd Comprada"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', boxSizing: 'border-box' }}
          />

          <input
            type="number"
            step="any"
            placeholder={`Total Pago (${currency})`}
            value={totalSpent}
            onChange={(e) => setTotalSpent(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', boxSizing: 'border-box' }}
          />

          <input
            type="date"
            value={txDate}
            onChange={(e) => setTxDate(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', boxSizing: 'border-box' }}
          />

          <input
            type="text"
            placeholder="Carteira/Rótulo (opcional)"
            value={walletLabel}
            onChange={(e) => setWalletLabel(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', boxSizing: 'border-box' }}
          />

          <button type="submit" style={{ padding: '10px', background: txType === 'buy' ? '#10b981' : '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
            Salvar Operação
          </button>
        </form>
      </div>

      {/* Calendário */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '16px', borderRadius: '16px', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: 'var(--text)' }}>📅 Operações por Data</h3>
        <p style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
          Clique nos dias registrados para ver o histórico:
        </p>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
          {transactionDates.length === 0 ? (
            <p style={{ color: 'var(--text-faint)', fontSize: '12px', margin: 0 }}>Nenhuma transação registrada com data.</p>
          ) : (
            transactionDates.map((date) => (
              <button
                key={date}
                onClick={() => setSelectedCalendarDate(selectedCalendarDate === date ? null : date)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: selectedCalendarDate === date ? '2px solid #3b82f6' : '1px solid #10b981',
                  background: 'var(--bg)',
                  color: 'var(--text)',
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
          <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#60a5fa' }}>
              Transações em {selectedCalendarDate.split('-').reverse().join('/')}:
            </h4>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', color: 'var(--text-secondary)', fontSize: '12px' }}>
              {allTransactions.filter(t => t.date === selectedCalendarDate).map((tx, idx) => (
                <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px', paddingBottom: '6px', borderBottom: idx < allTransactions.filter(t => t.date === selectedCalendarDate).length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span>
                    <span style={{ color: tx.type === 'buy' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                      {tx.type === 'buy' ? 'COMPRA' : 'VENDA'}
                    </span>: {Math.abs(tx.amount)} {tx.coin_symbol.toUpperCase()} por {tx.currency === 'BRL' ? 'R$' : '$'} {tx.total}
                  </span>
                  <span style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => handleStartEditTx(tx)}
                      title="Editar transação"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '2px' }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteTx(tx)}
                      title="Excluir transação"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '2px' }}
                    >
                      🗑️
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      {editingTx && (
        <div
          onClick={() => setEditingTx(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '360px', boxSizing: 'border-box' }}
          >
            <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', color: 'var(--text)' }}>✏️ Editar Transação</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <select
                value={editingTx.type}
                onChange={(e) => setEditingTx({ ...editingTx, type: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: editingTx.type === 'buy' ? '#10b981' : '#ef4444', fontWeight: 'bold', fontSize: '13px' }}
              >
                <option value="buy">🟢 Compra</option>
                <option value="sell">🔴 Venda</option>
              </select>

              <input
                type="number"
                step="any"
                placeholder="Quantidade"
                value={editingTx.amount}
                onChange={(e) => setEditingTx({ ...editingTx, amount: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', boxSizing: 'border-box' }}
              />

              <input
                type="number"
                step="any"
                placeholder={`Total (${editingTx.currency})`}
                value={editingTx.total}
                onChange={(e) => setEditingTx({ ...editingTx, total: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', boxSizing: 'border-box' }}
              />

              <select
                value={editingTx.currency}
                onChange={(e) => setEditingTx({ ...editingTx, currency: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px' }}
              >
                <option value="BRL">🇧🇷 BRL</option>
                <option value="USD">🇺🇸 USD</option>
              </select>

              <input
                type="date"
                value={editingTx.date}
                onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', boxSizing: 'border-box' }}
              />

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  onClick={() => setEditingTx(null)}
                  style={{ flex: 1, padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEditTx}
                  style={{ flex: 1, padding: '10px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DO GRÁFICO INDIVIDUAL DA MOEDA */}
      {selectedChartAsset && (
        <AssetChartModal
          asset={selectedChartAsset}
          currency={currency}
          buyUnitPrice={selectedChartAsset.amount > 0 ? getItemTotalPaid(selectedChartAsset, currency) / selectedChartAsset.amount : 0}
          onClose={() => setSelectedChartAsset(null)}
        />
      )}

      {/* TABELA DETALHADA: MEUS ATIVOS */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '16px', borderRadius: '16px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text)' }}>💼 Minhas Compras & Histórico ({currency})</h3>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <label
              htmlFor="csv-import-input"
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}
            >
              📥 Importar CSV
            </label>
            <input
              id="csv-import-input"
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              style={{ display: 'none' }}
            />
            <button
              onClick={handleExportCSV}
              disabled={portfolio.length === 0}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-muted)', cursor: portfolio.length === 0 ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: '600', opacity: portfolio.length === 0 ? 0.5 : 1 }}
            >
              📤 Exportar CSV
            </button>
          </div>
        </div>

        {walletLabels.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <button
              onClick={() => setWalletFilter('todas')}
              style={{ padding: '5px 10px', borderRadius: '20px', border: '1px solid var(--border)', background: walletFilter === 'todas' ? '#3b82f6' : 'var(--bg)', color: walletFilter === 'todas' ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}
            >
              Todas as carteiras
            </button>
            {walletLabels.map((label) => (
              <button
                key={label}
                onClick={() => setWalletFilter(label)}
                style={{ padding: '5px 10px', borderRadius: '20px', border: '1px solid var(--border)', background: walletFilter === label ? '#3b82f6' : 'var(--bg)', color: walletFilter === label ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {fetchingPrices && portfolio.length > 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Carregando cotações em tempo real...</p>
        ) : portfolio.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '16px 0', fontSize: '13px' }}>Nenhuma moeda cadastrada ainda.</p>
        ) : filteredPortfolio.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '16px 0', fontSize: '13px' }}>Nenhuma moeda nessa carteira.</p>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px' }}>Ativo</th>
                  <th style={{ padding: '8px' }}>Carteira</th>
                  <th style={{ padding: '8px' }}>1ª Compra</th>
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
                {filteredPortfolio.map((item) => {
                  const currentUnitPrice = prices[item.coin_id]?.[currKey] || 0;
                  const totalPaid = getItemTotalPaid(item, currency);
                  const buyUnitPrice = item.amount > 0 ? totalPaid / item.amount : 0;
                  const totalCurrentValue = currentUnitPrice * item.amount;
                  const itemPnl = totalCurrentValue - totalPaid;
                  const itemPnlPct = totalPaid > 0 ? (itemPnl / totalPaid) * 100 : 0;

                  const purchaseDate = item.history && item.history[0]?.date
                    ? item.history[0].date.split('-').reverse().join('/')
                    : 'N/A';

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', color: 'var(--text)', fontSize: '12px' }}>
                      <td style={{ padding: '10px 8px', fontWeight: '600' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {coinIcons[item.coin_id] && (
                            <img src={coinIcons[item.coin_id]} alt={item.coin_name} width="18" height="18" style={{ borderRadius: '50%' }} />
                          )}
                          <span>
                            {item.coin_name} <span style={{ color: 'var(--text-faint)', fontSize: '10px' }}>({item.coin_symbol.toUpperCase()})</span>
                          </span>
                          <button
                            onClick={() => setSelectedChartAsset(item)}
                            title="Ver gráfico de 30 dias"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '2px', marginLeft: '2px' }}
                          >
                            📊
                          </button>
                        </div>
                      </td>

                      <td style={{ padding: '10px 8px' }}>
                        {item.wallet_label ? (
                          <span style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600' }}>
                            {item.wallet_label}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-faint)', fontSize: '11px' }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: '10px 8px', color: 'var(--text-muted)', fontSize: '11px' }}>
                        📅 {purchaseDate}
                      </td>

                      <td style={{ padding: '10px 8px', fontWeight: '500' }}>
                        {item.amount}
                      </td>

                      <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>
                        {currencySymbol} {buyUnitPrice.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>

                      <td style={{ padding: '10px 8px', fontWeight: '700', color: '#38bdf8' }}>
                        {currencySymbol} {currentUnitPrice.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>

                      <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>
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
                          onClick={() => handleDeleteAsset(item.id, item.coin_name)}
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

// --- ABA 2: MERCADO ---
function MarketTab({ session, currency }) {
  const [marketCoins, setMarketCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);

  const currencySymbol = currency === 'BRL' ? 'R$' : '$';
  const vsCurrency = currency.toLowerCase();

  const loadFavorites = async () => {
    const { data, error } = await supabase
      .from('favorites')
      .select('coin_id')
      .eq('user_id', session.user.id);
    if (!error && data) {
      setFavorites(data.map(item => item.coin_id));
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  useEffect(() => {
    const fetchMarketData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vsCurrency}&order=market_cap_desc&per_page=25&page=1&sparkline=false`
        );
        const data = await res.json();
        setMarketCoins(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
  }, [vsCurrency]);

  const toggleFavorite = async (coinId) => {
    const isFav = favorites.includes(coinId);

    if (isFav) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', session.user.id)
        .eq('coin_id', coinId);

      if (!error) {
        setFavorites(favorites.filter(id => id !== coinId));
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert([{ user_id: session.user.id, coin_id: coinId }]);

      if (!error) {
        setFavorites([...favorites, coinId]);
      }
    }
  };

  const sortedCoins = [...marketCoins].sort((a, b) => {
    const aFav = favorites.includes(a.id);
    const bFav = favorites.includes(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return a.market_cap_rank - b.market_cap_rank;
  });

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '16px', borderRadius: '16px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: '14px' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--text)' }}>🌐 Principais Criptomoedas</h3>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '12px' }}>
          Clique na estrela ⭐ para favoritar a moeda.
        </p>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Carregando mercado...</p>
      ) : (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '8px', width: '30px' }}>Fav</th>
                <th style={{ padding: '8px' }}>Moeda</th>
                <th style={{ padding: '8px' }}>Preço</th>
                <th style={{ padding: '8px' }}>24h %</th>
                <th style={{ padding: '8px' }}>Máx 24h</th>
                <th style={{ padding: '8px' }}>Mín 24h</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Cap. Mercado</th>
              </tr>
            </thead>
            <tbody>
              {sortedCoins.map((coin) => {
                const isFav = favorites.includes(coin.id);

                return (
                  <tr
                    key={coin.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: '12px',
                      background: isFav ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <button
                        onClick={() => toggleFavorite(coin.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: 0 }}
                      >
                        {isFav ? '⭐' : '☆'}
                      </button>
                    </td>

                    <td style={{ padding: '10px 8px', fontWeight: '600' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src={coin.image} alt={coin.name} width="18" height="18" />
                        <span>{coin.name}</span>
                        <span style={{ color: 'var(--text-faint)', fontSize: '10px' }}>{coin.symbol.toUpperCase()}</span>
                      </div>
                    </td>

                    <td style={{ padding: '10px 8px', fontWeight: '700' }}>
                      {currencySymbol} {coin.current_price?.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2 })}
                    </td>

                    <td style={{ padding: '10px 8px', color: coin.price_change_percentage_24h >= 0 ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                      {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h?.toFixed(2)}%
                    </td>

                    <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>
                      {currencySymbol} {coin.high_24h?.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2 })}
                    </td>

                    <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>
                      {currencySymbol} {coin.low_24h?.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2 })}
                    </td>

                    <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>
                      {currencySymbol} {coin.market_cap?.toLocaleString(currency === 'BRL' ? 'pt-BR' : 'en-US')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
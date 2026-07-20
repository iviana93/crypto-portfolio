import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
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
    <div style={{ maxWidth: '400px', margin: '80px auto', background: '#1e293b', border: '1px solid #334155', padding: '32px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
      <h2 style={{ marginTop: 0, color: '#f8fafc', fontSize: '22px' }}>{isSignUp ? 'Criar Conta' : 'Entrar no Crypto Tracker'}</h2>
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

  // Estados de Busca
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Estados dos Inputs do Formulário (Totalmente Isolados)
  const [amount, setAmount] = useState('');
  const [totalSpent, setTotalSpent] = useState('');

  const loadPortfolio = async () => {
    const { data, error } = await supabase.from('portfolio').select('*');
    if (!error) setPortfolio(data || []);
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  // Autocomplete da CoinGecko
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${searchQuery}`);
        const data = await res.json();
        setSearchResults(data.coins?.slice(0, 5) || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Busca Cotações em tempo real
  useEffect(() => {
    if (portfolio.length === 0) {
      setPrices({});
      setFetchingPrices(false);
      return;
    }

    const fetchPrices = async () => {
      const ids = [...new Set(portfolio.map(item => item.coin_id))].join(',');
      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
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

  // Adicionar Nova Compra
  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!selectedCoin || !amount || !totalSpent) return;

    const parsedAmount = parseFloat(amount);
    const parsedTotalSpent = parseFloat(totalSpent);
    
    // Calcula o preço por unidade sozinho (Total ÷ Quantidade)
    const unitPrice = parsedTotalSpent / parsedAmount;

    const { error } = await supabase.from('portfolio').insert([{
      coin_id: selectedCoin.id,
      coin_name: selectedCoin.name,
      coin_symbol: selectedCoin.symbol,
      amount: parsedAmount,
      buy_price: unitPrice
    }]);

    if (!error) {
      setAmount('');
      setTotalSpent('');
      setSelectedCoin(null);
      setSearchQuery('');
      setSearchResults([]);
      loadPortfolio();
    }
  };

  const handleDeleteAsset = async (id) => {
    const { error } = await supabase.from('portfolio').delete().eq('id', id);
    if (!error) loadPortfolio();
  };

  // Cálculos de Resumo
  const totalInvested = portfolio.reduce((acc, c) => acc + (c.amount * c.buy_price), 0);
  const currentValue = portfolio.reduce((acc, c) => {
    const price = prices[c.coin_id]?.usd || c.buy_price;
    return acc + (c.amount * price);
  }, 0);
  const totalPnl = currentValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  // Dados do Gráfico de Rosca
  const chartData = portfolio.map((c) => {
    const price = prices[c.coin_id]?.usd || c.buy_price;
    return {
      name: c.coin_symbol.toUpperCase(),
      value: c.amount * price
    };
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', color: '#f8fafc', fontWeight: '800' }}>Crypto Portfolio 🚀</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Acompanhamento em tempo real</p>
        </div>
        <button 
          onClick={() => supabase.auth.signOut()} 
          style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: '#f8fafc', cursor: 'pointer', fontWeight: '600' }}
        >
          Sair
        </button>
      </header>

      {/* Grid Superior: Cards + Gráfico */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '24px', borderRadius: '16px', flex: 1 }}>
            <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>Patrimônio Total</span>
            <h2 style={{ margin: '8px 0 0 0', fontSize: '32px', color: '#f8fafc', fontWeight: '800' }}>
              ${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>

          <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '24px', borderRadius: '16px', flex: 1 }}>
            <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>Lucro / Prejuízo (P/L)</span>
            <h2 style={{ margin: '8px 0 0 0', fontSize: '32px', color: totalPnl >= 0 ? '#10b981' : '#ef4444', fontWeight: '800' }}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span style={{ fontSize: '18px', marginLeft: '8px', fontWeight: '600' }}>
                ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)
              </span>
            </h2>
          </div>
        </div>

        {/* Pie Chart */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '20px', borderRadius: '16px', minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>Distribuição da Carteira</span>
          {portfolio.length > 0 ? (
            <div style={{ width: '100%', height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center' }}>Nenhum ativo para exibir gráfico</p>
          )}
        </div>

      </div>

      {/* Formulário de Adicionar Compra */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '24px', borderRadius: '16px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#f8fafc' }}>➕ Adicionar Transação</h3>
        <form onSubmit={handleAddAsset} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'center' }}>
          
          {/* Autocomplete */}
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Moeda (ex: Bitcoin, SOL...)"
              value={selectedCoin ? `${selectedCoin.name} (${selectedCoin.symbol.toUpperCase()})` : searchQuery}
              onChange={(e) => {
                setSelectedCoin(null);
                setSearchQuery(e.target.value);
              }}
              required
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
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
                    style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #334155', color: '#fff' }}
                  >
                    <img src={coin.thumb} alt={coin.name} width="20" height="20" />
                    <strong>{coin.name}</strong> <span style={{ color: '#94a3b8' }}>({coin.symbol.toUpperCase()})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quantidade */}
          <input 
            type="number" 
            step="any" 
            placeholder="Quantidade da moeda" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            required 
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '14px' }}
          />

          {/* Total Investido */}
          <input 
            type="number" 
            step="any" 
            placeholder="Total Investido USD (ex: 48.96)" 
            value={totalSpent} 
            onChange={(e) => setTotalSpent(e.target.value)} 
            required 
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '14px' }}
          />

          <button type="submit" style={{ padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
            Adicionar ao Portfólio
          </button>
        </form>
      </div>

      {/* Tabela de Ativos */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '24px', borderRadius: '16px', overflowX: 'auto' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#f8fafc' }}>💼 Meus Ativos</h3>
        
        {fetchingPrices && portfolio.length > 0 ? (
          <p style={{ color: '#94a3b8' }}>Atualizando cotações...</p>
        ) : portfolio.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '20px 0' }}>Sua carteira está vazia. Adicione uma moeda acima!</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '13px' }}>
                <th style={{ padding: '12px 8px' }}>Ativo</th>
                <th style={{ padding: '12px 8px' }}>Qtd</th>
                <th style={{ padding: '12px 8px' }}>Preço Médio Pago</th>
                <th style={{ padding: '12px 8px' }}>Preço Atual</th>
                <th style={{ padding: '12px 8px' }}>24h</th>
                <th style={{ padding: '12px 8px' }}>P/L Total</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((item) => {
                const currentPrice = prices[item.coin_id]?.usd || 0;
                const change24h = prices[item.coin_id]?.usd_24h_change || 0;
                const itemPnl = (currentPrice - item.buy_price) * item.amount;

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #334155', color: '#f8fafc', fontSize: '14px' }}>
                    <td style={{ padding: '16px 8px', fontWeight: '600' }}>
                      {item.coin_name} <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '400' }}>({item.coin_symbol.toUpperCase()})</span>
                    </td>
                    <td style={{ padding: '16px 8px' }}>{item.amount}</td>
                    <td style={{ padding: '16px 8px', color: '#cbd5e1' }}>${item.buy_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                    <td style={{ padding: '16px 8px', fontWeight: '600' }}>${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                    <td style={{ padding: '16px 8px', color: change24h >= 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                      {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                    </td>
                    <td style={{ padding: '16px 8px', color: itemPnl >= 0 ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                      {itemPnl >= 0 ? '+' : ''}${itemPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDeleteAsset(item.id)} 
                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
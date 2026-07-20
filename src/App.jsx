import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

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

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Carregando...</div>;

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', padding: '20px' }}>
      {!session ? <AuthScreen /> : <PortfolioDashboard session={session} />}
    </div>
  );
}

// --- TELA DE AUTENTICAÇÃO ---
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
      else setMsg('Conta criada! Faça login.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '80px auto', background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      <h2 style={{ marginTop: 0 }}>{isSignUp ? 'Criar Conta' : 'Entrar no Crypto Tracker'}</h2>
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="email"
          placeholder="Seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <input
          type="password"
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          {isSignUp ? 'Cadastrar' : 'Entrar'}
        </button>
      </form>

      {msg && <p style={{ color: '#dc2626', marginTop: '12px', fontSize: '14px' }}>{msg}</p>}

      <p style={{ marginTop: '20px', fontSize: '14px', textAlign: 'center' }}>
        {isSignUp ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
        <button onClick={() => setIsSignUp(!isSignUp)} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          {isSignUp ? 'Entrar' : 'Cadastrar-se'}
        </button>
      </p>
    </div>
  );
}

// --- PAINEL DO PORTFÓLIO ---
function PortfolioDashboard({ session }) {
  const [portfolio, setPortfolio] = useState([]);
  const [prices, setPrices] = useState({});
  const [fetchingPrices, setFetchingPrices] = useState(true);

  // Estados para Busca Dinâmica de Moedas via CoinGecko
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Form State
  const [amount, setAmount] = useState('');
  const [buyPrice, setBuyPrice] = useState('');

  // 1. Carregar portfólio do Supabase
  const loadPortfolio = async () => {
    const { data, error } = await supabase.from('portfolio').select('*');
    if (error) console.error(error);
    else setPortfolio(data || []);
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  // 2. Autocomplete da CoinGecko ao digitar
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
        console.error("Erro na busca de moedas:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 3. Atualizar Cotações das moedas salvas
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
        console.error("Erro ao carregar cotações:", err);
      } finally {
        setFetchingPrices(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // Atualiza a cada 1 minuto
    return () => clearInterval(interval);
  }, [portfolio]);

  // Adicionar Ativo
  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!selectedCoin || !amount || !buyPrice) return;

    const { error } = await supabase.from('portfolio').insert([{
      coin_id: selectedCoin.id,
      coin_name: selectedCoin.name,
      coin_symbol: selectedCoin.symbol,
      amount: parseFloat(amount),
      buy_price: parseFloat(buyPrice) / parseFloat(amount)
    }]);

    if (!error) {
      setAmount('');
      setBuyPrice('');
      setSelectedCoin(null);
      setSearchQuery('');
      setSearchResults([]);
      loadPortfolio();
    }
  };

  // Remover Ativo
  const handleDeleteAsset = async (id) => {
    const { error } = await supabase.from('portfolio').delete().eq('id', id);
    if (!error) loadPortfolio();
  };

  // Cálculos
  const totalInvested = portfolio.reduce((acc, c) => acc + (c.amount * c.buy_price), 0);
  const currentValue = portfolio.reduce((acc, c) => {
    const price = prices[c.coin_id]?.usd || c.buy_price;
    return acc + (c.amount * price);
  }, 0);
  const totalPnl = currentValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Meu Portfólio Crypto 🚀</h1>
        <button onClick={() => supabase.auth.signOut()} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>
          Sair
        </button>
      </header>

      {/* Cards de Resumo */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', flex: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <small style={{ color: '#64748b' }}>Patrimônio Atual</small>
          <h2 style={{ margin: '8px 0 0 0' }}>${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', flex: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <small style={{ color: '#64748b' }}>Lucro / Prejuízo</small>
          <h2 style={{ margin: '8px 0 0 0', color: totalPnl >= 0 ? '#10B981' : '#EF4444' }}>
            ${totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({totalPnlPct.toFixed(2)}%)
          </h2>
        </div>
      </div>

      {/* Form de Nova Compra */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Adicionar Compra</h3>
        <form onSubmit={handleAddAsset} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* Autocomplete de Moedas */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Buscar moeda (ex: Bitcoin, SOL, Pepe...)"
              value={selectedCoin ? `${selectedCoin.name} (${selectedCoin.symbol.toUpperCase()})` : searchQuery}
              onChange={(e) => {
                setSelectedCoin(null);
                setSearchQuery(e.target.value);
              }}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />

            {/* Menu Suspenso de Resultados */}
            {searchResults.length > 0 && !selectedCoin && (
              <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ccc', borderRadius: '6px', margin: 0, padding: 0, listStyle: 'none', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                {searchResults.map((coin) => (
                  <li
                    key={coin.id}
                    onClick={() => {
                      setSelectedCoin(coin);
                      setSearchResults([]);
                    }}
                    style={{ padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #eee' }}
                  >
                    <img src={coin.thumb} alt={coin.name} width="20" height="20" />
                    <strong>{coin.name}</strong> <span style={{ color: '#64748b' }}>({coin.symbol.toUpperCase()})</span>
                  </li>
                ))}
              </ul>
            )}
            {isSearching && <small style={{ position: 'absolute', right: '10px', top: '12px', color: '#64748b' }}>Procurando...</small>}
          </div>

          <input
            type="number"
            step="any"
            placeholder="Quantidade"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '120px' }}
          />

          <input
            type="number"
            step="any"
            placeholder="Preço Pago (USD)"
            value={buyPrice}
            onChange={e => setBuyPrice(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '140px' }}
          />

          <button type="submit" style={{ padding: '10px 20px', background: '#10B981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            Adicionar
          </button>
        </form>
      </div>

      {/* Tabela de Ativos */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        {fetchingPrices && portfolio.length > 0 ? (
          <p>Atualizando cotações em tempo real...</p>
        ) : portfolio.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748b' }}>Nenhum ativo cadastrado ainda.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '8px' }}>Ativo</th>
                <th style={{ padding: '8px' }}>Qtd</th>
                <th style={{ padding: '8px' }}>Preço Pago</th>
                <th style={{ padding: '8px' }}>Preço Atual</th>
                <th style={{ padding: '8px' }}>24h</th>
                <th style={{ padding: '8px' }}>P/L Total</th>
                <th style={{ padding: '8px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((item) => {
                const currentPrice = prices[item.coin_id]?.usd || 0;
                const change24h = prices[item.coin_id]?.usd_24h_change || 0;
                const itemPnl = (currentPrice - item.buy_price) * item.amount;

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 8px' }}><strong>{item.coin_name}</strong> ({item.coin_symbol.toUpperCase()})</td>
                    <td style={{ padding: '12px 8px' }}>{item.amount}</td>
                    <td style={{ padding: '12px 8px' }}>${item.buy_price.toLocaleString()}</td>
                    <td style={{ padding: '12px 8px' }}>${currentPrice.toLocaleString()}</td>
                    <td style={{ padding: '12px 8px', color: change24h >= 0 ? '#10B981' : '#EF4444' }}>
                      {change24h.toFixed(2)}%
                    </td>
                    <td style={{ padding: '12px 8px', color: itemPnl >= 0 ? '#10B981' : '#EF4444' }}>
                      ${itemPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <button onClick={() => handleDeleteAsset(item.id)} style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
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
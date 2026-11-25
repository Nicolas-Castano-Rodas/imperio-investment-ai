'use client';
import { useCallback, useEffect, useState } from 'react';
type Market = { symbol: string; price: string };
type Snapshot = { source: string; fetched_at: string; markets: Market[] };
const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';
const money = (value: string) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 }).format(Number(value));
export default function Home() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${api}/api/markets/crypto`, { cache: 'no-store', signal });
      if (!res.ok) throw new Error('No se pudo consultar Binance.');
      setData(await res.json() as Snapshot);
    } catch (e) {
      if (signal?.aborted) return;
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => controller.abort(); }, [refresh]);
  return <main>
    <header><div><span className="eyebrow">♛ EL IMPERIO</span><p>INVESTMENT INTELLIGENCE AI</p></div><span className="tag">MODO LECTURA</span></header>
    <section className="hero"><span className="eyebrow">LABORATORIO FINANCIERO / 01</span><h1>Inteligencia para<br/> tus inversiones.</h1><p>Explora los mercados sin conectar fondos ni ejecutar operaciones.</p></section>
    <section className="stats"><article><small>Conexión de cuenta</small><strong>No vinculada</strong></article><article><small>Operaciones reales</small><strong>Deshabilitadas</strong></article><article><small>Mercados disponibles</small><strong>{data ? data.markets.length : '—'}</strong></article></section>
    <section className="panel"><div className="sectionhead"><div><h2>Mercado cripto</h2><small>Binance Spot · precios en USDT</small></div><button disabled={loading} onClick={() => void refresh()}>{loading ? 'Consultando…' : 'Actualizar'}</button></div>
    {error && <p role="alert" className="error">{error}{data ? ' Se conservan los últimos datos recibidos.' : ''}</p>}
    {data ? <><table><thead><tr><th>Par</th><th>Último precio (USDT)</th></tr></thead><tbody>{data.markets.map(m => <tr key={m.symbol}><td>{m.symbol.replace('USDT', '/USDT')}</td><td>{money(m.price)}</td></tr>)}</tbody></table><small>Consulta: {new Date(data.fetched_at).toLocaleString('es-CO')}</small></> : <p>{loading ? 'Cargando cotizaciones…' : 'Sin cotizaciones disponibles.'}</p>}</section>
    <section className="panel"><h2>Acciones y portafolio</h2><p>Próximas fases: proveedor de datos bursátiles, cartera virtual, reglas de riesgo y análisis asistido.</p></section>
    <footer>Fase 1 · Sin órdenes reales · No constituye asesoría financiera</footer>
  </main>;
}

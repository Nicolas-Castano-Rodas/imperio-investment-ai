'use client';
import { useEffect, useState } from 'react';
import StockMarket from './stock-market';
import DashboardShell, {type Asset} from './dashboard-shell';

type Market = { symbol: string; price: string; change_percent: string; high: string; low: string; quote_volume: string };
type Snapshot = { source: string; fetched_at: string; markets: Market[] };
type Candle = { open_time: number; close_time: number; open: string; high: string; low: string; close: string; volume: string };
type History = { symbol: string; interval: string; fetched_at: string; candles: Candle[] };
const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';
const symbols = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT'];
const intervals = ['15m','1h','4h','1d','1w'];
const money = (v: string | number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 }).format(Number(v));
const pair = (s: string) => s.replace('USDT','/USDT');
const date = (v: string | number) => new Date(v).toLocaleString('es-CO');
async function request<T>(path: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(api + path, { cache: 'no-store', signal });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(typeof body?.detail === 'string' ? body.detail : 'No fue posible consultar el mercado.');
  }
  return await res.json() as T;
}
function CandlestickChart({ candles }: { candles: Candle[] }) {
  const [index,setIndex] = useState<number|null>(null);
  if (!candles.length) return <p>Sin histórico disponible.</p>;
  const active = Math.min(index ?? candles.length-1,candles.length-1);
  const focused = candles[active];
  const low = Math.min(...candles.map(c => Number(c.low)));
  const high = Math.max(...candles.map(c => Number(c.high)));
  const range = high - low || Math.max(high * .001, 1e-12);
  const bottom = 245, top = 18, left = 12, width = 590;
  const y = (p: number) => bottom - (p - low) / range * (bottom - top);
  const step = width / candles.length;
  return <figure className="chart"><div className="chart-inspector"><label>Explorar vela <input type="range" min={0} max={candles.length-1} value={active} onChange={e=>setIndex(Number(e.target.value))}/></label><small>{date(focused.open_time)} · O {money(focused.open)} · H {money(focused.high)} · L {money(focused.low)} · C {money(focused.close)} · Vol {money(focused.volume)}</small></div><svg viewBox="0 0 710 280" role="img" aria-label="Gráfico de velas japonesas OHLC en USDT">
    {Array.from({length:5},(_,i) => {const p = low + range*i/4; return <g key={i}><line x1={left} x2={left+width} y1={y(p)} y2={y(p)} stroke="#30333b" strokeDasharray="4 4"/><text x={left+width+8} y={y(p)+4} fill="#a3a5af" fontSize="10">{money(p)}</text></g>;})}
    <line x1={left+step*(active+.5)} x2={left+step*(active+.5)} y1={top} y2={bottom} stroke="#d4af37" strokeDasharray="3 4"/>
    {candles.map((c,i) => {
      const x = left + step*(i+.5), o = y(Number(c.open)), close = y(Number(c.close));
      const color = Number(c.close) >= Number(c.open) ? '#4ade80' : '#f87171';
      return <g key={c.open_time} onPointerEnter={()=>setIndex(i)}><title>{date(c.open_time)} | O {c.open} H {c.high} L {c.low} C {c.close}</title><line x1={x} x2={x} y1={y(Number(c.high))} y2={y(Number(c.low))} stroke={color}/><rect x={x-step*.3} y={Math.min(o,close)} width={step*.6} height={Math.max(1,Math.abs(o-close))} fill={color}/></g>;
    })}
  </svg><figcaption><span>{date(candles[0].open_time)}</span><span>{date(candles[candles.length-1].open_time)}</span></figcaption></figure>;
}
export default function Home() {
  const [data,setData] = useState<Snapshot|null>(null);
  const [history,setHistory] = useState<History|null>(null);
  const [error,setError] = useState('');
  const [historyError,setHistoryError] = useState('');
  const [symbol,setSymbol] = useState('BTCUSDT');
  const [interval,setInterval] = useState('1h');
  const [refresh,setRefresh] = useState(0);
  const [auto,setAuto] = useState(true);
  const [stockSymbol,setStockSymbol] = useState('AAPL');
  function selectAsset(asset:Asset){if(asset.kind==='crypto'){setSymbol(asset.symbol);setHistoryError('');}else setStockSymbol(asset.symbol);}
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      let success = false;
      try {
        const result = await request<Snapshot>('/api/markets/crypto/24h',controller.signal);
        if (active) {setData(result);setError('');success=true;}
      } catch(e) {if(active) setError(e instanceof Error ? e.message : 'Error de conexión');}
      finally {if(active && auto && success) timer = setTimeout(load,60000);}
    }
    void load();
    return () => {active=false;controller.abort();clearTimeout(timer);};
  },[refresh,auto]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      let success = false;
      try {
        const result = await request<History>('/api/markets/crypto/'+symbol+'/candles?interval='+interval+'&limit=60',controller.signal);
        if(active) {setHistory(result);setHistoryError('');success=true;}
      } catch(e) {if(active) setHistoryError(e instanceof Error ? e.message : 'Error de conexión');}
      finally {if(active && auto && success) timer = setTimeout(load,60000);}
    }
    void load();
    return () => {active=false;controller.abort();clearTimeout(timer);};
  },[symbol,interval,refresh,auto]);
  const current = history?.symbol===symbol && history.interval===interval ? history : null;
  const latest = current?.candles[current.candles.length-1];
  return <DashboardShell onSelect={selectAsset}>
    <section className="hero"><span className="eyebrow">CENTRO DE CONTROL / 04</span><h1>Resumen de mercados</h1><p>Consulta datos financieros, explora activos y controla tu lista de seguimiento sin conectar fondos.</p></section>
    <section className="stats overview-stats"><article><small>Criptomonedas disponibles</small><strong>{data?.markets.length ?? '—'}</strong><small>{error?'Consulta con error':data?'Binance Spot':'Sin datos todavía'}</small></article><article><small>BTC / USDT</small><strong>{data?.markets.find(m=>m.symbol==='BTCUSDT')?money(data.markets.find(m=>m.symbol==='BTCUSDT')!.price):'—'}</strong><small>{error?'Últimos datos conservados':data?'Último precio consultado':'Sin cotización'}</small></article><article><small>Acciones en catálogo</small><strong>8</strong><small>Datos diarios · USD</small></article><article><small>Operaciones reales</small><strong>Deshabilitadas</strong><small>Cuenta no vinculada</small></article></section>
    <section className="panel" id="crypto"><div className="sectionhead"><div><h2>Mercado cripto</h2><small>Binance Spot · estadísticas móviles de 24 horas</small></div><button onClick={()=>setRefresh(n=>n+1)}>Actualizar</button></div>
    <label className="auto"><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/> Actualizar cada 60 segundos (se pausa si hay un error)</label>
    {error && <p role="alert" className="error">{error}{data?' Se muestran los últimos datos recibidos.':''}</p>}
    {data ? <><div className="table-scroll"><table><thead><tr><th>Par</th><th>Precio USDT</th><th>24h %</th><th>Máximo</th><th>Mínimo</th><th>Volumen USDT</th></tr></thead><tbody>{data.markets.map(m=><tr key={m.symbol}><td><button className="market-link" onClick={()=>{setSymbol(m.symbol);setHistoryError('');}}>{pair(m.symbol)}</button></td><td>{money(m.price)}</td><td className={Number(m.change_percent)>=0?'positive':'negative'}>{Number(m.change_percent).toFixed(2)}%</td><td>{money(m.high)}</td><td>{money(m.low)}</td><td>{money(m.quote_volume)}</td></tr>)}</tbody></table></div><small>Consulta: {date(data.fetched_at)}</small></> : <p>Sin cotizaciones disponibles.</p>}</section>
    <section className="panel" id="history"><div className="sectionhead"><div><h2>Histórico de mercado</h2><small>{pair(symbol)} · últimas 60 velas solicitadas</small></div><label>Par <select value={symbol} onChange={e=>{setSymbol(e.target.value);setHistoryError('');}}>{symbols.map(s=><option key={s} value={s}>{pair(s)}</option>)}</select></label></div>
    <div className="intervals">{intervals.map(i=><button key={i} aria-pressed={interval===i} onClick={()=>{setInterval(i);setHistoryError('');}}>{i}</button>)}</div>
    {historyError && <p role="alert" className="error">{historyError}{current?' Se muestra el último histórico recibido.':''}</p>}
    {current ? <><CandlestickChart key={symbol+interval} candles={current.candles}/>{latest && <p className="ohlc">Última vela: O {money(latest.open)} · H {money(latest.high)} · L {money(latest.low)} · C {money(latest.close)} · Volumen base {money(latest.volume)}.</p>}<small>Consulta: {date(current.fetched_at)} · La última vela puede estar abierta.</small></> : <p>Sin histórico disponible para esta selección.</p>}</section>
    <StockMarket selected={stockSymbol} onSelect={setStockSymbol}/>
  </DashboardShell>;
}

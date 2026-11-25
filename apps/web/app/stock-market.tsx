'use client';
import { useEffect, useState } from 'react';

type Stock = {symbol:string;name:string;currency:string};
type Catalog = {configured:boolean;stocks:Stock[]};
type Candle = {date:string;open:string;high:string;low:string;close:string;volume:string};
type Daily = {symbol:string;name:string;currency:string;session_date:string;fetched_at:string;change_percent:string;cached:boolean;candles:Candle[]};
const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';
const usd = (v:string|number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v));
async function request<T>(path:string,signal:AbortSignal):Promise<T>{
  const res=await fetch(api+path,{cache:'no-store',signal});
  if(!res.ok){const body=await res.json().catch(()=>null);throw new Error(typeof body?.detail==='string'?body.detail:'No se pudo consultar el mercado bursátil.');}
  return await res.json() as T;
}
function DailyChart({candles}:{candles:Candle[]}){
  const values=candles.map(c=>Number(c.close));
  const min=Math.min(...values),max=Math.max(...values),range=max-min||Math.max(max*.001,1e-12);
  const y=(p:number)=>220-(p-min)/range*200;
  const points=values.map((p,i)=>`${12+i*570/Math.max(values.length-1,1)},${y(p)}`).join(' ');
  return <figure className="chart"><svg viewBox="0 0 700 240" role="img" aria-label="Histórico de cierres diarios en dólares estadounidenses">
    {Array.from({length:5},(_,i)=>{const p=min+range*i/4;return <g key={i}><line x1="12" x2="582" y1={y(p)} y2={y(p)} stroke="#30333b" strokeDasharray="4 4"/><text x="590" y={y(p)+4} fill="#a3a5af" fontSize="11">{usd(p)}</text></g>;})}
    <polyline points={points} fill="none" stroke="#d4af37" strokeWidth="2" strokeLinejoin="round"/>
    {candles.map((c,i)=><circle key={c.date} cx={12+i*570/Math.max(values.length-1,1)} cy={y(Number(c.close))} r="2" fill="#d4af37"><title>{c.date}: {usd(c.close)}</title></circle>)}
  </svg><figcaption><span>{candles[0].date}</span><span>{candles[candles.length-1].date}</span></figcaption></figure>;
}
export default function StockMarket({selected,onSelect}:{selected:string;onSelect:(symbol:string)=>void}){
  const [catalog,setCatalog]=useState<Catalog|null>(null);
  const [catalogError,setCatalogError]=useState('');
  const [query,setQuery]=useState<{symbol:string;id:number}|null>(null);
  const [data,setData]=useState<Daily|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    void request<Catalog>('/api/markets/stocks',controller.signal).then(r=>{if(!controller.signal.aborted)setCatalog(r);}).catch(e=>{if(!controller.signal.aborted)setCatalogError(e instanceof Error?e.message:'Error de conexión');});
    return ()=>controller.abort();
  },[]);
  useEffect(()=>{
    if(!query)return;
    const controller=new AbortController();
    void request<Daily>('/api/markets/stocks/'+query.symbol+'/daily',controller.signal)
      .then(r=>{if(!controller.signal.aborted){setData(r);setError('');}})
      .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Error de conexión');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[query]);
  const current=data?.symbol===selected?data:null;
  const latest=current?.candles[current.candles.length-1];
  return <section className="panel" id="stocks">
    <div className="sectionhead"><div><h2>Mercado bursátil · Estados Unidos</h2><small>Alpha Vantage · datos diarios históricos, no tiempo real · USD</small></div><span className="tag">SOLO LECTURA</span></div>
    {catalogError&&<p role="alert" className="error">{catalogError}</p>}
    {catalog&&!catalog.configured&&<p>Activa el proveedor configurando ALPHA_VANTAGE_API_KEY en el backend. No se muestran precios ficticios.</p>}
    <div className="stock-controls"><label>Empresa <select value={selected} disabled={!catalog} onChange={e=>{onSelect(e.target.value);setQuery(null);setLoading(false);setError('');}}>{(catalog?.stocks??[{symbol:'AAPL',name:'Apple',currency:'USD'}]).map(s=><option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>)}</select></label><button disabled={!catalog?.configured||(loading&&query?.symbol===selected)} onClick={()=>{setError('');setLoading(true);setQuery(q=>({symbol:selected,id:(q?.id??0)+1}));}}>{loading&&query?.symbol===selected?'Consultando…':'Consultar histórico'}</button></div>
    <small>Consulta manual para conservar la cuota del proveedor. El backend reutiliza datos durante cuatro horas.</small>
    {error&&query?.symbol===selected&&<p role="alert" className="error">{error}{current?' Se muestran los últimos datos recibidos.':''}</p>}
    {current&&latest?<><div className="stats"><article><small>Último cierre disponible</small><strong>{usd(latest.close)}</strong></article><article><small>Variación entre sesiones</small><strong className={Number(current.change_percent)>=0?'positive':'negative'}>{Number(current.change_percent).toFixed(2)}%</strong></article><article><small>Sesión registrada</small><strong>{current.session_date}</strong></article></div><DailyChart candles={current.candles}/><p className="ohlc">Apertura {usd(latest.open)} · Máximo {usd(latest.high)} · Mínimo {usd(latest.low)} · Volumen {Number(latest.volume).toLocaleString('es-CO')} acciones.</p><small>Consulta original: {new Date(current.fetched_at).toLocaleString('es-CO')}{current.cached?' · Caché':''}. Serie sin ajustes por dividendos o splits.</small></>:<p>{loading&&query?.symbol===selected?'Cargando histórico…':'Selecciona una empresa y consulta su histórico.'}</p>}
  </section>;
}

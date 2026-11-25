'use client';

import {useState,useSyncExternalStore} from 'react';
import type {ReactNode} from 'react';

export const assets = [
  {symbol:'BTCUSDT',name:'Bitcoin',kind:'crypto'},{symbol:'ETHUSDT',name:'Ethereum',kind:'crypto'},
  {symbol:'BNBUSDT',name:'BNB',kind:'crypto'},{symbol:'SOLUSDT',name:'Solana',kind:'crypto'},
  {symbol:'XRPUSDT',name:'XRP',kind:'crypto'},{symbol:'AAPL',name:'Apple',kind:'stock'},
  {symbol:'MSFT',name:'Microsoft',kind:'stock'},{symbol:'NVDA',name:'NVIDIA',kind:'stock'},
  {symbol:'TSLA',name:'Tesla',kind:'stock'},{symbol:'AMZN',name:'Amazon',kind:'stock'},
  {symbol:'GOOGL',name:'Alphabet',kind:'stock'},{symbol:'META',name:'Meta',kind:'stock'},
  {symbol:'JPM',name:'JPMorgan Chase',kind:'stock'}
] as const;
export type Asset = typeof assets[number];
const key='imperio.watchlist.v1';
const event='imperio:watchlist';
function subscribe(fn:()=>void){
  window.addEventListener('storage',fn);
  window.addEventListener(event,fn);
  return ()=>{window.removeEventListener('storage',fn);window.removeEventListener(event,fn);};
}
function snapshot(){try{return localStorage.getItem(key)??'[]';}catch{return '[]';}}
function serverSnapshot(){return '[]';}
function parse(raw:string):string[]{
  try{const value:unknown=JSON.parse(raw);return Array.isArray(value)?assets.filter(a=>value.includes(a.symbol)).map(a=>a.symbol):[];}catch{return [];}
}

export default function DashboardShell({children,onSelect}:{children:ReactNode;onSelect:(asset:Asset)=>void}){
  const [search,setSearch]=useState('');
  const [notice,setNotice]=useState('');
  const [menu,setMenu]=useState(false);
  const saved=parse(useSyncExternalStore(subscribe,snapshot,serverSnapshot));
  const needle=search.trim().toLowerCase().replaceAll('/','');
  const results=needle?assets.filter(a=>a.symbol.toLowerCase().includes(needle)||a.name.toLowerCase().includes(needle)):[];
  function toggle(symbol:string){
    const current=parse(snapshot());
    const next=current.includes(symbol)?current.filter(s=>s!==symbol):[...current,symbol];
    try{localStorage.setItem(key,JSON.stringify(next));window.dispatchEvent(new Event(event));setNotice('Lista actualizada.');}
    catch{setNotice('El navegador no permite guardar la lista de seguimiento.');}
  }
  function choose(asset:Asset){
    onSelect(asset);setSearch('');setMenu(false);
    document.getElementById(asset.kind==='crypto'?'history':'stocks')?.scrollIntoView({block:'start'});
  }
  return <div className="terminal-shell">
    <a className="skip-link" href="#dashboard">Saltar al contenido</a>
    <aside className="terminal-side">
      <a className="terminal-brand" href="#dashboard"><span aria-hidden="true">♛</span><div><strong>EL IMPERIO</strong><small>LOS REYES DEL SOFTWARE</small></div></a>
      <button className="mobile-menu" aria-expanded={menu} aria-controls="terminal-nav" onClick={()=>setMenu(v=>!v)}>{menu?'Cerrar menú':'Menú'}</button>
      <nav id="terminal-nav" className={menu?'terminal-nav expanded':'terminal-nav'} aria-label="Navegación principal">
        <small>TERMINAL FINANCIERA</small>
        {[
          ['01','Resumen','dashboard'],['02','Criptomonedas','crypto'],['03','Histórico cripto','history'],
          ['04','Acciones','stocks'],['05','Seguimiento','watchlist'],['06','Portafolio','portfolio']
        ].map(([n,label,id])=><a key={id} href={'#'+id} onClick={()=>setMenu(false)}><span aria-hidden="true">{n}</span>{label}</a>)}
        <small>EN DESARROLLO</small><p className="roadmap-label">IA · Alertas · Riesgos</p>
      </nav>
      <div className="side-status"><span className="status-dot"/> Solo lectura<br/><small>Sin acceso a fondos</small></div>
    </aside>
    <main id="dashboard" className="terminal-main">
      <div className="terminal-top"><div><span className="eyebrow">INVESTMENT INTELLIGENCE AI</span><p>Terminal de inteligencia financiera</p></div><span className="tag">MODO LECTURA</span></div>
      <section className="panel search-panel" aria-label="Buscador global">
        <label htmlFor="asset-search">Buscar activos</label>
        <input id="asset-search" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="BTC, Apple, NVIDIA…" autoComplete="off"/>
        {needle&&<div className="search-results" aria-label="Resultados de búsqueda">{results.length?results.map(a=><div className="asset-row" key={a.symbol}><button className="asset-select" onClick={()=>choose(a)}><strong>{a.symbol}</strong> <span>{a.name} · {a.kind==='crypto'?'Cripto':'Acción'}</span></button><button className="favorite" aria-pressed={saved.includes(a.symbol)} aria-label={(saved.includes(a.symbol)?'Quitar ':'Seguir ')+a.name} onClick={()=>toggle(a.symbol)}>{saved.includes(a.symbol)?'★':'☆'}</button></div>):<p>Sin coincidencias en el catálogo.</p>}</div>}
      </section>
      {children}
      <section className="panel" id="watchlist"><div className="sectionhead"><div><h2>Lista de seguimiento</h2><small>Guardada solo en este navegador. No es una cartera de inversión.</small></div><span className="tag">{saved.length} activos</span></div>
        {assets.filter(a=>saved.includes(a.symbol)).map(a=><div className="asset-row" key={a.symbol}><button className="asset-select" onClick={()=>choose(a)}><strong>{a.symbol}</strong> <span>{a.name}</span></button><button className="favorite" aria-label={'Quitar '+a.name} onClick={()=>toggle(a.symbol)}>★</button></div>)}
        {!saved.length&&<p>Busca un activo y pulsa la estrella para guardarlo.</p>}
        <small role="status">{notice}</small>
      </section>
      <section className="panel" id="portfolio"><h2>Portafolio</h2><p>Sin cartera vinculada. El simulador, las posiciones y las métricas de rendimiento se incorporarán en fases posteriores.</p></section>
      <footer>Fase 4 · Desarrollado por EL IMPERIO — Los Reyes del Software · Sin órdenes reales · No constituye asesoría financiera</footer>
    </main>
  </div>;
}

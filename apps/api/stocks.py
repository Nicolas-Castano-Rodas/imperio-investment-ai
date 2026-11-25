"""Read-only US equity daily data. Never expose provider credentials."""
import asyncio
import os
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from time import monotonic

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/markets/stocks", tags=["stocks"])
COMPANIES = {"AAPL": "Apple", "MSFT": "Microsoft", "NVDA": "NVIDIA", "TSLA": "Tesla",
             "AMZN": "Amazon", "GOOGL": "Alphabet", "META": "Meta", "JPM": "JPMorgan Chase"}
TTL = 4 * 60 * 60
_cache = {}
_lock = asyncio.Lock()
_pause_until = 0.0

def number(value, *, volume=False):
    if not isinstance(value, str):
        raise ValueError("Expected numeric string")
    n = Decimal(value)
    if not n.is_finite() or n >= Decimal("1e100") or (n < 0 if volume else n <= 0):
        raise ValueError("Invalid number")
    if volume and n != n.to_integral_value():
        raise ValueError("Invalid volume")
    return value

def parse_daily(payload, symbol):
    if not isinstance(payload, dict):
        raise ValueError("Invalid payload")
    meta = payload["Meta Data"]
    if meta["2. Symbol"] != symbol:
        raise ValueError("Unexpected symbol")
    series = payload["Time Series (Daily)"]
    if not isinstance(series, dict) or not 2 <= len(series) <= 100:
        raise ValueError("Invalid series")
    candles = []
    for day, row in sorted(series.items()):
        if date.fromisoformat(day).isoformat() != day:
            raise ValueError("Invalid session date")
        o, h, l, c = [number(row[k]) for k in ("1. open", "2. high", "3. low", "4. close")]
        if not Decimal(l) <= min(Decimal(o), Decimal(c)) <= max(Decimal(o), Decimal(c)) <= Decimal(h):
            raise ValueError("Invalid OHLC")
        candles.append({"date": day, "open": o, "high": h, "low": l, "close": c,
                        "volume": number(row["5. volume"], volume=True)})
    latest, previous = candles[-1], candles[-2]
    change = (Decimal(latest["close"]) / Decimal(previous["close"]) - 1) * 100
    return {"symbol": symbol, "name": COMPANIES[symbol], "currency": "USD",
            "source": "Alpha Vantage", "frequency": "daily", "adjusted": False,
            "session_date": latest["date"], "fetched_at": datetime.now(timezone.utc).isoformat(),
            "change_percent": format(change, ".4f"), "candles": candles}

@router.get("")
def stock_catalog():
    return {"source": "Alpha Vantage", "configured": bool(os.getenv("ALPHA_VANTAGE_API_KEY", "").strip()),
            "stocks": [{"symbol": s, "name": n, "currency": "USD"} for s, n in COMPANIES.items()]}

@router.get("/{symbol}/daily")
async def stock_daily(symbol: str):
    global _pause_until
    if symbol not in COMPANIES:
        raise HTTPException(422, "Acción no admitida")
    key = os.getenv("ALPHA_VANTAGE_API_KEY", "").strip()
    if not key:
        raise HTTPException(503, "Configura ALPHA_VANTAGE_API_KEY en el backend")
    async with _lock:
        cached = _cache.get(symbol)
        if cached and monotonic() - cached[0] < TTL:
            return {**cached[1], "cached": True}
        if monotonic() < _pause_until:
            raise HTTPException(503, "Proveedor temporalmente limitado; consulta más tarde")
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.get("https://www.alphavantage.co/query", params={
                    "function": "TIME_SERIES_DAILY", "symbol": symbol,
                    "outputsize": "compact", "apikey": key})
                if response.status_code == 429:
                    _pause_until = monotonic() + 3600
                    raise HTTPException(503, "Límite de consultas del proveedor")
                response.raise_for_status()
                payload = response.json()
            if isinstance(payload, dict) and ("Note" in payload or "Information" in payload):
                _pause_until = monotonic() + 3600
                raise HTTPException(503, "Proveedor limitado o clave sin acceso a estos datos")
            result = parse_daily(payload, symbol)
        except (httpx.HTTPError, ValueError, KeyError, TypeError, InvalidOperation, ArithmeticError):
            raise HTTPException(502, "No fue posible obtener datos bursátiles válidos") from None
        _cache[symbol] = (monotonic(), result)
        return {**result, "cached": False}

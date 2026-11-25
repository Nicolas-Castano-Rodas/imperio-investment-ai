from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import json
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Imperio Investment Intelligence API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], allow_methods=["GET"], allow_headers=["*"])
SYMBOLS = ("BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT")
BINANCE_URL = "https://api.binance.com/api/v3/ticker/price"

@app.get("/health")
def health():
    return {"status": "ok", "mode": "read_only", "live_trading": False}

@app.get("/api/markets/crypto")
async def crypto_markets():
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(BINANCE_URL, params={"symbols": json.dumps(SYMBOLS)})
            response.raise_for_status()
            payload = response.json()
        if not isinstance(payload, list):
            raise ValueError("Invalid market payload")
        prices = {}
        for item in payload:
            symbol, price = item["symbol"], item["price"]
            if symbol not in SYMBOLS or not isinstance(price, str) or not Decimal(price).is_finite() or Decimal(price) <= 0:
                raise ValueError("Invalid quote")
            prices[symbol] = price
        if set(prices) != set(SYMBOLS):
            raise ValueError("Incomplete quote set")
        return {"source": "Binance Spot", "fetched_at": datetime.now(timezone.utc).isoformat(), "markets": [{"symbol": s, "price": prices[s]} for s in SYMBOLS]}
    except (httpx.HTTPError, ValueError, TypeError, KeyError, InvalidOperation) as exc:
        raise HTTPException(status_code=502, detail="No fue posible obtener cotizaciones válidas de Binance") from exc

# Public market data only; no credentials or trading endpoints.
INTERVALS = ("15m", "1h", "4h", "1d", "1w")
PUBLIC_BASE = "https://api.binance.com/api/v3"

async def public_market_data(endpoint, params):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{PUBLIC_BASE}/{endpoint}", params=params)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in (418, 429):
            retry = exc.response.headers.get("Retry-After", "")
            headers = {"Retry-After": retry} if retry.isdigit() else None
            raise HTTPException(503, "Límite de consultas de Binance; intenta más tarde", headers=headers) from exc
        raise HTTPException(502, "Binance no está disponible") from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(502, "No fue posible consultar Binance") from exc

def decimal_string(value, *, positive=False, nonnegative=False):
    if not isinstance(value, str):
        raise ValueError("Expected decimal string")
    number = Decimal(value)
    if not number.is_finite() or (positive and number <= 0) or (nonnegative and number < 0):
        raise ValueError("Invalid decimal")
    # Reject values outside the finite numeric range used by the chart.
    if not (-1e100 < float(number) < 1e100):
        raise ValueError("Out of range")
    return value

@app.get("/api/markets/crypto/24h")
async def crypto_stats():
    payload = await public_market_data("ticker/24hr", {"symbols": json.dumps(SYMBOLS)})
    try:
        if not isinstance(payload, list):
            raise ValueError("Invalid stats")
        markets = {}
        for item in payload:
            symbol = item["symbol"]
            if symbol not in SYMBOLS or symbol in markets:
                raise ValueError("Invalid symbol")
            markets[symbol] = {
                "symbol": symbol,
                "price": decimal_string(item["lastPrice"], positive=True),
                "change_percent": decimal_string(item["priceChangePercent"]),
                "high": decimal_string(item["highPrice"], positive=True),
                "low": decimal_string(item["lowPrice"], positive=True),
                "quote_volume": decimal_string(item["quoteVolume"], nonnegative=True),
            }
            if Decimal(markets[symbol]["low"]) > Decimal(markets[symbol]["high"]):
                raise ValueError("Invalid range")
        if set(markets) != set(SYMBOLS):
            raise ValueError("Incomplete stats")
        return {"source": "Binance Spot", "fetched_at": datetime.now(timezone.utc).isoformat(),
                "markets": [markets[s] for s in SYMBOLS]}
    except (ValueError, TypeError, KeyError, InvalidOperation, OverflowError) as exc:
        raise HTTPException(502, "Estadísticas de Binance inválidas") from exc

@app.get("/api/markets/crypto/{symbol}/candles")
async def crypto_candles(symbol: str, interval: str = "1h", limit: int = 60):
    if symbol not in SYMBOLS or interval not in INTERVALS or not 2 <= limit <= 200:
        raise HTTPException(422, "Par, intervalo o límite no permitido")
    payload = await public_market_data("klines", {"symbol": symbol, "interval": interval, "limit": limit})
    try:
        if not isinstance(payload, list) or not 1 <= len(payload) <= limit:
            raise ValueError("Invalid candles")
        candles = []
        for row in payload:
            if not isinstance(row, list) or len(row) < 7:
                raise ValueError("Invalid candle")
            opened, closed = row[0], row[6]
            if type(opened) is not int or type(closed) is not int or not 0 <= opened < closed <= 8640000000000000:
                raise ValueError("Invalid timestamps")
            if candles and opened <= candles[-1]["open_time"]:
                raise ValueError("Unordered candles")
            o, h, l, c = [decimal_string(v, positive=True) for v in row[1:5]]
            if not Decimal(l) <= min(Decimal(o), Decimal(c)) <= max(Decimal(o), Decimal(c)) <= Decimal(h):
                raise ValueError("Invalid OHLC")
            candles.append({"open_time": opened, "close_time": closed, "open": o, "high": h,
                            "low": l, "close": c, "volume": decimal_string(row[5], nonnegative=True)})
        return {"source": "Binance Spot", "symbol": symbol, "interval": interval,
                "fetched_at": datetime.now(timezone.utc).isoformat(), "candles": candles}
    except (ValueError, TypeError, KeyError, InvalidOperation, OverflowError) as exc:
        raise HTTPException(502, "Histórico de Binance inválido") from exc

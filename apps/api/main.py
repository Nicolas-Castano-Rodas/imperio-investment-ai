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

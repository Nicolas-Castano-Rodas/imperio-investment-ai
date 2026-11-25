from unittest.mock import AsyncMock, patch
import httpx
from fastapi.testclient import TestClient
from main import app, SYMBOLS

client = TestClient(app)

def mock_response(payload, status=200, headers=None):
    response = httpx.Response(status, request=httpx.Request("GET", "https://api.binance.com"), json=payload, headers=headers)
    return patch("main.httpx.AsyncClient", **{"return_value.__aenter__.return_value.get": AsyncMock(return_value=response)})

def candle():
    return [1700000000000, "100", "110", "90", "105", "2.5", 1700003599999]

def test_history_success():
    with mock_response([candle()]):
        response = client.get("/api/markets/crypto/BTCUSDT/candles?interval=1h&limit=60")
    assert response.status_code == 200
    assert response.json()["candles"][0]["close"] == "105"

def test_invalid_query():
    for suffix in ("BAD/candles", "BTCUSDT/candles?interval=2m", "BTCUSDT/candles?limit=1000"):
        with patch("main.httpx.AsyncClient") as upstream:
            assert client.get("/api/markets/crypto/" + suffix).status_code == 422
            upstream.assert_not_called()

def test_reject_invalid_history():
    for payload in ([], [candle(), candle()], [[*candle()[:2], "80", *candle()[3:]]], [[*candle()[:4], "NaN", *candle()[5:]]]):
        with mock_response(payload):
            assert client.get("/api/markets/crypto/BTCUSDT/candles").status_code == 502

def test_rate_limit():
    with mock_response({"code": -1003}, 429, {"Retry-After": "120"}):
        response = client.get("/api/markets/crypto/BTCUSDT/candles")
    assert response.status_code == 503
    assert response.headers["Retry-After"] == "120"

def test_statistics():
    payload = [{"symbol": s, "lastPrice": "100", "priceChangePercent": "-1.23", "highPrice": "110", "lowPrice": "90", "quoteVolume": "2000"} for s in SYMBOLS]
    with mock_response(payload):
        response = client.get("/api/markets/crypto/24h")
    assert response.status_code == 200
    assert response.json()["markets"][0]["change_percent"] == "-1.23"
    with mock_response(payload[:-1]):
        assert client.get("/api/markets/crypto/24h").status_code == 502

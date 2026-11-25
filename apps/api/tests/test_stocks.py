from unittest.mock import AsyncMock, patch
import httpx
import pytest
from fastapi.testclient import TestClient
from main import app
import stocks

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_state(monkeypatch):
    monkeypatch.setenv("ALPHA_VANTAGE_API_KEY", "test-key")
    monkeypatch.setattr(stocks, "_pause_until", 0.0)
    stocks._cache.clear()
    yield
    stocks._cache.clear()

def payload():
    return {"Meta Data": {"2. Symbol": "AAPL"}, "Time Series (Daily)": {
        "2025-01-03": {"1. open": "100", "2. high": "112", "3. low": "98", "4. close": "110", "5. volume": "1000"},
        "2025-01-02": {"1. open": "99", "2. high": "105", "3. low": "95", "4. close": "100", "5. volume": "2000"}}}

def mock_response(data, status=200):
    response = httpx.Response(status, json=data, request=httpx.Request("GET", "https://www.alphavantage.co/query"))
    return patch("stocks.httpx.AsyncClient", **{"return_value.__aenter__.return_value.get": AsyncMock(return_value=response)})

def test_catalog_without_key(monkeypatch):
    monkeypatch.delenv("ALPHA_VANTAGE_API_KEY")
    result = client.get("/api/markets/stocks").json()
    assert not result["configured"]
    assert len(result["stocks"]) == 8
    assert client.get("/api/markets/stocks/AAPL/daily").status_code == 503

def test_history_and_cache():
    with mock_response(payload()) as upstream:
        first = client.get("/api/markets/stocks/AAPL/daily")
        second = client.get("/api/markets/stocks/AAPL/daily")
    assert first.status_code == 200
    data = first.json()
    assert data["session_date"] == "2025-01-03"
    assert data["change_percent"] == "10.0000"
    assert data["currency"] == "USD" and not data["adjusted"]
    assert not data["cached"] and second.json()["cached"]
    upstream.return_value.__aenter__.return_value.get.assert_awaited_once()

def test_unsupported_symbol():
    with patch("stocks.httpx.AsyncClient") as upstream:
        assert client.get("/api/markets/stocks/UNKNOWN/daily").status_code == 422
        upstream.assert_not_called()

def test_invalid_data():
    data = payload()
    data["Time Series (Daily)"]["2025-01-03"]["2. high"] = "99"
    with mock_response(data):
        assert client.get("/api/markets/stocks/AAPL/daily").status_code == 502

def test_quota_pause():
    with mock_response({"Information": "quota exceeded"}) as upstream:
        assert client.get("/api/markets/stocks/AAPL/daily").status_code == 503
        assert client.get("/api/markets/stocks/MSFT/daily").status_code == 503
        upstream.return_value.__aenter__.return_value.get.assert_awaited_once()

def test_mismatched_symbol():
    data = payload()
    data["Meta Data"]["2. Symbol"] = "MSFT"
    with mock_response(data):
        assert client.get("/api/markets/stocks/AAPL/daily").status_code == 502

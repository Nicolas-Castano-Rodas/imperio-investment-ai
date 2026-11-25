from unittest.mock import AsyncMock, patch
import httpx
from fastapi.testclient import TestClient
from main import app, SYMBOLS

client = TestClient(app)

def test_health():
    assert client.get('/health').json() == {'status': 'ok', 'mode': 'read_only', 'live_trading': False}

def test_market_success():
    response = httpx.Response(200, request=httpx.Request('GET','https://api.binance.com'), json=[{'symbol': s, 'price': '123.45'} for s in SYMBOLS])
    with patch('main.httpx.AsyncClient') as mock:
        mock.return_value.__aenter__.return_value.get = AsyncMock(return_value=response)
        result = client.get('/api/markets/crypto')
    assert result.status_code == 200
    assert len(result.json()['markets']) == 5

def test_market_failure():
    with patch('main.httpx.AsyncClient') as mock:
        mock.return_value.__aenter__.return_value.get = AsyncMock(side_effect=httpx.ConnectError('offline'))
        assert client.get('/api/markets/crypto').status_code == 502

def test_no_trade_endpoint():
    assert client.post('/api/orders', json={}).status_code == 404

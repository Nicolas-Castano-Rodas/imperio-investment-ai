# Investment Intelligence AI

**Desarrollado por EL IMPERIO — Los Reyes del Software**

Fase 3: monorepo de lectura de mercados cripto y bursátiles, sin acceso a cuentas ni órdenes reales. Interfaz responsive Next.js y API FastAPI. El proyecto no incluye aún cartera virtual, IA, base de datos ni trading. No se inventan precios cuando falla el proveedor.

## Requisitos
Node.js 20.9+ (preferiblemente 24), pnpm y Python 3.11+. Ejecutar en Windows PowerShell, desde la carpeta raíz del proyecto.

## Terminal 1: backend
```powershell
cd apps/api
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
Salud: http://127.0.0.1:8000/health — documentación: http://127.0.0.1:8000/docs

## Terminal 2: frontend (desde la raíz)
```powershell
pnpm install
pnpm dev:web
```
Abrir http://localhost:3000. El frontend usa el backend local; se puede cambiar con `apps/web/.env.local` (ver `.env.example`).

## Pruebas
Desde `apps/api`: `.venv\Scripts\python.exe -m pytest -q`. Las pruebas de cotizaciones simulan las respuestas de Binance; no prueban la disponibilidad real desde tu red. Desde la raíz: `pnpm build:web` para validar frontend.

## Seguridad y próximos pasos
Binance público no requiere clave API; Alpha Vantage requiere una clave de datos en el backend. Mantener el servicio en localhost mientras no tenga autenticación. Si Binance devuelve una restricción geográfica, no eludirla; comprobar disponibilidad y seleccionar un proveedor permitido. Antes de cualquier conexión de cuenta: permisos mínimos, secretos solo en backend, auditoría. Fase 2: histórico de precios y gráficos (implementados, pendientes de validación integral); fase 3: datos bursátiles diarios implementados; calendario de sesiones pendiente; fase 4: cartera virtual con comisiones; fase 5: backtesting y riesgo; fase 6: IA y alertas; fase 7: autenticación y testnet. Operaciones reales fuera del alcance inicial.

Documentación: https://developers.binance.com/en/docs/introduction

## Fase 2 — Mercados e histórico

- GET /api/markets/crypto: cotizaciones originales (compatibilidad).
- GET /api/markets/crypto/24h: precio, variación, máximo, mínimo y volumen en USDT.
- GET /api/markets/crypto/BTCUSDT/candles?interval=1h&limit=60: velas OHLCV; pares BTC, ETH, BNB, SOL, XRP contra USDT; intervalos 15m, 1h, 4h, 1d, 1w; límite 2–200.
- Dashboard con gráficos SVG, selección de par e intervalo y refresco de 60 segundos, que se pausa tras un error. La última vela puede no estar cerrada. No se generan precios sintéticos; los datos conservados tras errores se identifican.
- Los errores y límites del proveedor se comunican sin realizar reintentos automáticos tras fallos. Respeta Retry-After antes de intentar manualmente de nuevo.
- Ejecutar pytest -q desde apps/api y pnpm build:web desde la raíz antes de integrar.

Sin claves API ni acceso a cuenta. No se han añadido órdenes, señales de inversión ni operaciones reales.


## Fase 3 — Acciones estadounidenses

- Catálogo: AAPL, MSFT, NVDA, TSLA, AMZN, GOOGL, META, JPM.
- GET /api/markets/stocks: catálogo y disponibilidad del proveedor.
- GET /api/markets/stocks/AAPL/daily: serie OHLCV diaria, hasta 100 sesiones, último cierre disponible y variación entre dos sesiones.
- Proveedor: Alpha Vantage TIME_SERIES_DAILY. Datos en USD, no ajustados por dividendos o splits, no cotizaciones en tiempo real. El calendario de sesiones, feriados, estado abierto/cerrado y datos intradía se dejan para una ampliación posterior.
- Caché de cuatro horas en memoria por símbolo, consultas manuales y pausa de una hora ante límites del proveedor. El reinicio borra la caché; no se garantiza el cumplimiento global de la cuota entre procesos o aplicaciones. Plan gratuito sujeto a límites y licencia del proveedor.
- Obtener clave en https://www.alphavantage.co/support/#api-key ; documentación https://www.alphavantage.co/documentation/#daily .

### Activación local (PowerShell, apps/api)

```powershell
$env:ALPHA_VANTAGE_API_KEY = "TU_CLAVE"
.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

No introducir claves en código, frontend, GitHub o mensajes. Sin clave, se muestra el catálogo sin precios. Verificar las condiciones de redistribución antes de publicar el servicio. No hay bróker, compra ni venta de acciones. Validación pendiente: pruebas automatizadas, compilación y consulta real con clave autorizada.

**Autoría del software:** EL IMPERIO — Los Reyes del Software.

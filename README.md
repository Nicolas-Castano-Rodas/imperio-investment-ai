# EL IMPERIO — Investment Intelligence AI

Fase 1: monorepo de lectura de mercado cripto, sin claves, cuenta ni órdenes reales. Interfaz responsive Next.js y API FastAPI. El proyecto no incluye aún acciones, cartera virtual, IA, base de datos ni trading. No se inventan precios cuando falla el proveedor.

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
No se necesitan claves API. Mantener el servicio en localhost mientras no tenga autenticación. Si Binance devuelve una restricción geográfica, no eludirla; comprobar disponibilidad y seleccionar un proveedor permitido. Antes de cualquier conexión de cuenta: permisos mínimos, secretos solo en backend, auditoría. Fase 2: histórico de precios y gráficos; fase 3: datos bursátiles y calendario; fase 4: cartera virtual con comisiones; fase 5: backtesting y riesgo; fase 6: IA y alertas; fase 7: autenticación y testnet. Operaciones reales fuera del alcance inicial.

Documentación: https://developers.binance.com/en/docs/introduction

# test-entretenimiento

Espacio personal para probar juegos multijugador sin tocar el proyecto empresarial. Todo corre con estado en memoria del servidor (se pierde al reiniciar) — es un MVP para probar en local y en un deploy gratuito.

**No contiene información sensible.** Solo entretenimiento.

## Juegos

- **Bingo** — adaptado de la versión empresarial. Los jugadores entran con nombre + email (sin login).
- **Battleship** — en construcción.

## Correr en local

```bash
npm install
npm run dev
```

Abrir `http://localhost:3100`.

## Rutas

- `/` — menú de entretenimiento
- `/crear` — crear una sala
- `/juego/[id]/jugar` — vista de jugador
- `/juego/[id]/lider` — vista de líder

## Stack

- Next.js 16 + React 19
- Tailwind v4
- Store en memoria (sin base de datos)
- Sin WebSockets — polling contra route handlers (compatible con Vercel Free)

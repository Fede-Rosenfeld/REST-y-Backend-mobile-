# App — Registro de la Fortaleza (Tarea 17/09)

App de Galería hecha con **Expo + React Native + TypeScript**, conectada a la API
de Express + Prisma que está en la carpeta `backend`.

## Requisitos

- Node.js 22.13 o superior

## Importante: hacen falta DOS terminales

La app y la API son dos programas distintos. `npx expo start` **no** levanta el
backend. Si se abre la app sin el backend prendido, aparece el cartel
**"No se pudo conectar con http://..."**: eso significa que falta la terminal 1.

**Terminal 1 — backend** (dejar abierta):

```bash
cd backend
npm install
npx prisma generate
npm run dev
# tiene que decir: API escuchando en http://localhost:3000
```

**Terminal 2 — app** (dejar abierta):

```bash
cd mobile
npm install
npx expo start
```

Después, desde el menú de Expo:

- `w` abre la app en el navegador
- `a` abre el emulador de Android
- o escaneá el QR con **Expo Go** desde el celular

## La URL del backend

No está hardcodeada y **en general no hay que tocar nada**: la app usa la misma
IP desde la que Expo le sirve el bundle y le cambia el puerto por el 3000.
Así funciona sola tanto en el navegador (`localhost:3000`) como en el celular
con Expo Go (la IP de la PC en la wifi), sin tener que averiguar la IP a mano
ni editarla cada vez que el router la cambia.

Si hace falta forzar otra URL, se descomenta la línea en el archivo `.env`
(hay un `.env.example` de referencia):

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.25:3000
```

| Dónde corre la app  | Qué detecta sola            | Si hay que forzarla        |
| ------------------- | --------------------------- | -------------------------- |
| Navegador, misma PC | `http://localhost:3000`     | `http://localhost:3000`    |
| Celular con Expo Go | `http://IP-DE-LA-PC:3000`   | `http://192.168.1.25:3000` |
| Emulador de Android | `http://10.0.2.2:3000`      | `http://10.0.2.2:3000`     |

Después de editar `.env` hay que **reiniciar Expo** (no alcanza con recargar).

### Si desde el celular no conecta

- La PC y el celular tienen que estar en la **misma red wifi**.
- El **firewall de Windows** puede bloquear el puerto 3000. Hay que permitir
  Node.js en redes privadas, o probar primero abriendo `http://IP-DE-LA-PC:3000/api/health`
  desde el navegador del celular: si no responde, es el firewall.

## Qué se puede hacer

- **Cargar un enano**: nombre, apellido, **edad**, fecha de llegada y si está en labores.
- **Ver la lista** de enanos traída del backend, cada uno en su tarjeta.
- **Asignar o retirar de labores** con un botón (hace un `PATCH`).
- **Borrar un enano** con el botón rojo de cada tarjeta. No borra de una: abre un
  **modal de confirmación** que nombra al enano y pide confirmar. `[ CANCELAR ]`
  cierra sin tocar nada y `[ SI, BORRAR ]` recién ahí manda el `DELETE`.

Los errores y confirmaciones se muestran en un cartel dentro de la pantalla
(se toca para cerrarlo), porque `Alert` no muestra nada en la versión web.

## Estructura

```
mobile/
  App.tsx          toda la pantalla: formulario, FlatList y modal de borrado
  index.ts         punto de entrada de Expo
  .env             URL del backend (editable)
  .env.example     ejemplo de configuración
```

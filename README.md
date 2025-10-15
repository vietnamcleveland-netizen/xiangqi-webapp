# Xiangqi Web App (MVP)

Self-hostable MVP for real-time xiangqi (Chinese chess) using Node.js, Express, Socket.io, and SQLite.

## Run locally
```bash
npm install
npm run migrate
npm start
# open http://localhost:8080
```

## Environment
Create a `.env` file (do not commit secrets):
```
PORT=8080
JWT_SECRET=change_me_long_random
SESSION_SECRET=another_change_me
BASE_URL=http://localhost:8080
```

## Deploy on Render
- Build Command: `npm install && npm run migrate`
- Start Command: `npm start`
- Environment: Node
- Region: US (Ohio/Virginia)
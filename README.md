# CodeArena - Real-time Competitive Programming Platform

Minimal MVP for competitive coding duels with Codeforces integration.

## Stack

- **Backend**: FastAPI + SQLAlchemy + SQLite
- **Frontend**: Next.js (placeholder)
- **Cache**: Redis (optional

## Features

- User registration/login with JWT tokens
- Codeforces handle management
- Real-time duel system (create, join, start, submit)
- Practice problem generation from Codeforces

## API Endpoints

### Auth
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get token
- `PUT /auth/cf-handle` - Set Codeforces handle
- `GET /auth/me` - Get current user profile

### Practice
- `GET /practice/div2` - Div2 problems
- `GET /practice/div3` - Div3 problems
- `GET /practice/generate?rating=1200&count=5` - Generate problems by rating

### Duel
- `POST /duel/create` - Create a duel
- `POST /duel/join` - Join a duel
- `POST /duel/start` - Start the duel
- `POST /duel/submit` - Submit solution
- `GET /duel/{id}` - Get duel state

## Running

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend is a placeholder scaffold.

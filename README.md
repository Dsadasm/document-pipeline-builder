## Installation
### Backend:
```bash
cd backend

# Database
sudo systemctl start docker # Linux
docker compose up

# Express
npm install
npx prisma migrate dev --name init
npx prisma db seed
npx prisma generate
npm run dev
```

### Frontend:
```bash
cd frontend
npm install
npm run dev
```
# V2 Solidon Backend

Solidon E-commerce Backend built with Medusa.js - A powerful, flexible e-commerce API server.

## Overview

This is the backend API for the Solidon e-commerce platform, providing:
- Product catalog management
- Order processing
- Customer management
- Payment integration
- Inventory management
- Admin dashboard


## Tech Stack

- **Framework**: Medusa.js v2
- **Language**: TypeScript
- **Database**: PostgreSQL (configurable)
- **Runtime**: Node.js 20+

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- PostgreSQL database

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd v2-solidon-backend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up your environment variables:
   - Copy `.env.example` to `.env`
   - Add your database credentials (Supabase)
   - Add your Redis URL (Upstash - see deployment section)

4. Run database migrations and seed data:
```bash
npm run seed
```

5. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:9000`

## Deployment

This application uses managed cloud services for simplicity:

- **Database**: Supabase (PostgreSQL)
- **Redis**: Upstash (Serverless Redis)
- **Backend Hosting**: Railway / Render
- **Frontend Hosting**: Vercel

### Environment Variables

Required environment variables:
```env
DATABASE_URL=          # Supabase PostgreSQL URL
REDIS_URL=            # Upstash Redis URL (rediss://...)
JWT_SECRET=           # Random string (min 32 chars)
COOKIE_SECRET=        # Random string (min 32 chars)
STORE_CORS=           # Frontend URL
ADMIN_CORS=           # Admin/Frontend URLs
AUTH_CORS=            # Auth URLs
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run seed` - Seed database with initial data
- `npm run test:unit` - Run unit tests
- `npm run test:integration:http` - Run HTTP integration tests
- `npm run test:integration:modules` - Run module integration tests

## API Documentation

Once running, you can access:
- Admin Dashboard: `http://localhost:9000/app`
- API Documentation: `http://localhost:9000/docs`

## Project Structure

```
src/
├── api/           # API routes
├── modules/       # Custom modules
├── scripts/       # Utility scripts
└── ...
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

MIT
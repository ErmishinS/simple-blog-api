# Simple Blog API

A RESTful API for a simple blog application built with Node.js, Express, PostgreSQL, and JWT authentication.

## Design-document

[link to design-document](https://docs.google.com/document/d/1lGfYUlrioTa9XHQdZxVgG6gCZRpX7dNuUeH4cZSfTpg/edit?usp=sharing)

## Features

- User registration and authentication
- JWT token-based authorization
- CRUD operations for blog posts
- Post ownership validation
- Input validation and error handling

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Validation**: Joi
- **Testing**: Jest, Supertest

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ErmishinS/simple-blog-api.git
cd simple-blog-api
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your configuration:
```env
DATABASE_URL=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_HOST=
POSTGRES_PORT=
POSTGRES_DATABASE=

JWT_SECRET=
```

4. Set up the database:
```bash
npx prisma migrate dev
npx prisma generate
```

5. Start the server:
```bash
npm start
```

6. Start containers:
```bash
docker compose up
```

## API Endpoints

### Authentication

#### Register User
```http
POST /register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Login User
```http
POST /login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Posts

#### Get All Posts
```http
GET /posts
```

#### Get Single Post
```http
GET /posts/:id
```

#### Create Post (Authentication Required)
```http
POST /posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My Blog Post",
  "content": "This is the content of my blog post."
}
```

#### Update Post (Authentication Required + Owner Only)
```http
PUT /posts/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content."
}
```

#### Delete Post (Authentication Required + Owner Only)
```http
DELETE /posts/:id
Authorization: Bearer <token>
```

## Response Format

All API responses follow this format:

```json
{
  "status": "success|error",
  "data": { ... },
  "message": "Optional human-readable message"
}
```

## Testing

Run the test suite:

```bash
npm test
```

## Project Structure

```
simple-blog-api/
├── .github/workflows
│   └── ci.yml
├── prisma/
│   └── schema.prisma
├── src/
│   ├── auth/
│       └── authController.js
│       └── authController.test.js
│       └── authRoutes.js
│   ├── config/
│       └── database.js
│   ├── middleware/
│       └── auth.js
│       └── auth.test.js
│   ├── posts/
│       └── postController.js
│       └── postController.test.js
│       └── postRoutes.js
│   ├── utils/
│       └── validation.js
│   ├── server.js
├── .gitignore
├── Dockerfile
├── README.md
├── babel.config.js
├── docker-compose.yml
├── jest.config.js
├── package-lock.json
├── package.json
└── .env

```

## Development Team

- **Yermishyn Oleksandr** - Team Lead, Backend Developer
- **Yaroslav Kantur** - Backend Developer, DevOps
- **Ivanyta Dmytro** - Backend Developer, Testing

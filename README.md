# Frontend Application

Frontend aplikasi menggunakan Next.js dengan TypeScript, Tailwind CSS, dan shadcn/ui components.

## 🚀 Cara Menjalankan Aplikasi

### Prerequisites

Sebelum menjalankan aplikasi, pastikan Anda telah menginstall:
- **Node.js 18+** - [Download Node.js](https://nodejs.org/)
- **npm**, **yarn**, atau **pnpm** - Package manager
- **Docker & Docker Compose** (optional, untuk containerized deployment)

### 📦 Installation

#### 1. Clone Repository
```bash
git clone <repository-url>
cd monorepo/frontend
```

#### 2. Install Dependencies
```bash
npm install
# atau
yarn install
# atau
pnpm install
```

#### 3. Setup Environment Variables

Buat file `.env.local` di root folder `frontend/` dengan konfigurasi berikut:

```env
# NextAuth Configuration
NEXTAUTH_SECRET=your_nextauth_secret_key_here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000
BACKEND_URL=http://localhost:5000

# Kolosal API Configuration
KOLOSAL_API_KEY=your_kolosal_api_key

# Cloudinary Configuration (optional)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your_cloudinary_api_key
NEXT_PUBLIC_CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Node Environment
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1
```

> **⚠️ PENTING:** 
> - Jangan commit file `.env.local` atau `.env` ke repository!
> - Pastikan file `.env*` sudah ada di `.gitignore`.
> - Untuk production, gunakan file `.env` atau set environment variables di hosting platform Anda.
> - Jangan pernah hardcode API keys atau secrets di source code!

### 🐳 Menjalankan dengan Docker Compose (Recommended)

Cara termudah untuk menjalankan aplikasi adalah menggunakan Docker Compose.

#### Langkah-langkah:

1. **Pastikan Docker dan Docker Compose sudah terinstall dan berjalan**

2. **Buat file `.env` di folder `frontend/`** (lihat contoh di atas)

3. **Jalankan container:**
```bash
docker-compose up -d
```

4. **Cek status container:**
```bash
docker-compose ps
```

5. **Lihat logs:**
```bash
# Semua logs
docker-compose logs -f

# Hanya frontend
docker-compose logs -f frontend
```

6. **Stop container:**
```bash
docker-compose down
```

Aplikasi akan berjalan di **http://localhost:3000**

### 💻 Menjalankan Secara Lokal (Development)

Untuk development dengan hot reload:

1. **Jalankan development server:**
```bash
npm run dev
# atau
yarn dev
# atau
pnpm dev
```

2. **Buka browser dan akses:**
```
http://localhost:3000
```

Aplikasi akan otomatis reload ketika Anda mengubah file.

### 🏗️ Build untuk Production

1. **Build aplikasi:**
```bash
npm run build
# atau
yarn build
# atau
pnpm build
```

2. **Jalankan production server:**
```bash
npm start
# atau
yarn start
# atau
pnpm start
```

## 🛠️ Development Commands

### Available Scripts

```bash
# Development server dengan hot reload
npm run dev

# Build untuk production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Format Code

```bash
# Format dengan Prettier (jika tersedia)
npm run format

# Atau menggunakan ESLint
npm run lint -- --fix
```

## 📁 Struktur Proyek

```
frontend/
├── src/
│   ├── pages/                  # Next.js pages
│   │   ├── api/                # API routes
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth].ts
│   │   │   └── kolosal/
│   │   │       ├── agent.ts
│   │   │       ├── chat.ts
│   │   │       ├── workspace.ts
│   │   │       └── ...
│   │   ├── auth/               # Authentication pages
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   ├── reset-password.tsx
│   │   │   └── ...
│   │   ├── zoom/               # Zoom/Video pages
│   │   │   ├── index.tsx
│   │   │   └── [roomId].tsx
│   │   ├── _app.tsx            # App wrapper
│   │   ├── _document.tsx      # Document wrapper
│   │   └── index.tsx           # Home page
│   │
│   ├── components/             # React components
│   │   ├── auth/               # Authentication components
│   │   │   └── LoginForm.tsx
│   │   ├── chatbot/            # Chatbot components
│   │   │   ├── ChatbotInput.tsx
│   │   │   ├── ChatbotMessages.tsx
│   │   │   └── ChatbotSettings.tsx
│   │   ├── ui/                 # UI components (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── zoom/               # Zoom components
│   │   │   └── ChatSidebar.tsx
│   │   └── general/            # General components
│   │       └── Navbar.tsx
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-toast.ts
│   │   └── useChatbot.ts
│   │
│   ├── lib/                    # Utilities & API client
│   │   ├── api.ts
│   │   └── utils.ts
│   │
│   ├── types/                  # TypeScript type definitions
│   │   ├── auth.ts
│   │   ├── chat.ts
│   │   └── room.ts
│   │
│   ├── utils/                  # Helper functions
│   │   ├── chatbot/
│   │   │   ├── api.ts
│   │   │   ├── handlers.ts
│   │   │   └── ...
│   │   └── workspace/
│   │       ├── api.ts
│   │       └── types.ts
│   │
│   ├── middlewares/            # Middleware components
│   │   └── WithAuth.tsx
│   │
│   └── styles/                 # Global styles
│       └── globals.css
│
├── public/                     # Static assets
├── package.json
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── components.json             # shadcn/ui configuration
├── Dockerfile                  # Docker image configuration
├── docker-compose.yml          # Docker Compose configuration
└── README.md                   # This file
```

## 🐳 Docker Commands

### Build Docker Image
```bash
docker build -t frontend-app .
```

### Run Container Manual
```bash
docker run -p 3000:3000 --env-file .env frontend-app
```

### Rebuild Container (setelah perubahan code)
```bash
docker-compose up -d --build frontend
```

### Restart Container
```bash
docker-compose restart frontend
```

### View Logs Real-time
```bash
docker-compose logs -f frontend
```

### Execute Command di Container
```bash
docker-compose exec frontend sh
```

## 🔧 Configuration

### Next.js Configuration

File `next.config.ts` berisi konfigurasi Next.js seperti:
- Environment variables
- Image domains
- API routes
- Webpack configuration

### TypeScript Configuration

File `tsconfig.json` berisi konfigurasi TypeScript untuk strict type checking.

### Tailwind CSS

Aplikasi menggunakan Tailwind CSS untuk styling. Konfigurasi ada di `tailwind.config.js`.

### shadcn/ui Components

Aplikasi menggunakan shadcn/ui untuk UI components. Konfigurasi ada di `components.json`.

## 📝 Environment Variables

### Required Variables

- `NEXTAUTH_SECRET` - Secret key untuk NextAuth.js (generate random string)
- `NEXTAUTH_URL` - URL aplikasi (http://localhost:3000 untuk development, https://your-domain.com untuk production)
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID (dari Google Cloud Console)
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret (dari Google Cloud Console)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Public Google OAuth Client ID (sama dengan GOOGLE_CLIENT_ID)
- `NEXT_PUBLIC_API_URL` - URL backend API (http://localhost:5000 untuk development, https://your-api-domain.com untuk production)
- `BACKEND_URL` - URL backend API (alternatif untuk NEXT_PUBLIC_API_URL)
- `KOLOSAL_API_KEY` - API key untuk Kolosal AI (dari Kolosal dashboard)

### Optional Variables

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name (untuk image upload)
- `NEXT_PUBLIC_CLOUDINARY_API_KEY` - Cloudinary API key
- `NEXT_PUBLIC_CLOUDINARY_API_SECRET` - Cloudinary API secret
- `NODE_ENV` - Environment (development/production)
- `NEXT_TELEMETRY_DISABLED` - Disable Next.js telemetry (1 untuk disable)

> **⚠️ Security Note:** 
> - Jangan pernah commit file `.env` atau `.env.local` ke Git
> - Gunakan environment variables di hosting platform untuk production
> - Generate secret keys yang kuat dan unik untuk setiap environment

## 🚀 Deployment

### Vercel (Recommended)

1. Push code ke GitHub
2. Import project di Vercel
3. Set environment variables
4. Deploy

### Docker

1. Build image:
```bash
docker build -t frontend-app .
```

2. Run container:
```bash
docker run -p 3000:3000 --env-file .env frontend-app
```

## 📚 Tech Stack

- **Framework**: Next.js 16
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Authentication**: NextAuth.js
- **State Management**: React Context API
- **API Client**: Fetch API / Axios

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT

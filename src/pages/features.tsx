import { useEffect, useState } from "react";
import { Space_Grotesk, Outfit } from "next/font/google";
import Navbar from "@/components/general/Navbar";
import { Chatbot } from "@/components/ui/Chatbot";

// Generate particles outside component (runs once at module load)
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: (i * 17 + 13) % 100,
  top: (i * 23 + 7) % 100,
  duration: 3 + (i % 5),
  delay: (i % 3) * 0.7,
}));

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export default function Features() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 10);
    return () => {
      clearTimeout(timer);
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      title: "Login & Register",
      steps: [
        "Klik tombol 'Sign In' atau 'Get Started' di navbar",
        "Pilih metode login: Email/Password atau Google OAuth",
        "Untuk register, klik 'Sign Up' dan isi form pendaftaran",
        "Verifikasi email jika diperlukan",
        "Setelah login, Anda akan diarahkan ke halaman utama",
      ],
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      title: "Chatbot AI",
      steps: [
        "Klik ikon chatbot di pojok kanan bawah halaman",
        "Chatbot akan muncul sebagai floating window",
        "Ketika chatbot aktif, ikon akan berubah menjadi hijau",
        "Gunakan chatbot untuk bertanya tentang fitur aplikasi",
        "Chatbot menggunakan AI untuk memberikan respon yang relevan",
      ],
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      title: "Buat Room Baru",
      steps: [
        "Setelah login, klik tombol 'Enter Platform'",
        "Di halaman Rooms, klik tombol 'Rapat baru' atau 'Create Room'",
        "Sistem akan membuat room ID secara otomatis",
        "Room ID akan ditampilkan dan bisa dibagikan ke peserta",
        "Klik 'Join' untuk masuk ke room yang baru dibuat",
      ],
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      title: "Masuk Room dengan ID",
      steps: [
        "Di halaman Rooms, temukan input field 'Masukkan kode atau link'",
        "Masukkan Room ID yang diberikan oleh host",
        "Atau paste link room yang dibagikan",
        "Tombol 'Gabung' akan aktif setelah ada input",
        "Klik 'Gabung' untuk masuk ke room meeting",
      ],
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: "Chatroom dengan AI Agent",
      steps: [
        "Setelah masuk ke room, buka chat sidebar",
        "Untuk bertanya ke AI, ketik '@ai' atau '@agen' di awal pesan",
        "Contoh: '@ai Bagaimana cara menggunakan fitur ini?'",
        "AI akan merespon dengan analisis dan rekomendasi",
        "Anda juga bisa upload gambar untuk OCR dengan mengetik '@ai'",
        "AI Agent akan membantu transkrip dan analisis meeting",
      ],
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      title: "Reset Password",
      steps: [
        "Klik tombol 'Sign In' di navbar",
        "Di halaman login, klik link 'Lupa password?' atau 'Forgot Password'",
        "Masukkan email yang terdaftar di akun Anda",
        "Klik 'Kirim' untuk mengirim link reset password",
        "Cek email Anda dan klik link reset password yang dikirim",
        "Masukkan OTP yang diterima di email",
        "Buat password baru yang kuat dan konfirmasi password",
        "Klik 'Reset Password' untuk menyelesaikan proses",
        "Setelah berhasil, login dengan password baru",
      ],
    },
  ];

  return (
    <div
      className={`${spaceGrotesk.variable} ${outfit.variable} relative min-h-screen overflow-hidden bg-[#0a0a0f] font-sans`}
    >
      {/* Navbar */}
      <Navbar />
      <Chatbot />
      
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary gradient orbs */}
        <div
          className="absolute w-[800px] h-[800px] rounded-full opacity-30 blur-[120px] animate-pulse"
          style={{
            background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
            left: `${mousePosition.x * 0.02}px`,
            top: `${mousePosition.y * 0.02}px`,
            transition: "all 0.3s ease-out",
          }}
        />
        <div
          className="absolute right-0 bottom-0 w-[600px] h-[600px] rounded-full opacity-25 blur-[100px]"
          style={{
            background: "radial-gradient(circle, #ec4899 0%, transparent 70%)",
            animation: "float 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 w-[500px] h-[500px] rounded-full opacity-20 blur-[80px]"
          style={{
            background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)",
            animation: "float 10s ease-in-out infinite reverse",
          }}
        />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "100px 100px",
          }}
        />

        {/* Floating particles */}
        {PARTICLES.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-1 h-1 bg-white rounded-full opacity-20"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              animation: `twinkle ${particle.duration}s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <main className="relative z-10 min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className={`text-center mb-12 ${mounted ? "animate-fadeInUp" : "opacity-0"}`} style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 font-[family-name:var(--font-outfit)]">
              <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                Cara Menggunakan
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Platform
              </span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Panduan lengkap untuk menggunakan semua fitur Zoom Meeting AI Agent
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group relative p-6 sm:p-8 rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300 ${mounted ? "animate-fadeInUp" : "opacity-0"}`}
                style={{ animationDelay: `${0.2 + index * 0.1}s`, animationFillMode: "forwards" }}
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/10 via-transparent to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 mb-4">
                    {feature.icon}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-semibold text-white mb-4 font-[family-name:var(--font-space)]">
                    {feature.title}
                  </h3>

                  {/* Steps */}
                  <ol className="space-y-3">
                    {feature.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-xs font-semibold text-indigo-300 mt-0.5">
                          {stepIndex + 1}
                        </span>
                        <span className="text-gray-300 text-sm leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>

          {/* Tips Section */}
          <div className={`mt-16 p-6 sm:p-8 rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-sm ${mounted ? "animate-fadeInUp" : "opacity-0"}`} style={{ animationDelay: "0.7s", animationFillMode: "forwards" }}>
            <h3 className="text-2xl font-semibold text-white mb-4 font-[family-name:var(--font-space)] flex items-center gap-2">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tips & Trik
            </h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span>Gunakan <code className="px-2 py-0.5 rounded bg-white/10 text-indigo-300">@ai</code> atau <code className="px-2 py-0.5 rounded bg-white/10 text-indigo-300">@agen</code> untuk mengaktifkan AI Agent di chatroom</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span>AI akan otomatis mentranskrip dan menganalisis percakapan meeting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span>Room ID dapat dibagikan melalui link untuk memudahkan peserta bergabung</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span>Chatbot tersedia di semua halaman untuk bantuan cepat</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-gray-600 text-sm font-[family-name:var(--font-outfit)]">
          Platform Meeting UMKM dengan{" "}
          <span className="text-gray-400">AI Agent</span>
          {" · "}
          <span className="text-gray-400">LiveKit</span>
          {" · "}
          <span className="text-gray-400">Kolosal AI</span>
        </p>
      </footer>

      {/* Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -30px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.5); }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards !important;
        }
      `}</style>
    </div>
  );
}


import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Space_Grotesk, Outfit } from "next/font/google";
import Navbar from "@/components/general/Navbar";
import { Chatbot } from "@/components/ui/Chatbot";

// Generate particles outside component (runs once at module load)
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: (i * 17 + 13) % 100, // Deterministic spread
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

export default function Home() {
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    // Trigger animation on mount/remount
    const timer = setTimeout(() => {
      setMounted(true);
      setAnimationKey((prev: number) => prev + 1);
    }, 10);
    return () => {
      clearTimeout(timer);
      setMounted(false);
    };
  }, [router.pathname]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleEnter = () => {
    router.push("/zoom");
  };

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
      <main className="relative z-10 flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-6 -mt-10">
        {/* Main heading */}
        <h1
          key={`heading-${animationKey}`}
          className={`text-center text-5xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 sm:mb-5 md:mb-6 font-[family-name:var(--font-outfit)] ${mounted ? "animate-fadeInUp" : "opacity-0"}`}
          style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
        >
          <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Zoom Meeting
          </span>
          <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            AI Agent
          </span>
        </h1>

        {/* Subtitle */}
        <p
          key={`subtitle-${animationKey}`}
          className={`text-center text-base sm:text-lg md:text-xl text-gray-400 max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl mb-6 sm:mb-8 md:mb-10 px-4 sm:px-0 leading-relaxed font-[family-name:var(--font-outfit)] ${mounted ? "animate-fadeInUp" : "opacity-0"}`}
          style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
        >
          Platform meeting profesional dengan AI Agent untuk UMKM. 
          Transkrip, analisis, dan rekomendasi otomatis dari setiap pertemuan dengan investor.
        </p>

        {/* CTA Button */}
        <div
          key={`button-${animationKey}`}
          className={`${mounted ? "animate-fadeInUp" : "opacity-0"} mb-6 sm:mb-8 md:mb-10`}
          style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
        >
          <button
            onClick={handleEnter}
            className="group relative px-7 py-3.5 sm:px-8 sm:py-4 md:px-10 md:py-4 rounded-full font-semibold text-base sm:text-lg md:text-xl transition-all duration-300 font-[family-name:var(--font-space)]"
          >
            {/* Button glow effect */}
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-70 blur-lg group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Button background */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            
            {/* Button inner */}
            <div className="relative flex items-center gap-2 sm:gap-3 text-white">
              <span>Enter Platform</span>
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 transform group-hover:translate-x-1 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
          </button>
        </div>

        {/* Features */}
        <div
          key={`features-${animationKey}`}
          className={`mt-3 sm:mt-12 md:mt-16 w-full max-w-6xl px-4 sm:px-6 md:px-8 ${mounted ? "animate-fadeInUp" : "opacity-0"}`}
          style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
        >
          <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            {[
              {
                icon: (
                  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
                title: "AI Agent Cerdas",
                desc: "Transkrip & analisis otomatis",
              },
              {
                icon: (
                  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
                title: "Meeting Profesional",
                desc: "Kualitas HD untuk investor",
              },
              {
                icon: (
                  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: "Aman & Terpercaya",
                desc: "Data meeting terlindungi",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group relative flex flex-col h-full p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300"
              >
                <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-500/10 via-transparent to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex flex-col h-full items-center text-center">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 mb-3 sm:mb-4 flex-shrink-0">
                    <div className="w-5 h-5 sm:w-6 sm:h-6">
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-white font-semibold text-sm sm:text-base md:text-lg mb-2 font-[family-name:var(--font-space)] leading-tight">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-xs sm:text-sm md:text-base leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
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

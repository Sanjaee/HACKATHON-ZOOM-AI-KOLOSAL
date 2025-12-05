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
      setAnimationKey((prev) => prev + 1);
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
      <main className="relative z-10 flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-6 -mt-16">
        {/* Main heading */}
        <h1
          key={`heading-${animationKey}`}
          className={`text-center text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight mb-6 font-[family-name:var(--font-outfit)] ${mounted ? "animate-fadeInUp" : "opacity-0"}`}
          style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
        >
          <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Connect
          </span>
          <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Anywhere
          </span>
        </h1>

        {/* Subtitle */}
        <p
          key={`subtitle-${animationKey}`}
          className={`text-center text-lg sm:text-xl text-gray-400 max-w-md mb-12 leading-relaxed font-[family-name:var(--font-outfit)] ${mounted ? "animate-fadeInUp" : "opacity-0"}`}
          style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
        >
          Experience next-generation video conferencing with crystal-clear
          quality and seamless collaboration.
        </p>

        {/* CTA Button */}
        <div
          key={`button-${animationKey}`}
          className={mounted ? "animate-fadeInUp" : "opacity-0"}
          style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
        >
          <button
            onClick={handleEnter}
            className="group relative px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 font-[family-name:var(--font-space)]"
          >
            {/* Button glow effect */}
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-70 blur-lg group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Button background */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            
            {/* Button inner */}
            <div className="relative flex items-center gap-3 text-white">
              <span>Enter Platform</span>
              <svg
                className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300"
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
          className={`mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl ${mounted ? "animate-fadeInUp" : "opacity-0"}`}
          style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
        >
          {[
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ),
              title: "Lightning Fast",
              desc: "Ultra-low latency",
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ),
              title: "Secure",
              desc: "End-to-end encrypted",
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ),
              title: "Collaborative",
              desc: "Real-time teamwork",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="group relative p-6 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 mb-3">
                  {feature.icon}
                </div>
                <h3 className="text-white font-semibold mb-1 font-[family-name:var(--font-space)]">
                  {feature.title}
                </h3>
                <p className="text-gray-500 text-sm">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-gray-600 text-sm font-[family-name:var(--font-outfit)]">
          Powered by{" "}
          <span className="text-gray-400">LiveKit</span>
          {" · "}
          <span className="text-gray-400">Next.js</span>
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

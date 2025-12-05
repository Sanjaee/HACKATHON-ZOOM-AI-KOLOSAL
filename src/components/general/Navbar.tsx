"use client";

import React from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User, Settings, Video, Sparkles } from "lucide-react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isLoading = status === "loading";

  const handleSignIn = () => {
    signIn(undefined, { callbackUrl: router.asPath });
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name && name.trim()) {
      const initials = name
        .split(" ")
        .filter((n) => n && n.trim())
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      return initials || "U";
    }
    if (email && email.trim()) {
      return email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-black/40 backdrop-blur-xl border-b border-white/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Logo/Brand */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2.5 group"
        >
          {/* Logo Icon */}
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-0 blur-lg group-hover:opacity-30 transition-opacity" />
          </div>
          {/* Brand Name */}
          <span className="text-lg font-bold text-white tracking-tight hidden sm:block">
            Zacode
          </span>
        </button>

        {/* Center Navigation - Desktop */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink href="/zoom" icon={<Video className="w-4 h-4" />}>
            Rooms
          </NavLink>
          <NavLink href="/features" icon={<Sparkles className="w-4 h-4" />}>
            Features
          </NavLink>
        </div>

        {/* Right side - Auth */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="h-9 w-24 animate-pulse rounded-full bg-gray-800" />
          ) : session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-1.5 py-1.5 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                  <Avatar className="h-8 w-8 ring-2 ring-purple-500/50">
                    <AvatarImage
                      src={session.user.image || undefined}
                      alt={session.user.name || "User"}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-medium">
                      {getInitials(session.user.name, session.user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-gray-200 hidden sm:block max-w-[100px] truncate">
                    {session.user.name?.split(" ")[0] || "User"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-gray-900 border-gray-800 shadow-xl shadow-black/50"
              >
                <DropdownMenuLabel className="p-0">
                  <div className="flex items-center gap-3 px-3 py-3 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-b border-gray-800">
                    <Avatar className="h-11 w-11 ring-2 ring-purple-500/30">
                      <AvatarImage
                        src={session.user.image || undefined}
                        alt={session.user.name || "User"}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-medium">
                        {getInitials(session.user.name, session.user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-sm text-white truncate">
                        {session.user.name || "User"}
                      </span>
                      {session.user.email && (
                        <span className="text-xs text-gray-400 truncate">
                          {session.user.email}
                        </span>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <div className="py-1">
                  <DropdownMenuItem
                    onClick={() => router.push("/profile")}
                    className="cursor-pointer text-gray-300 hover:text-white hover:bg-white/10 focus:bg-white/10 mx-1 rounded-md"
                  >
                    <User className="mr-2.5 h-4 w-4 text-gray-400" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/zoom")}
                    className="cursor-pointer text-gray-300 hover:text-white hover:bg-white/10 focus:bg-white/10 mx-1 rounded-md"
                  >
                    <Video className="mr-2.5 h-4 w-4 text-gray-400" />
                    My Rooms
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/settings")}
                    className="cursor-pointer text-gray-300 hover:text-white hover:bg-white/10 focus:bg-white/10 mx-1 rounded-md"
                  >
                    <Settings className="mr-2.5 h-4 w-4 text-gray-400" />
                    Settings
                  </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator className="bg-gray-800" />
                <div className="py-1">
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 mx-1 rounded-md"
                  >
                    <LogOut className="mr-2.5 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSignIn}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={handleSignIn}
                className="relative px-4 py-2 text-sm font-semibold text-white rounded-full overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 blur-lg group-hover:opacity-50 transition-opacity" />
                <span className="relative">Get Started</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

// Navigation Link Component
function NavLink({
  href,
  children,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const router = useRouter();
  const isActive = router.pathname === href;

  return (
    <button
      onClick={() => router.push(href)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all ${
        isActive
          ? "text-white bg-white/10"
          : "text-gray-400 hover:text-white hover:bg-white/5"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}


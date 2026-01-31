import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { api, TokenManager } from "../../../lib/api";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          // Regular login with email/password
          if (!credentials?.email || !credentials?.password) {
            console.error("[NextAuth] Missing credentials");
            return null;
          }

          console.log("[NextAuth] Attempting login for:", credentials.email);
          
          // Backend returns: { success, access_token, refresh_token, user }
          const authResponse = await api.login({
            email: credentials.email,
            password: credentials.password,
          }) as any;

          console.log("[NextAuth] Login response received:", {
            hasAccessToken: !!authResponse?.access_token,
            hasRefreshToken: !!authResponse?.refresh_token,
            hasUser: !!authResponse?.user,
          });

          // Handle backend response structure
          // Backend response: { success, access_token, refresh_token, user }
          const accessToken = authResponse?.access_token;
          const refreshToken = authResponse?.refresh_token;
          const userData = authResponse?.user;

          if (!accessToken || !userData) {
            console.error("[NextAuth] Invalid response structure:", authResponse);
            throw new Error("Invalid response from server");
          }

          // Store tokens in localStorage (client-side only)
          if (typeof window !== "undefined") {
            TokenManager.setTokens(accessToken, refreshToken);
          }

          console.log("[NextAuth] Login successful for user:", userData.email);

          return {
            id: userData.id,
            email: userData.email,
            name: userData.full_name || userData.email.split("@")[0],
            image: userData.profile_photo || "",
            accessToken: accessToken,
            refreshToken: refreshToken,
            isVerified: userData.is_verified ?? true,
            userType: userData.user_type || "admin",
            loginType: userData.login_type || "credential",
          };
        } catch (error: any) {
          // Log the error for debugging
          console.error("[NextAuth] Authorization error:", error);
          console.error("[NextAuth] Error message:", error?.message);
          console.error("[NextAuth] Error response:", error?.response);

          // Check if it's a specific error from our backend
          if (error instanceof Error) {
            // Extract error message from response if available
            let errorMessage = error.message;
            
            const errorWithResponse = error as Error & {
              response?: {
                data?: any;
              };
            };
            
            if (errorWithResponse.response?.data) {
              const errorData = errorWithResponse.response.data;
              // Backend error structure: { success: false, message: "...", error: {...} }
              errorMessage = errorData.message || errorData.error?.message || errorMessage;
              
              // Check for email verification error
              if (errorData.data?.requires_verification || errorMessage.includes("not verified")) {
                // Create a custom error that NextAuth can handle
                const verificationError = new Error(errorMessage) as any;
                verificationError.requiresVerification = true;
                verificationError.email = credentials?.email;
                throw verificationError;
              }
            }

            // Pass through the specific error message from our backend
            // Frontend will catch and display in toast
            throw new Error(errorMessage);
          }

          console.error("[NextAuth] Unknown error type, returning null");
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Handle Google OAuth sign in
      if (account?.provider === "google") {
        try {
          console.log("[NextAuth] Google OAuth sign in:", {
            email: user.email,
            name: user.name,
            image: user.image,
            googleId: account.providerAccountId,
          });

          // Call backend Google OAuth endpoint
          const googleOAuthResponse = await api.googleOAuth({
            email: user.email || "",
            full_name: user.name || user.email?.split("@")[0] || "",
            profile_photo: user.image || "",
            google_id: account.providerAccountId,
          }) as any;

          console.log("[NextAuth] Google OAuth response:", {
            hasAccessToken: !!googleOAuthResponse?.access_token,
            hasRefreshToken: !!googleOAuthResponse?.refresh_token,
            hasUser: !!googleOAuthResponse?.user,
          });

          // Store tokens in localStorage (client-side only)
          if (typeof window !== "undefined") {
            TokenManager.setTokens(
              googleOAuthResponse.access_token,
              googleOAuthResponse.refresh_token
            );
          }

          // Attach tokens and user data to user object for JWT callback
          (user as any).accessToken = googleOAuthResponse.access_token;
          (user as any).refreshToken = googleOAuthResponse.refresh_token;
          user.id = googleOAuthResponse.user?.id || user.id;
          (user as any).isVerified = googleOAuthResponse.user?.is_verified ?? true;
          (user as any).userType = googleOAuthResponse.user?.user_type || "member";
          (user as any).loginType = "google";

          return true;
        } catch (error: any) {
          console.error("[NextAuth] Google OAuth error:", error);
          console.error("[NextAuth] Error message:", error?.message);
          console.error("[NextAuth] Error response:", error?.response);

          // Extract error message
          let errorMessage = error?.message || "Google authentication failed";
          
          if (error?.response?.data) {
            const errorData = error.response.data;
            errorMessage = errorData.message || errorData.error?.message || errorMessage;
          }

          // Check for specific errors
          if (errorMessage.includes("sudah terdaftar dengan email dan password")) {
            throw new Error("AccessDenied");
          }

          throw new Error(errorMessage);
        }
      }

      // Credentials provider - already handled in authorize function
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      // Initial sign in
      if (account && user) {
        // Handle both credentials and Google OAuth
        const accessToken = (user as any).accessToken;
        const refreshToken = (user as any).refreshToken;
        const isVerified = (user as any).isVerified ?? (account.provider === "google" ? true : false);
        const userType = (user as any).userType || "member";
        const loginType = (user as any).loginType || (account.provider === "google" ? "google" : "credential");

        console.log("[NextAuth] JWT callback - Initial sign in:", {
          provider: account.provider,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          loginType,
          userType,
          userId: user.id,
        });

        return {
          ...token,
          sub: user.id,
          accessToken: accessToken || "",
          refreshToken: refreshToken || "",
          isVerified: isVerified,
          userType: userType,
          loginType: loginType,
          image: user.image,
          accessTokenExpires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days (matches backend JWT expiration)
        };
      }

      // Handle session update trigger (when update() is called)
      if (trigger === "update" && token.accessToken) {
        try {
          // Fetch updated user data from backend
          const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "https://zoom.zacloth.com";
          const userResponse = await fetch(`${backendUrl}/api/v1/auth/me`, {
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
            },
          });

          if (userResponse.ok) {
            const userData = await userResponse.json();
            const updatedUser = userData.data?.user || userData.user;
            if (updatedUser) {
              return {
                ...token,
                image: updatedUser.profile_photo || updatedUser.profilePic || token.image,
                // Update name/username if changed
                name: updatedUser.username || updatedUser.full_name || token.name,
              };
            }
          }
        } catch (_error) {
          // Continue with existing token if fetch fails
        }
      }

      // Return previous token if the access token has not expired yet
      if (token.accessTokenExpires && Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Access token has expired, try to update it
      const refreshed = await refreshAccessToken(token);
      
      // Ensure all required JWT fields are present
      return {
        ...token,
        ...refreshed,
        sub: token.sub || "",
      } as typeof token;
    },
    async session({ session, token }) {
      // Log token for debugging
      console.log("[NextAuth] Session callback:", {
        hasAccessToken: !!token.accessToken,
        hasRefreshToken: !!token.refreshToken,
        loginType: token.loginType,
        userType: token.userType,
      });

      if (session.user) {
        session.user.id = token.sub as string;
        // Prioritize token.image over session.user.image
        session.user.image = (token.image as string) || session.user.image || undefined;
        session.user.name = (token.name as string) || session.user.name || "";
        session.user.role = token.userType as string; // Add role alias
        session.user.username = (token.name as string) || session.user.name; // Add username alias
      }
      
      // Ensure tokens are set (fallback to empty string if undefined)
      session.accessToken = (token.accessToken as string) || "";
      session.refreshToken = (token.refreshToken as string) || "";
      session.isVerified = (token.isVerified as boolean) ?? true;
      session.userType = (token.userType as string) || "member";
      session.loginType = (token.loginType as string) || "credential";
      
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
};

async function refreshAccessToken(token: {
  refreshToken?: string;
  accessTokenExpires?: number;
  [key: string]: unknown;
}) {
  try {
    if (!token.refreshToken) {
      return {
        ...token,
        error: "RefreshAccessTokenError",
      };
    }

    // Backend might not have refresh token endpoint, so try to refresh
    // If it fails, return error to force re-login
    try {
      const refreshedTokens = await api.refreshToken(token.refreshToken) as any;

      if (!refreshedTokens || !refreshedTokens.access_token) {
        return {
          ...token,
          error: "RefreshAccessTokenError",
        };
      }

      return {
        ...token,
        accessToken: refreshedTokens.access_token,
        accessTokenExpires: Date.now() + (refreshedTokens.expires_in || 7 * 24 * 60 * 60) * 1000,
        refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
        isVerified: refreshedTokens.user?.is_verified ?? token.isVerified ?? true,
        userType: refreshedTokens.user?.user_type ?? token.userType ?? "admin",
        loginType: refreshedTokens.user?.login_type ?? token.loginType ?? "credential",
        image: refreshedTokens.user?.profile_photo || token.image || "",
      };
    } catch (_refreshError) {
      // If refresh fails, return error to force re-login
      return {
        ...token,
        error: "RefreshAccessTokenError",
      };
    }
  } catch (_error) {
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export default NextAuth(authOptions);
// Joblane Configuration Package
// Shared configuration utilities and types

export interface AppConfig {
  appName: string
  appEnv: string
  appDebug: boolean
  apiUrl: string
  webUrl: string
  session: {
    cookieName: string
    ttlSeconds: number
    secure: boolean
    sameSite: "lax" | "strict" | "none"
  }
  cors: {
    allowedOrigins: string[]
  }
}

export const defaultConfig: AppConfig = {
  appName: "Joblane",
  appEnv: "development",
  appDebug: true,
  apiUrl: "http://localhost:8000",
  webUrl: "http://localhost:1111",
  session: {
    cookieName: "joblane_session",
    ttlSeconds: 604800, // 7 days
    secure: false,
    sameSite: "lax",
  },
  cors: {
    allowedOrigins: ["http://localhost:1111", "http://localhost:8000"],
  },
}

export function getConfig(): AppConfig {
  // In a real app, this would read from environment variables
  return defaultConfig
}
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  // Add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
  readonly hot?: {
    accept: (cb?: (mod: any) => void) => void
    dispose: (cb: (data: any) => void) => void
    data: any
  }
}

/**
 * TypeScript type definitions for @microlink/cli
 * Interacting with Microlink API from your terminal.
 */

export interface CliFlags {
  apiKey?: string
  pretty?: boolean
  color?: boolean
  copy?: boolean
  endpoint?: string
  [key: string]: unknown
}

export interface CliResult {
  flags: CliFlags
  input: string[]
  showHelp: () => void
}

export interface ApiResponse {
  response: {
    headers: Record<string, string>
    timings: { phases: { total: number } }
    requestUrl: string
    body: Buffer | string
    [key: string]: unknown
  }
  flags: {
    copy?: boolean
    pretty?: boolean
  }
}

export interface MicrolinkCli {
  cli: () => CliResult
  api: (cli: CliResult, gotOpts?: unknown) => Promise<void>
  exit: (promise: Promise<unknown>, cli: CliResult) => Promise<void>
  print: {
    spinner: () => {
      start: () => void
      stop: () => void
    }
    json: (payload: unknown, options?: { color?: boolean }) => void
    label: (text: string, color: string) => string
    bytes: (bytes: number) => string
    keyValue: (key: string, value: string) => string
    image: (filepath: string) => void
    link: (text: string, url: string) => string
  }
}

declare const microlink: MicrolinkCli

export default microlink

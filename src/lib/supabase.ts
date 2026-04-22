import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const invoiceImagesBucket = "invoice-images"
const supabaseProjectRef = supabaseUrl ? new URL(supabaseUrl).hostname.split(".")[0] : null
const supabaseStoragePrefix = supabaseProjectRef ? `sb-${supabaseProjectRef}-` : null

export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables."
    : null

const missingConfigClient = new Proxy(
  {},
  {
    get() {
      throw new Error(supabaseConfigError ?? "Supabase client is not configured.")
    },
  },
)

export const supabase = supabaseConfigError
  ? (missingConfigClient as ReturnType<typeof createClient>)
  : createClient(supabaseUrl, supabaseAnonKey)

export function clearSupabaseBrowserState() {
  if (typeof window === "undefined" || !supabaseStoragePrefix) {
    return
  }

  const keysToRemove: string[] = []
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (key?.startsWith(supabaseStoragePrefix)) {
      keysToRemove.push(key)
    }
  }

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key)
  }
}

function getFileExtension(file: File) {
  const extFromName = file.name.split(".").pop()?.toLowerCase()
  if (extFromName) {
    return extFromName
  }

  const mime = file.type.split("/").pop()?.toLowerCase()
  return mime || "jpg"
}

function sanitizeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
}

export function extractStoragePathFromUrl(publicUrl: string | null | undefined) {
  if (!publicUrl) {
    return null
  }

  const marker = `/storage/v1/object/public/${invoiceImagesBucket}/`
  const markerIndex = publicUrl.indexOf(marker)
  if (markerIndex === -1) {
    return null
  }

  return publicUrl.slice(markerIndex + marker.length)
}

export async function uploadInvoiceImage(file: File, invoiceNumber?: string) {
  const extension = getFileExtension(file)
  const fileNameBase = sanitizeSegment(invoiceNumber || "invoice")
  const path = `${new Date().getUTCFullYear()}/${Date.now()}-${fileNameBase}.${extension}`

  const { error } = await supabase.storage
    .from(invoiceImagesBucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from(invoiceImagesBucket).getPublicUrl(path)

  return {
    path,
    publicUrl: data.publicUrl,
  }
}

export async function deleteInvoiceImageByUrl(publicUrl: string | null | undefined) {
  const path = extractStoragePathFromUrl(publicUrl)
  if (!path) {
    return
  }

  const { error } = await supabase.storage.from(invoiceImagesBucket).remove([path])
  if (error) {
    throw error
  }
}

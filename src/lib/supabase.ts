import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const invoiceImagesBucket = "invoice-images";

export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables."
    : null;

const missingConfigClient = new Proxy(
  {},
  {
    get() {
      throw new Error(supabaseConfigError ?? "Supabase client is not configured.");
    },
  },
);

export const supabase = supabaseConfigError
  ? (missingConfigClient as ReturnType<typeof createClient>)
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });

function getFileExtension(file: File) {
  const extFromName = file.name.split(".").pop()?.toLowerCase();
  if (extFromName) {
    return extFromName;
  }

  const mime = file.type.split("/").pop()?.toLowerCase();
  return mime || "jpg";
}

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeStoragePath(value: string) {
  return value.replace(/^\/+/, "").replace(/[?#].*$/, "");
}

function tryParseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function extractStoragePathFromUrl(pathOrUrl: string | null | undefined) {
  if (!pathOrUrl) {
    return null;
  }

  const parsedUrl = tryParseUrl(pathOrUrl);
  if (!parsedUrl) {
    return normalizeStoragePath(pathOrUrl);
  }

  const decodedPath = decodeURIComponent(parsedUrl.pathname);
  const markers = [
    `/storage/v1/object/public/${invoiceImagesBucket}/`,
    `/storage/v1/object/sign/${invoiceImagesBucket}/`,
  ];

  for (const marker of markers) {
    const markerIndex = decodedPath.indexOf(marker);
    if (markerIndex !== -1) {
      return normalizeStoragePath(decodedPath.slice(markerIndex + marker.length));
    }
  }

  return null;
}

export function resolveInvoiceImagePath(pathOrUrl: string | null | undefined) {
  return extractStoragePathFromUrl(pathOrUrl);
}

export async function createSignedInvoiceImageUrls(pathsOrUrls: Array<string | null | undefined>, expiresIn = 3600) {
  const uniquePaths = Array.from(
    new Set(
      pathsOrUrls
        .map((value) => resolveInvoiceImagePath(value))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (!uniquePaths.length) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase.storage
    .from(invoiceImagesBucket)
    .createSignedUrls(uniquePaths, expiresIn);

  if (error) {
    throw error;
  }

  const urlsByPath = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.signedUrl) {
      urlsByPath.set(item.path, item.signedUrl);
    }
  }

  return urlsByPath;
}

export async function createSignedInvoiceImageUrl(pathOrUrl: string | null | undefined, expiresIn = 3600) {
  const resolvedPath = resolveInvoiceImagePath(pathOrUrl);
  if (!resolvedPath) {
    return null;
  }

  const urlsByPath = await createSignedInvoiceImageUrls([resolvedPath], expiresIn);
  return urlsByPath.get(resolvedPath) ?? null;
}

export async function uploadInvoiceImage(
  file: File,
  invoiceNumber?: string,
  projectId?: number | null,
) {
  const extension = getFileExtension(file);
  const fileNameBase = sanitizeSegment(invoiceNumber || "invoice") || "invoice";
  const scopePrefix = projectId != null ? `project-${projectId}` : "shared";
  const path = `${scopePrefix}/${new Date().getUTCFullYear()}/${Date.now()}-${fileNameBase}.${extension}`;

  const { error } = await supabase.storage
    .from(invoiceImagesBucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (error) {
    throw error;
  }

  return {
    path,
  };
}

export async function deleteInvoiceImageByUrl(pathOrUrl: string | null | undefined) {
  const path = resolveInvoiceImagePath(pathOrUrl);
  if (!path) {
    return;
  }

  const { error } = await supabase.storage.from(invoiceImagesBucket).remove([path]);
  if (error) {
    throw error;
  }
}

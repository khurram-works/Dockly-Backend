import supabase from '../config/supabase'

// ─────────────────────────────────────────────
// uploadToSupabase
// Same as uploadToR2 before — just different provider
// ─────────────────────────────────────────────
export const uploadToSupabase = async (
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<string> => {

  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET_NAME!)
    // .from() = which bucket
    .upload(key, buffer, {
      contentType: mimeType,
      upsert: false
      // upsert: false = don't overwrite if file already exists
      // will throw error instead — safer behavior
    })

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`)
  }

  // Get the public URL for this file
  const { data: urlData } = supabase.storage
    .from(process.env.SUPABASE_BUCKET_NAME!)
    .getPublicUrl(key)

  return urlData.publicUrl
  // Returns something like:
  // "https://yourproject.supabase.co/storage/v1/object/public/documents/..."
}

// ─────────────────────────────────────────────
// deleteFromSupabase
// Same concept as deleteFromR2
// ─────────────────────────────────────────────
export const deleteFromSupabase = async (key: string): Promise<void> => {
  const { error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET_NAME!)
    .remove([key])
  // .remove() takes an array — you can delete multiple files at once

  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`)
  }
}

// ─────────────────────────────────────────────
// generateStorageKey — exactly the same as before
// ─────────────────────────────────────────────
export const generateStorageKey = (
  companyId: string,
  documentId: string,
  filename: string
): string => {
  const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${companyId}/${documentId}/${cleanFilename}`
}
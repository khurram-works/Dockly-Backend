import supabase from '../config/supabase'

export const uploadToSupabase = async (
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<string> => {

  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET_NAME!)
 
    .upload(key, buffer, {
      contentType: mimeType,
      upsert: false
    })

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`)
  }


  const { data: urlData } = supabase.storage
    .from(process.env.SUPABASE_BUCKET_NAME!)
    .getPublicUrl(key)
  return urlData.publicUrl
  
}


export const deleteFromSupabase = async (key: string): Promise<void> => {
  const { error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET_NAME!)
    .remove([key])
  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`)
  }
}


export const generateStorageKey = (
  companyId: string,
  documentId: string,
  filename: string
): string => {
  const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${companyId}/${documentId}/${cleanFilename}`
}
import supabase from '../config/supabase'

export const uploadToSupabase = async (
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<string> => {
  const bucket = process.env.SUPABASE_BUCKET_NAME!;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(key, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  if (process.env.SUPABASE_USE_SIGNED_URL === "true") {
    const { data: signedData, error: signedError } =
      await supabase.storage.from(bucket).createSignedUrl(key, 3600);

    if (signedError) {
      throw new Error(`Signed URL creation failed: ${signedError.message}`);
    }

    return signedData.signedUrl;
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(key);


  return urlData.publicUrl;
};


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
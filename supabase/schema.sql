-- 1. Buat tabel todos
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid() NOT NULL,
  title TEXT NOT NULL,
  is_complete BOOLEAN DEFAULT false NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Jika tabel todos sudah ada sebelumnya, tambahkan kolom image_url:
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Aktifkan Row Level Security (RLS) pada tabel todos
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- 3. Kebijakan RLS agar user hanya bisa membaca, membuat, mengedit, dan menghapus todonya sendiri
CREATE POLICY "Users can view their own todos"
  ON public.todos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own todos"
  ON public.todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own todos"
  ON public.todos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own todos"
  ON public.todos FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================================
-- KONFIGURASI SUPABASE STORAGE (Bucket: todo-images)
-- ================================================================

-- 4. Buat Storage Bucket publik bernama 'todo-images'
INSERT INTO storage.buckets (id, name, public)
VALUES ('todo-images', 'todo-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 5. Kebijakan RLS Storage: User terautentikasi dapat mengunggah ke foldernya sendiri (folder nama = user_id)
CREATE POLICY "Authenticated users can upload todo images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'todo-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 6. Kebijakan RLS Storage: Siapa saja dapat melihat gambar publik
CREATE POLICY "Anyone can view todo images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'todo-images');

-- 7. Kebijakan RLS Storage: User dapat menghapus gambarnya sendiri
CREATE POLICY "Users can delete their own todo images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'todo-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

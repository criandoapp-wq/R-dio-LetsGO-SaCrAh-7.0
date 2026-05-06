-- Migration file for Supabase
-- Run this in your Supabase SQL Editor to set up the messages table

-- Create the messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    "user" TEXT NOT NULL,
    text TEXT NOT NULL,
    user_id TEXT
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read messages
CREATE POLICY "Allow public read access"
ON public.messages
FOR SELECT
USING (true);

-- Allow anyone to insert messages (for this broadcast app)
-- In a production app, you might want to restrict this to authenticated users
CREATE POLICY "Allow anyone to insert"
ON public.messages
FOR INSERT
WITH CHECK (true);

-- Enable real-time for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

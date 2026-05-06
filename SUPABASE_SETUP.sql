-- Execute este comando no seu Supabase SQL Editor para criar a tabela necessária para o chat:

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "user" TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Realtime para a tabela de mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Configurar Políticas de Segurança (RLS) - Permite que qualquer um leia e insira (ajuste conforme necessário)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON messages FOR INSERT WITH CHECK (true);

-- Digital Twin MVP Database Schema

-- Users table (candidates only for MVP)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'candidate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Twins table (the digital twin profiles)
CREATE TABLE twins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  years_experience INTEGER NOT NULL,
  skills TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT NOT NULL,
  cv_url TEXT,
  public_slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Twin answers (Q&A for style capture)
CREATE TABLE twin_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id UUID NOT NULL REFERENCES twins(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions (employer test sessions)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id UUID NOT NULL REFERENCES twins(id) ON DELETE CASCADE,
  employer_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Session messages (chat history)
CREATE TABLE session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('employer', 'twin')),
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Session feedback (end of session ratings)
CREATE TABLE session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_twins_user_id ON twins(user_id);
CREATE INDEX idx_twins_public_slug ON twins(public_slug);
CREATE INDEX idx_twin_answers_twin_id ON twin_answers(twin_id);
CREATE INDEX idx_sessions_twin_id ON sessions(twin_id);
CREATE INDEX idx_session_messages_session_id ON session_messages(session_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE twins ENABLE ROW LEVEL SECURITY;
ALTER TABLE twin_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: users can only read/update their own record
CREATE POLICY "Users can view own record" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own record" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Twins: users can CRUD their own twins, anyone can view by slug
CREATE POLICY "Users can view own twins" ON twins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view twins by slug" ON twins
  FOR SELECT USING (true);

CREATE POLICY "Users can create own twins" ON twins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own twins" ON twins
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own twins" ON twins
  FOR DELETE USING (auth.uid() = user_id);

-- Twin answers: same as twins
CREATE POLICY "Users can view own twin answers" ON twin_answers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM twins WHERE twins.id = twin_answers.twin_id AND twins.user_id = auth.uid())
  );

CREATE POLICY "Anyone can view twin answers for public twins" ON twin_answers
  FOR SELECT USING (true);

CREATE POLICY "Users can create twin answers" ON twin_answers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM twins WHERE twins.id = twin_answers.twin_id AND twins.user_id = auth.uid())
  );

CREATE POLICY "Users can update own twin answers" ON twin_answers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM twins WHERE twins.id = twin_answers.twin_id AND twins.user_id = auth.uid())
  );

-- Sessions: anyone can create and view sessions for public twins
CREATE POLICY "Anyone can create sessions" ON sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view sessions" ON sessions
  FOR SELECT USING (true);

-- Session messages: anyone can create and view messages
CREATE POLICY "Anyone can create session messages" ON session_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view session messages" ON session_messages
  FOR SELECT USING (true);

-- Session feedback: anyone can create and view feedback
CREATE POLICY "Anyone can create feedback" ON session_feedback
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view feedback" ON session_feedback
  FOR SELECT USING (true);

-- Function to create user record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user record
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


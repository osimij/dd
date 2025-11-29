export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: string
          created_at?: string
        }
      }
      twins: {
        Row: {
          id: string
          user_id: string
          name: string
          role_title: string
          years_experience: number
          skills: string[]
          bio: string
          cv_url: string | null
          public_slug: string
          elevenlabs_voice_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          role_title: string
          years_experience: number
          skills: string[]
          bio: string
          cv_url?: string | null
          public_slug: string
          elevenlabs_voice_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          role_title?: string
          years_experience?: number
          skills?: string[]
          bio?: string
          cv_url?: string | null
          public_slug?: string
          elevenlabs_voice_id?: string | null
          created_at?: string
        }
      }
      twin_answers: {
        Row: {
          id: string
          twin_id: string
          question_type: string
          question_text: string
          answer_text: string
          created_at: string
        }
        Insert: {
          id?: string
          twin_id: string
          question_type: string
          question_text: string
          answer_text: string
          created_at?: string
        }
        Update: {
          id?: string
          twin_id?: string
          question_type?: string
          question_text?: string
          answer_text?: string
          created_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          twin_id: string
          employer_name: string
          created_at: string
        }
        Insert: {
          id?: string
          twin_id: string
          employer_name: string
          created_at?: string
        }
        Update: {
          id?: string
          twin_id?: string
          employer_name?: string
          created_at?: string
        }
      }
      session_messages: {
        Row: {
          id: string
          session_id: string
          sender: string
          message_text: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          sender: string
          message_text: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          sender?: string
          message_text?: string
          created_at?: string
        }
      }
      session_feedback: {
        Row: {
          id: string
          session_id: string
          rating: number
          comment_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          rating: number
          comment_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          rating?: number
          comment_text?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}


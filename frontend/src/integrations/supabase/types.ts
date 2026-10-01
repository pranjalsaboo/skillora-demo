export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      challenge_overrides: {
        Row: {
          day: string
          question_ids: string[]
        }
        Insert: {
          day: string
          question_ids: string[]
        }
        Update: {
          day?: string
          question_ids?: string[]
        }
        Relationships: []
      }
      challenge_settings: {
        Row: {
          id: number
          perfect_bonus: number
          points_per_correct: number
        }
        Insert: {
          id?: number
          perfect_bonus?: number
          points_per_correct?: number
        }
        Update: {
          id?: number
          perfect_bonus?: number
          points_per_correct?: number
        }
        Relationships: []
      }
      community_cheers: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_cheers_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_name: string
          body: string
          created_at: string
          hidden: boolean
          id: string
          kind: string
          report_count: number
          user_id: string
        }
        Insert: {
          author_name: string
          body: string
          created_at?: string
          hidden?: boolean
          id?: string
          kind?: string
          report_count?: number
          user_id: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          hidden?: boolean
          id?: string
          kind?: string
          report_count?: number
          user_id?: string
        }
        Relationships: []
      }
      community_reports: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_challenge_results: {
        Row: {
          correct: number
          created_at: string
          day: string
          points: number
          total: number
          user_id: string
        }
        Insert: {
          correct: number
          created_at?: string
          day: string
          points: number
          total: number
          user_id: string
        }
        Update: {
          correct?: number
          created_at?: string
          day?: string
          points?: number
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      league_members: {
        Row: {
          badges: string[]
          challenge_points: number
          challenge_streak: number
          display_name: string
          last_challenge_day: string | null
          updated_at: string
          user_id: string
          weekly_xp: number
        }
        Insert: {
          badges?: string[]
          challenge_points?: number
          challenge_streak?: number
          display_name: string
          last_challenge_day?: string | null
          updated_at?: string
          user_id: string
          weekly_xp?: number
        }
        Update: {
          badges?: string[]
          challenge_points?: number
          challenge_streak?: number
          display_name?: string
          last_challenge_day?: string | null
          updated_at?: string
          user_id?: string
          weekly_xp?: number
        }
        Relationships: []
      }
      learner_progress: {
        Row: {
          state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          state?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_cards: {
        Row: {
          data: Json
          id: string
          lesson_id: string
          position: number
        }
        Insert: {
          data: Json
          id?: string
          lesson_id: string
          position?: number
        }
        Update: {
          data?: Json
          id?: string
          lesson_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_cards_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_questions: {
        Row: {
          data: Json
          id: string
          lesson_id: string
          position: number
        }
        Insert: {
          data: Json
          id?: string
          lesson_id: string
          position?: number
        }
        Update: {
          data?: Json
          id?: string
          lesson_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          id: string
          minutes: number
          position: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          summary: string
          title: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          id: string
          minutes?: number
          position?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary?: string
          title: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          minutes?: number
          position?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary?: string
          title?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          accent: string
          archived: boolean
          blurb: string
          id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          accent?: string
          archived?: boolean
          blurb?: string
          id: string
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          accent?: string
          archived?: boolean
          blurb?: string
          id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "editor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "editor"],
    },
  },
} as const

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      action_items: {
        Row: {
          carried_from_retro_id: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          owner_name: string | null
          retro_id: string
          status: string
        }
        Insert: {
          carried_from_retro_id?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          owner_name?: string | null
          retro_id: string
          status?: string
        }
        Update: {
          carried_from_retro_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          owner_name?: string | null
          retro_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_items_carried_from_retro_id_fkey"
            columns: ["carried_from_retro_id"]
            isOneToOne: false
            referencedRelation: "retros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_retro_id_fkey"
            columns: ["retro_id"]
            isOneToOne: false
            referencedRelation: "retros"
            referencedColumns: ["id"]
          },
        ]
      }
      attribution_access_log: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          reason_text: string
          retro_id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          reason_text: string
          retro_id: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          reason_text?: string
          retro_id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribution_access_log_retro_id_fkey"
            columns: ["retro_id"]
            isOneToOne: false
            referencedRelation: "retros"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_turns: {
        Row: {
          answer_mode: string
          answer_quality: string | null
          answer_text: string | null
          audio_url: string | null
          created_at: string
          id: string
          marked_sensitive: boolean
          participant_id: string
          probe_type: string | null
          question_text: string
          sequence: number
          spine_area: number | null
          was_probe: boolean
        }
        Insert: {
          answer_mode?: string
          answer_quality?: string | null
          answer_text?: string | null
          audio_url?: string | null
          created_at?: string
          id?: string
          marked_sensitive?: boolean
          participant_id: string
          probe_type?: string | null
          question_text: string
          sequence: number
          spine_area?: number | null
          was_probe?: boolean
        }
        Update: {
          answer_mode?: string
          answer_quality?: string | null
          answer_text?: string | null
          audio_url?: string | null
          created_at?: string
          id?: string
          marked_sensitive?: boolean
          participant_id?: string
          probe_type?: string | null
          question_text?: string
          sequence?: number
          spine_area?: number | null
          was_probe?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "interview_turns_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_intake_turns: {
        Row: {
          answer_mode: string
          answer_text: string | null
          audio_url: string | null
          created_at: string
          id: string
          question_text: string
          retro_id: string
          sequence: number
        }
        Insert: {
          answer_mode?: string
          answer_text?: string | null
          audio_url?: string | null
          created_at?: string
          id?: string
          question_text: string
          retro_id: string
          sequence: number
        }
        Update: {
          answer_mode?: string
          answer_text?: string | null
          audio_url?: string | null
          created_at?: string
          id?: string
          question_text?: string
          retro_id?: string
          sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "organizer_intake_turns_retro_id_fkey"
            columns: ["retro_id"]
            isOneToOne: false
            referencedRelation: "retros"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          completed_at: string | null
          completeness_score: number | null
          created_at: string
          email: string
          id: string
          invite_token: string
          low_completeness_flag: boolean
          name: string
          retro_id: string
          role_at_event: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          completeness_score?: number | null
          created_at?: string
          email: string
          id?: string
          invite_token?: string
          low_completeness_flag?: boolean
          name: string
          retro_id: string
          role_at_event?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          completeness_score?: number | null
          created_at?: string
          email?: string
          id?: string
          invite_token?: string
          low_completeness_flag?: boolean
          name?: string
          retro_id?: string
          role_at_event?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_retro_id_fkey"
            columns: ["retro_id"]
            isOneToOne: false
            referencedRelation: "retros"
            referencedColumns: ["id"]
          },
        ]
      }
      question_sets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          generated_probes: Json
          id: string
          organizer_edited_probes: Json | null
          retro_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          generated_probes?: Json
          id?: string
          organizer_edited_probes?: Json | null
          retro_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          generated_probes?: Json
          id?: string
          organizer_edited_probes?: Json | null
          retro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_sets_retro_id_fkey"
            columns: ["retro_id"]
            isOneToOne: false
            referencedRelation: "retros"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          generated_at: string
          id: string
          retro_id: string
          synthesis_json: Json
          version: number
        }
        Insert: {
          generated_at?: string
          id?: string
          retro_id: string
          synthesis_json: Json
          version?: number
        }
        Update: {
          generated_at?: string
          id?: string
          retro_id?: string
          synthesis_json?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "reports_retro_id_fkey"
            columns: ["retro_id"]
            isOneToOne: false
            referencedRelation: "retros"
            referencedColumns: ["id"]
          },
        ]
      }
      retro_admins: {
        Row: {
          created_at: string
          id: string
          retro_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          retro_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          retro_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "retro_admins_retro_id_fkey"
            columns: ["retro_id"]
            isOneToOne: false
            referencedRelation: "retros"
            referencedColumns: ["id"]
          },
        ]
      }
      retro_metrics: {
        Row: {
          created_at: string
          id: string
          label: string
          notes: string | null
          prior_year_value: string | null
          retro_id: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          notes?: string | null
          prior_year_value?: string | null
          retro_id: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          notes?: string | null
          prior_year_value?: string | null
          retro_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retro_metrics_retro_id_fkey"
            columns: ["retro_id"]
            isOneToOne: false
            referencedRelation: "retros"
            referencedColumns: ["id"]
          },
        ]
      }
      retros: {
        Row: {
          created_at: string
          created_by: string
          event_date: string | null
          id: string
          intake_summary: Json | null
          interview_deadline: string | null
          join_token: string
          name: string
          previous_retro_id: string | null
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          event_date?: string | null
          id?: string
          intake_summary?: Json | null
          interview_deadline?: string | null
          join_token?: string
          name: string
          previous_retro_id?: string | null
          status?: string
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          event_date?: string | null
          id?: string
          intake_summary?: Json | null
          interview_deadline?: string | null
          join_token?: string
          name?: string
          previous_retro_id?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "retros_previous_retro_id_fkey"
            columns: ["previous_retro_id"]
            isOneToOne: false
            referencedRelation: "retros"
            referencedColumns: ["id"]
          },
        ]
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
    Enums: {},
  },
} as const

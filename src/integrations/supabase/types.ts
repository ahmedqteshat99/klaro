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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_events: {
        Row: {
          created_at: string
          id: number
          meta: Json | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          meta?: Json | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          meta?: Json | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      certifications: {
        Row: {
          aussteller: string | null
          created_at: string
          datum: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aussteller?: string | null
          created_at?: string
          datum?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aussteller?: string | null
          created_at?: string
          datum?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_versions: {
        Row: {
          applied: boolean | null
          applied_date: string | null
          created_at: string
          department_or_specialty: string | null
          hospital_name: string | null
          html_content: string
          id: string
          input_snapshot: Json | null
          job_url: string | null
          name: string
          position_title: string | null
          show_foto: boolean | null
          show_signatur: boolean | null
          typ: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied?: boolean | null
          applied_date?: string | null
          created_at?: string
          department_or_specialty?: string | null
          hospital_name?: string | null
          html_content: string
          id?: string
          input_snapshot?: Json | null
          job_url?: string | null
          name: string
          position_title?: string | null
          show_foto?: boolean | null
          show_signatur?: boolean | null
          typ: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied?: boolean | null
          applied_date?: string | null
          created_at?: string
          department_or_specialty?: string | null
          hospital_name?: string | null
          html_content?: string
          id?: string
          input_snapshot?: Json | null
          job_url?: string | null
          name?: string
          position_title?: string | null
          show_foto?: boolean | null
          show_signatur?: boolean | null
          typ?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      education_entries: {
        Row: {
          abschluss: string | null
          abschlussarbeit: string | null
          created_at: string
          id: string
          universitaet: string
          updated_at: string
          user_id: string
          zeitraum_bis: string | null
          zeitraum_von: string | null
        }
        Insert: {
          abschluss?: string | null
          abschlussarbeit?: string | null
          created_at?: string
          id?: string
          universitaet: string
          updated_at?: string
          user_id: string
          zeitraum_bis?: string | null
          zeitraum_von?: string | null
        }
        Update: {
          abschluss?: string | null
          abschlussarbeit?: string | null
          created_at?: string
          id?: string
          universitaet?: string
          updated_at?: string
          user_id?: string
          zeitraum_bis?: string | null
          zeitraum_von?: string | null
        }
        Relationships: []
      }
      practical_experiences: {
        Row: {
          beschreibung: string | null
          created_at: string
          einrichtung: string
          fachbereich: string | null
          id: string
          typ: string | null
          updated_at: string
          user_id: string
          zeitraum_bis: string | null
          zeitraum_von: string | null
        }
        Insert: {
          beschreibung?: string | null
          created_at?: string
          einrichtung: string
          fachbereich?: string | null
          id?: string
          typ?: string | null
          updated_at?: string
          user_id: string
          zeitraum_bis?: string | null
          zeitraum_von?: string | null
        }
        Update: {
          beschreibung?: string | null
          created_at?: string
          einrichtung?: string
          fachbereich?: string | null
          id?: string
          typ?: string | null
          updated_at?: string
          user_id?: string
          zeitraum_bis?: string | null
          zeitraum_von?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_notes: string | null
          approbationsstatus: string | null
          berufserfahrung_jahre: number | null
          created_at: string
          cv_text: string | null
          deutschniveau: string | null
          dsgvo_einwilligung: boolean | null
          dsgvo_einwilligung_datum: string | null
          edv_kenntnisse: string[] | null
          email: string | null
          fachrichtung: string | null
          familienstand: string | null
          foto_url: string | null
          geburtsdatum: string | null
          id: string
          interessen: string | null
          last_seen_at: string | null
          medizinische_kenntnisse: string[] | null
          nachname: string
          role: string
          share_consent: boolean | null
          share_consent_at: string | null
          signatur_url: string | null
          sprachkenntnisse: string[] | null
          staatsangehoerigkeit: string | null
          stadt: string | null
          telefon: string | null
          updated_at: string
          user_id: string
          visibility_status: string | null
          vorname: string
        }
        Insert: {
          admin_notes?: string | null
          approbationsstatus?: string | null
          berufserfahrung_jahre?: number | null
          created_at?: string
          cv_text?: string | null
          deutschniveau?: string | null
          dsgvo_einwilligung?: boolean | null
          dsgvo_einwilligung_datum?: string | null
          edv_kenntnisse?: string[] | null
          email?: string | null
          fachrichtung?: string | null
          familienstand?: string | null
          foto_url?: string | null
          geburtsdatum?: string | null
          id?: string
          interessen?: string | null
          last_seen_at?: string | null
          medizinische_kenntnisse?: string[] | null
          nachname: string
          role?: string
          share_consent?: boolean | null
          share_consent_at?: string | null
          signatur_url?: string | null
          sprachkenntnisse?: string[] | null
          staatsangehoerigkeit?: string | null
          stadt?: string | null
          telefon?: string | null
          updated_at?: string
          user_id: string
          visibility_status?: string | null
          vorname: string
        }
        Update: {
          admin_notes?: string | null
          approbationsstatus?: string | null
          berufserfahrung_jahre?: number | null
          created_at?: string
          cv_text?: string | null
          deutschniveau?: string | null
          dsgvo_einwilligung?: boolean | null
          dsgvo_einwilligung_datum?: string | null
          edv_kenntnisse?: string[] | null
          email?: string | null
          fachrichtung?: string | null
          familienstand?: string | null
          foto_url?: string | null
          geburtsdatum?: string | null
          id?: string
          interessen?: string | null
          last_seen_at?: string | null
          medizinische_kenntnisse?: string[] | null
          nachname?: string
          role?: string
          share_consent?: boolean | null
          share_consent_at?: string | null
          signatur_url?: string | null
          sprachkenntnisse?: string[] | null
          staatsangehoerigkeit?: string | null
          stadt?: string | null
          telefon?: string | null
          updated_at?: string
          user_id?: string
          visibility_status?: string | null
          vorname?: string
        }
        Relationships: []
      }
      publications: {
        Row: {
          beschreibung: string | null
          created_at: string
          datum: string | null
          id: string
          journal_ort: string | null
          titel: string
          typ: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          beschreibung?: string | null
          created_at?: string
          datum?: string | null
          id?: string
          journal_ort?: string | null
          titel: string
          typ?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          beschreibung?: string | null
          created_at?: string
          datum?: string | null
          id?: string
          journal_ort?: string | null
          titel?: string
          typ?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      work_experiences: {
        Row: {
          created_at: string
          id: string
          klinik: string
          station: string | null
          taetigkeiten: string | null
          updated_at: string
          user_id: string
          zeitraum_bis: string | null
          zeitraum_von: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          klinik: string
          station?: string | null
          taetigkeiten?: string | null
          updated_at?: string
          user_id: string
          zeitraum_bis?: string | null
          zeitraum_von?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          klinik?: string
          station?: string | null
          taetigkeiten?: string | null
          updated_at?: string
          user_id?: string
          zeitraum_bis?: string | null
          zeitraum_von?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: []
      }
      candidate_share_requests: {
        Row: {
          id: string
          candidate_user_id: string
          hospital_id: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          candidate_user_id: string
          hospital_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          candidate_user_id?: string
          hospital_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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

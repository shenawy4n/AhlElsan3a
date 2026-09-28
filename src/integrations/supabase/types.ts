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
      admin_users: {
        Row: {
          active: boolean
          added_by_email: string | null
          created_at: string
          email: string
          id: string
          is_owner: boolean
        }
        Insert: {
          active?: boolean
          added_by_email?: string | null
          created_at?: string
          email: string
          id?: string
          is_owner?: boolean
        }
        Update: {
          active?: boolean
          added_by_email?: string | null
          created_at?: string
          email?: string
          id?: string
          is_owner?: boolean
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          category_id: string | null
          created_at: string
          event_type: string
          id: string
          provider_id: string | null
          query: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          provider_id?: string | null
          query?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          provider_id?: string | null
          query?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      areas: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          admin_email: string | null
          admin_id: string | null
          created_at: string
          id: string
          target: string | null
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string
          id?: string
          target?: string | null
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string
          id?: string
          target?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          sort_order: number
          status: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          sort_order?: number
          status?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number
          status?: string
        }
        Relationships: []
      }
      experience_options: {
        Row: {
          created_at: string
          id: string
          label: string
          sort_order: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          status?: string
        }
        Relationships: []
      }
      provider_applications: {
        Row: {
          area_id: string
          category_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          phone: string
          provider_id: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          services: string | null
          status: string
          whatsapp: string | null
        }
        Insert: {
          area_id: string
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          phone: string
          provider_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          services?: string | null
          status?: string
          whatsapp?: string | null
        }
        Update: {
          area_id?: string
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          phone?: string
          provider_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          services?: string | null
          status?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_applications_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_applications_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_applications_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          area_id: string
          category_id: string
          created_at: string
          description: string | null
          experience_id: string | null
          has_whatsapp: boolean | null
          has_workshop: boolean | null
          id: string
          is_emergency_24h: boolean | null
          is_premium: boolean
          is_verified: boolean
          name: string
          phone: string
          photo_url: string | null
          premium_expires_at: string | null
          price_description: string | null
          secondary_phone: string | null
          services: string | null
          status: string
          updated_at: string
          whatsapp: string | null
          working_hours: string | null
          working_hours_structured: Json | null
          workshop_address: string | null
          workshop_name: string | null
        }
        Insert: {
          area_id: string
          category_id: string
          created_at?: string
          description?: string | null
          experience_id?: string | null
          has_whatsapp?: boolean | null
          has_workshop?: boolean | null
          id?: string
          is_emergency_24h?: boolean | null
          is_premium?: boolean
          is_verified?: boolean
          name: string
          phone: string
          photo_url?: string | null
          premium_expires_at?: string | null
          price_description?: string | null
          secondary_phone?: string | null
          services?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
          working_hours?: string | null
          working_hours_structured?: Json | null
          workshop_address?: string | null
          workshop_name?: string | null
        }
        Update: {
          area_id?: string
          category_id?: string
          created_at?: string
          description?: string | null
          experience_id?: string | null
          has_whatsapp?: boolean | null
          has_workshop?: boolean | null
          id?: string
          is_emergency_24h?: boolean | null
          is_premium?: boolean
          is_verified?: boolean
          name?: string
          phone?: string
          photo_url?: string | null
          premium_expires_at?: string | null
          price_description?: string | null
          secondary_phone?: string | null
          services?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
          working_hours?: string | null
          working_hours_structured?: Json | null
          workshop_address?: string | null
          workshop_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "providers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "providers_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experience_options"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_events: {
        Row: {
          created_at: string
          form_type: string
          id: string
          ip: string
        }
        Insert: {
          created_at?: string
          form_type: string
          id?: string
          ip: string
        }
        Update: {
          created_at?: string
          form_type?: string
          id?: string
          ip?: string
        }
        Relationships: []
      }
      rate_limit_policies: {
        Row: {
          form_type: string
          max_requests: number
          updated_at: string
          window_seconds: number
        }
        Insert: {
          form_type: string
          max_requests?: number
          updated_at?: string
          window_seconds?: number
        }
        Update: {
          form_type?: string
          max_requests?: number
          updated_at?: string
          window_seconds?: number
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          provider_id: string
          reason: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          provider_id: string
          reason: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          provider_id?: string
          reason?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string
          created_at: string
          id: string
          provider_id: string
          rating: number
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_name: string | null
          status: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          provider_id: string
          rating: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_name?: string | null
          status?: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          provider_id?: string
          rating?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_suggestions: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
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
      admin_add: { Args: { _email: string }; Returns: string }
      admin_revoke: { Args: { _id: string }; Returns: undefined }
      admin_set_active: {
        Args: { _active: boolean; _id: string }
        Returns: undefined
      }
      approve_application: { Args: { _id: string }; Returns: string }
      approve_review: { Args: { _id: string }; Returns: undefined }
      check_rate_limit: {
        Args: { _form_type: string; _ip: string }
        Returns: boolean
      }
      claim_first_admin: { Args: never; Returns: boolean }
      cleanup_rate_limit_events: { Args: never; Returns: number }
      contact_provider: {
        Args: { _kind: string; _provider_id: string }
        Returns: {
          phone: string
          secondary_phone: string
          whatsapp: string
        }[]
      }
      delete_review: { Args: { _id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      my_admin_level: { Args: never; Returns: string }
      normalize_eg_phone: { Args: { _p: string }; Returns: string }
      reject_application: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      reject_review: { Args: { _id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

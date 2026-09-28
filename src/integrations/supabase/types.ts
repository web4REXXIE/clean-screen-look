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
      activation_codes: {
        Row: {
          card_id: string
          code: string
          created_at: string
          id: string
          last_used_at: string | null
          status: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          card_id: string
          code: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          status?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          card_id?: string
          code?: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          status?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activation_codes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string
          created_at: string
          id: string
          new_state: string | null
          previous_state: string | null
          subject_user_id: string | null
          web_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string
          created_at?: string
          id?: string
          new_state?: string | null
          previous_state?: string | null
          subject_user_id?: string | null
          web_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string
          created_at?: string
          id?: string
          new_state?: string | null
          previous_state?: string | null
          subject_user_id?: string | null
          web_id?: string | null
        }
        Relationships: []
      }
      cards: {
        Row: {
          activated_at: string | null
          card_ref: string
          card_type: string
          cardholder_name: string
          created_at: string
          expiry: string
          id: string
          last4: string
          status: Database["public"]["Enums"]["card_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          card_ref: string
          card_type?: string
          cardholder_name?: string
          created_at?: string
          expiry?: string
          id?: string
          last4?: string
          status?: Database["public"]["Enums"]["card_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          card_ref?: string
          card_type?: string
          cardholder_name?: string
          created_at?: string
          expiry?: string
          id?: string
          last4?: string
          status?: Database["public"]["Enums"]["card_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          card_id: string | null
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          provider: string
          provider_session_id: string | null
          reference: string
          service_fee_id: string | null
          service_name: string
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Insert: {
          amount_cents: number
          card_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          provider?: string
          provider_session_id?: string | null
          reference: string
          service_fee_id?: string | null
          service_name?: string
          status?: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Update: {
          amount_cents?: number
          card_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          provider?: string
          provider_session_id?: string | null
          reference?: string
          service_fee_id?: string | null
          service_name?: string
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_service_fee_id_fkey"
            columns: ["service_fee_id"]
            isOneToOne: false
            referencedRelation: "service_fees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          created_by: string
          deactivated: boolean
          email: string
          full_name: string
          id: string
          is_demo: boolean
          last_activity: string
          notes: string
          updated_at: string
          updated_by: string
          web_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          deactivated?: boolean
          email?: string
          full_name?: string
          id: string
          is_demo?: boolean
          last_activity?: string
          notes?: string
          updated_at?: string
          updated_by?: string
          web_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deactivated?: boolean
          email?: string
          full_name?: string
          id?: string
          is_demo?: boolean
          last_activity?: string
          notes?: string
          updated_at?: string
          updated_by?: string
          web_id?: string
        }
        Relationships: []
      }
      service_fees: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          description: string
          effective_date: string
          id: string
          name: string
          status: Database["public"]["Enums"]["fee_status"]
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          description?: string
          effective_date?: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["fee_status"]
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          description?: string
          effective_date?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["fee_status"]
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
      gen_hex: { Args: { _len: number }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      card_status:
        | "pending_activation"
        | "active"
        | "suspended"
        | "activation_pending"
        | "expired"
        | "cancelled"
      fee_status: "active" | "disabled"
      payment_status:
        | "unpaid"
        | "payment_pending"
        | "paid"
        | "payment_failed"
        | "refunded"
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
      app_role: ["admin", "customer"],
      card_status: [
        "pending_activation",
        "active",
        "suspended",
        "activation_pending",
        "expired",
        "cancelled",
      ],
      fee_status: ["active", "disabled"],
      payment_status: [
        "unpaid",
        "payment_pending",
        "paid",
        "payment_failed",
        "refunded",
      ],
    },
  },
} as const

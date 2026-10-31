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
      change_entries: {
        Row: {
          change_date: string | null
          change_type: string
          created_at: string
          embedding: string | null
          id: string
          product_id: string
          source_document_id: string | null
          source_email_id: string | null
          summary: string
          version: string | null
        }
        Insert: {
          change_date?: string | null
          change_type?: string
          created_at?: string
          embedding?: string | null
          id?: string
          product_id: string
          source_document_id?: string | null
          source_email_id?: string | null
          summary: string
          version?: string | null
        }
        Update: {
          change_date?: string | null
          change_type?: string
          created_at?: string
          embedding?: string | null
          id?: string
          product_id?: string
          source_document_id?: string | null
          source_email_id?: string | null
          summary?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_entries_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_entries_source_email_id_fkey"
            columns: ["source_email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string
          id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding: string
          id?: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          created_by: string | null
          error: string | null
          file_path: string | null
          id: string
          mime_type: string | null
          renewed_at: string
          size_bytes: number | null
          source: string
          source_email_id: string | null
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error?: string | null
          file_path?: string | null
          id?: string
          mime_type?: string | null
          renewed_at?: string
          size_bytes?: number | null
          source?: string
          source_email_id?: string | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error?: string | null
          file_path?: string | null
          id?: string
          mime_type?: string | null
          renewed_at?: string
          size_bytes?: number | null
          source?: string
          source_email_id?: string | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_source_email_id_fkey"
            columns: ["source_email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_change_proposals: {
        Row: {
          applied_change_id: string | null
          change_date: string | null
          change_type: string
          confidence: number
          created_at: string
          email_id: string
          id: string
          product_description: string | null
          product_name: string
          reviewed_by: string | null
          status: string
          summary: string
          version: string | null
        }
        Insert: {
          applied_change_id?: string | null
          change_date?: string | null
          change_type?: string
          confidence?: number
          created_at?: string
          email_id: string
          id?: string
          product_description?: string | null
          product_name: string
          reviewed_by?: string | null
          status?: string
          summary: string
          version?: string | null
        }
        Update: {
          applied_change_id?: string | null
          change_date?: string | null
          change_type?: string
          confidence?: number
          created_at?: string
          email_id?: string
          id?: string
          product_description?: string | null
          product_name?: string
          reviewed_by?: string | null
          status?: string
          summary?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_change_proposals_applied_change_id_fkey"
            columns: ["applied_change_id"]
            isOneToOne: false
            referencedRelation: "change_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_change_proposals_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sync_state: {
        Row: {
          auto_apply: boolean
          auto_apply_threshold: number
          enabled: boolean
          history_id: string | null
          id: number
          last_error: string | null
          last_run_at: string | null
          lock_until: string | null
          paused_reason: string | null
        }
        Insert: {
          auto_apply?: boolean
          auto_apply_threshold?: number
          enabled?: boolean
          history_id?: string | null
          id?: number
          last_error?: string | null
          last_run_at?: string | null
          lock_until?: string | null
          paused_reason?: string | null
        }
        Update: {
          auto_apply?: boolean
          auto_apply_threshold?: number
          enabled?: boolean
          history_id?: string | null
          id?: number
          last_error?: string | null
          last_run_at?: string | null
          lock_until?: string | null
          paused_reason?: string | null
        }
        Relationships: []
      }
      emails: {
        Row: {
          body: string | null
          channel: string
          channel_name: string | null
          created_at: string
          embedding: string | null
          error: string | null
          from_address: string | null
          gmail_id: string
          id: string
          received_at: string | null
          snippet: string | null
          status: string
          subject: string | null
          to_address: string | null
        }
        Insert: {
          body?: string | null
          channel?: string
          channel_name?: string | null
          created_at?: string
          embedding?: string | null
          error?: string | null
          from_address?: string | null
          gmail_id?: string
          id?: string
          received_at?: string | null
          snippet?: string | null
          status?: string
          subject?: string | null
          to_address?: string | null
        }
        Update: {
          body?: string | null
          channel?: string
          channel_name?: string | null
          created_at?: string
          embedding?: string | null
          error?: string | null
          from_address?: string | null
          gmail_id?: string
          id?: string
          received_at?: string | null
          snippet?: string | null
          status?: string
          subject?: string | null
          to_address?: string | null
        }
        Relationships: []
      }
      product_versions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string
          release_date: string | null
          source_document_id: string | null
          source_email_id: string | null
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          release_date?: string | null
          source_document_id?: string | null
          source_email_id?: string | null
          version: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          release_date?: string | null
          source_document_id?: string | null
          source_email_id?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_versions_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_versions_source_email_id_fkey"
            columns: ["source_email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      match_change_entries: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          change_date: string
          change_type: string
          id: string
          item_name: string
          similarity: number
          source_document_id: string
          source_email_id: string
          summary: string
          version: string
        }[]
      }
      match_document_chunks: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          content: string
          document_id: string
          id: string
          similarity: number
        }[]
      }
      match_messages: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          body: string
          channel: string
          channel_name: string
          from_address: string
          id: string
          received_at: string
          similarity: number
          subject: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "member"
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
      app_role: ["admin", "member"],
    },
  },
} as const

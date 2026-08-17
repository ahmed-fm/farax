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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          action: string
          created_at: string
          document_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          document_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          document_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      document_groups: {
        Row: {
          can_download: boolean
          created_at: string
          document_id: string
          group_id: string
          id: string
        }
        Insert: {
          can_download?: boolean
          created_at?: string
          document_id: string
          group_id: string
          id?: string
        }
        Update: {
          can_download?: boolean
          created_at?: string
          document_id?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_groups_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      document_permissions: {
        Row: {
          can_delete: boolean
          can_download: boolean
          can_edit: boolean
          can_read: boolean
          can_share: boolean
          created_at: string
          document_id: string
          group_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          can_delete?: boolean
          can_download?: boolean
          can_edit?: boolean
          can_read?: boolean
          can_share?: boolean
          created_at?: string
          document_id: string
          group_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          can_delete?: boolean
          can_download?: boolean
          can_edit?: boolean
          can_read?: boolean
          can_share?: boolean
          created_at?: string
          document_id?: string
          group_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_permissions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_permissions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          allow_download: boolean
          author_id: string
          author_name: string | null
          category: string
          created_at: string
          deleted_at: string | null
          description: string | null
          filename: string
          id: string
          level: Database["public"]["Enums"]["school_level"]
          mime_type: string
          name: string
          school_year: string | null
          search_vector: unknown
          size: number
          storage_path: string
          subject: string
          tags: string[]
          thumbnail_path: string | null
          updated_at: string
          view_count: number
          visibility: Database["public"]["Enums"]["doc_visibility"]
        }
        Insert: {
          allow_download?: boolean
          author_id: string
          author_name?: string | null
          category: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          filename: string
          id?: string
          level: Database["public"]["Enums"]["school_level"]
          mime_type: string
          name: string
          school_year?: string | null
          search_vector?: unknown
          size?: number
          storage_path: string
          subject: string
          tags?: string[]
          thumbnail_path?: string | null
          updated_at?: string
          view_count?: number
          visibility?: Database["public"]["Enums"]["doc_visibility"]
        }
        Update: {
          allow_download?: boolean
          author_id?: string
          author_name?: string | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          filename?: string
          id?: string
          level?: Database["public"]["Enums"]["school_level"]
          mime_type?: string
          name?: string
          school_year?: string | null
          search_vector?: unknown
          size?: number
          storage_path?: string
          subject?: string
          tags?: string[]
          thumbnail_path?: string | null
          updated_at?: string
          view_count?: number
          visibility?: Database["public"]["Enums"]["doc_visibility"]
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          document_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          member_role: Database["public"]["Enums"]["group_member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          member_role?: Database["public"]["Enums"]["group_member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          member_role?: Database["public"]["Enums"]["group_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          level: Database["public"]["Enums"]["school_level"]
          name: string
          parent_id: string | null
          slug: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          level: Database["public"]["Enums"]["school_level"]
          name: string
          parent_id?: string | null
          slug?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          level?: Database["public"]["Enums"]["school_level"]
          name?: string
          parent_id?: string | null
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          storage_used: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          storage_used?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          storage_used?: number
        }
        Relationships: []
      }
      subjects: {
        Row: {
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
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
      view_history: {
        Row: {
          document_id: string
          id: string
          position: number | null
          user_id: string
          viewed_at: string
        }
        Insert: {
          document_id: string
          id?: string
          position?: number | null
          user_id: string
          viewed_at?: string
        }
        Update: {
          document_id?: string
          id?: string
          position?: number | null
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "view_history_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_download_document: {
        Args: { _doc_id: string; _user_id: string }
        Returns: boolean
      }
      can_edit_document: {
        Args: { _doc_id: string; _user_id: string }
        Returns: boolean
      }
      can_read_document: {
        Args: { _doc_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      owns_document: {
        Args: { _doc_id: string; _user_id: string }
        Returns: boolean
      }
      register_view: {
        Args: { _doc_id: string; _position?: number }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student" | "guest"
      doc_visibility:
        | "public"
        | "private"
        | "users"
        | "group"
        | "level"
        | "subject"
      group_member_role: "student" | "teacher"
      school_level: "college" | "lycee" | "universite"
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
    Enums: {
      app_role: ["admin", "teacher", "student", "guest"],
      doc_visibility: [
        "public",
        "private",
        "users",
        "group",
        "level",
        "subject",
      ],
      group_member_role: ["student", "teacher"],
      school_level: ["college", "lycee", "universite"],
    },
  },
} as const

/**
 * Database types for the IT Asset Management System.
 *
 * In normal development these are generated rather than hand-written:
 *   supabase gen types typescript --local > src/lib/database.types.ts
 * Regenerate after every migration.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AssetStatus = "active" | "in_repair" | "retired" | "disposed" | "lost";
export type DocumentType = "asset" | "register";
export type GenerationStatus = "pending" | "generating" | "ready" | "failed";

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.4";
  };
  public: {
    Tables: {
      asset_types: {
        Row: {
          id: number;
          code: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          code: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          code?: string;
          name?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      assets: {
        Row: {
          id: string;
          asset_code: string;
          asset_name: string;
          asset_type_id: number;
          brand: string | null;
          model: string | null;
          serial_number: string | null;
          responsible_person: string | null;
          department: string | null;
          location: string | null;
          acquisition_date: string | null;
          status: AssetStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          asset_code: string;
          asset_name: string;
          asset_type_id: number;
          brand?: string | null;
          model?: string | null;
          serial_number?: string | null;
          responsible_person?: string | null;
          department?: string | null;
          location?: string | null;
          acquisition_date?: string | null;
          status?: AssetStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          asset_code?: string;
          asset_name?: string;
          asset_type_id?: number;
          brand?: string | null;
          model?: string | null;
          serial_number?: string | null;
          responsible_person?: string | null;
          department?: string | null;
          location?: string | null;
          acquisition_date?: string | null;
          status?: AssetStatus;
          notes?: string | null;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "assets_asset_type_id_fkey";
            columns: ["asset_type_id"];
            isOneToOne: false;
            referencedRelation: "asset_types";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          id: string;
          document_number: string;
          document_type: DocumentType;
          asset_id: string | null;
          revision: number;
          storage_path: string | null;
          file_size_bytes: number | null;
          generation_status: GenerationStatus;
          error_message: string | null;
          created_at: string;
          completed_at: string | null;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          document_number: string;
          document_type: DocumentType;
          asset_id?: string | null;
          revision?: number;
          storage_path?: string | null;
          file_size_bytes?: number | null;
          generation_status?: GenerationStatus;
          error_message?: string | null;
          created_at?: string;
          completed_at?: string | null;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          document_number?: string;
          document_type?: DocumentType;
          asset_id?: string | null;
          revision?: number;
          storage_path?: string | null;
          file_size_bytes?: number | null;
          generation_status?: GenerationStatus;
          error_message?: string | null;
          completed_at?: string | null;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
        ];
      };
      document_items: {
        Row: {
          document_id: string;
          asset_id: string;
          row_order: number;
        };
        Insert: {
          document_id: string;
          asset_id: string;
          row_order: number;
        };
        Update: {
          document_id?: string;
          asset_id?: string;
          row_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "document_items_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_items_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      next_document_number: {
        Args: { p_document_type: string; p_asset_id?: string | null };
        Returns: string;
      };
      asset_stats: {
        Args: Record<string, never>;
        Returns: Json;
      };
      create_document_with_items: {
        Args: {
          p_document_number: string;
          p_document_type: string;
          p_asset_id: string | null;
          p_revision: number;
          p_created_by: string | null;
          p_asset_ids?: string[] | null;
        };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type AssetTypeRow = Tables<"asset_types">;
export type AssetRow = Tables<"assets">;
export type DocumentRow = Tables<"documents">;
export type DocumentItemRow = Tables<"document_items">;

/** An asset row joined with its asset type (PostgREST embeds a single relation). */
export type AssetWithType = AssetRow & {
  asset_types: Pick<AssetTypeRow, "code" | "name"> | null;
};

/** A document row with its optional asset and that asset's type. */
export type DocumentWithAsset = DocumentRow & {
  assets: (Pick<AssetRow, "id" | "asset_code" | "asset_name"> & {
    asset_types: Pick<AssetTypeRow, "code" | "name"> | null;
  }) | null;
};

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
    PostgrestVersion: "14.17"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_user: {
        Row: {
          cooperative_id: string | null
          created_at: string
          full_name: string
          id: string
          organisation: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          cooperative_id?: string | null
          created_at?: string
          full_name: string
          id: string
          organisation?: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          cooperative_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          organisation?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "app_user_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperative"
            referencedColumns: ["id"]
          },
        ]
      }
      block: {
        Row: {
          actual_harvest_date: string | null
          actual_price_per_kg: number | null
          actual_yield_kg: number | null
          area_ha: number
          commodity_id: string
          id: string
          label: string
          order_index: number
          payment_received_date: string | null
          planting_date: string
          plot_id: string
          variety_id: string
        }
        Insert: {
          actual_harvest_date?: string | null
          actual_price_per_kg?: number | null
          actual_yield_kg?: number | null
          area_ha: number
          commodity_id: string
          id?: string
          label: string
          order_index?: number
          payment_received_date?: string | null
          planting_date: string
          plot_id: string
          variety_id: string
        }
        Update: {
          actual_harvest_date?: string | null
          actual_price_per_kg?: number | null
          actual_yield_kg?: number | null
          area_ha?: number
          commodity_id?: string
          id?: string
          label?: string
          order_index?: number
          payment_received_date?: string | null
          planting_date?: string
          plot_id?: string
          variety_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "plot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_variety_id_fkey"
            columns: ["variety_id"]
            isOneToOne: false
            referencedRelation: "variety"
            referencedColumns: ["id"]
          },
        ]
      }
      calibration: {
        Row: {
          cooperative_id: string
          n_observations: number
          offset_days: number
          residual_sd: number
          updated_at: string
          variety_id: string
        }
        Insert: {
          cooperative_id: string
          n_observations: number
          offset_days: number
          residual_sd: number
          updated_at?: string
          variety_id: string
        }
        Update: {
          cooperative_id?: string
          n_observations?: number
          offset_days?: number
          residual_sd?: number
          updated_at?: string
          variety_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calibration_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperative"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibration_variety_id_fkey"
            columns: ["variety_id"]
            isOneToOne: false
            referencedRelation: "variety"
            referencedColumns: ["id"]
          },
        ]
      }
      commodity: {
        Row: {
          id: string
          name: string
          slug: string
          sprite_row: number
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sprite_row?: number
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sprite_row?: number
        }
        Relationships: []
      }
      cooperative: {
        Row: {
          created_at: string
          district: string
          district_code: string | null
          id: string
          lat: number
          lng: number
          name: string
          province: string
          stagger_applied: Json
          village: string
        }
        Insert: {
          created_at?: string
          district: string
          district_code?: string | null
          id?: string
          lat: number
          lng: number
          name: string
          province: string
          stagger_applied?: Json
          village: string
        }
        Update: {
          created_at?: string
          district?: string
          district_code?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          province?: string
          stagger_applied?: Json
          village?: string
        }
        Relationships: []
      }
      cooperative_capacity: {
        Row: {
          commodity_id: string
          cooperative_id: string
          tonnes_per_week: number
        }
        Insert: {
          commodity_id: string
          cooperative_id: string
          tonnes_per_week: number
        }
        Update: {
          commodity_id?: string
          cooperative_id?: string
          tonnes_per_week?: number
        }
        Relationships: [
          {
            foreignKeyName: "cooperative_capacity_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cooperative_capacity_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperative"
            referencedColumns: ["id"]
          },
        ]
      }
      fertiliser_rate: {
        Row: {
          commodity_id: string
          input_item: string
          kg_per_ha: number
          source: string
        }
        Insert: {
          commodity_id: string
          input_item: string
          kg_per_ha: number
          source: string
        }
        Update: {
          commodity_id?: string
          input_item?: string
          kg_per_ha?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "fertiliser_rate_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodity"
            referencedColumns: ["id"]
          },
        ]
      }
      input_order: {
        Row: {
          cooperative_id: string
          created_at: string
          id: string
          season_label: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          cooperative_id: string
          created_at?: string
          id?: string
          season_label: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          cooperative_id?: string
          created_at?: string
          id?: string
          season_label?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "input_order_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperative"
            referencedColumns: ["id"]
          },
        ]
      }
      input_order_line: {
        Row: {
          bulk_price_per_unit: number | null
          id: string
          input_order_id: string
          item: string
          quantity: number
          retail_price_per_unit: number | null
          unit: string
        }
        Insert: {
          bulk_price_per_unit?: number | null
          id?: string
          input_order_id: string
          item: string
          quantity: number
          retail_price_per_unit?: number | null
          unit: string
        }
        Update: {
          bulk_price_per_unit?: number | null
          id?: string
          input_order_id?: string
          item?: string
          quantity?: number
          retail_price_per_unit?: number | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "input_order_line_input_order_id_fkey"
            columns: ["input_order_id"]
            isOneToOne: false
            referencedRelation: "input_order"
            referencedColumns: ["id"]
          },
        ]
      }
      member: {
        Row: {
          cooperative_id: string
          created_at: string
          id: string
          name: string
          nik_hash: string | null
        }
        Insert: {
          cooperative_id: string
          created_at?: string
          id?: string
          name: string
          nik_hash?: string | null
        }
        Update: {
          cooperative_id?: string
          created_at?: string
          id?: string
          name?: string
          nik_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperative"
            referencedColumns: ["id"]
          },
        ]
      }
      plot: {
        Row: {
          area_ha: number
          cooperative_id: string
          created_at: string
          decorations: Json
          grid_lat: number | null
          grid_lng: number | null
          id: string
          lat: number
          lng: number
          member_id: string
          name: string
          public_id: string
          terrain_override: Json | null
          terrain_seed: number
          tile_size_m2: number | null
        }
        Insert: {
          area_ha: number
          cooperative_id: string
          created_at?: string
          decorations?: Json
          grid_lat?: number | null
          grid_lng?: number | null
          id?: string
          lat: number
          lng: number
          member_id: string
          name: string
          public_id: string
          terrain_override?: Json | null
          terrain_seed?: number
          tile_size_m2?: number | null
        }
        Update: {
          area_ha?: number
          cooperative_id?: string
          created_at?: string
          decorations?: Json
          grid_lat?: number | null
          grid_lng?: number | null
          id?: string
          lat?: number
          lng?: number
          member_id?: string
          name?: string
          public_id?: string
          terrain_override?: Json | null
          terrain_seed?: number
          tile_size_m2?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plot_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperative"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plot_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_price: {
        Row: {
          commodity_id: string
          price_per_kg: number
          province: string
          source: string
          week_start: string
        }
        Insert: {
          commodity_id: string
          price_per_kg: number
          province: string
          source: string
          week_start: string
        }
        Update: {
          commodity_id?: string
          price_per_kg?: number
          province?: string
          source?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_price_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodity"
            referencedColumns: ["id"]
          },
        ]
      }
      region_stat: {
        Row: {
          commodity_id: string
          harvested_area_ha: number
          level: Database["public"]["Enums"]["region_level"]
          production_tonnes: number
          region_code: string
          region_name: string
          source: string
          year: number
        }
        Insert: {
          commodity_id: string
          harvested_area_ha: number
          level: Database["public"]["Enums"]["region_level"]
          production_tonnes: number
          region_code: string
          region_name: string
          source: string
          year: number
        }
        Update: {
          commodity_id?: string
          harvested_area_ha?: number
          level?: Database["public"]["Enums"]["region_level"]
          production_tonnes?: number
          region_code?: string
          region_name?: string
          source?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "region_stat_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodity"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_contract_request: {
        Row: {
          buyer_id: string
          buyer_name: string
          buyer_organisation: string | null
          commodity_id: string
          cooperative_id: string
          created_at: string
          id: string
          notes: string | null
          responded_at: string | null
          status: Database["public"]["Enums"]["request_status"]
          volume_kg: number
          window_end: string
          window_start: string
        }
        Insert: {
          buyer_id: string
          buyer_name: string
          buyer_organisation?: string | null
          commodity_id: string
          cooperative_id: string
          created_at?: string
          id?: string
          notes?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          volume_kg: number
          window_end: string
          window_start: string
        }
        Update: {
          buyer_id?: string
          buyer_name?: string
          buyer_organisation?: string | null
          commodity_id?: string
          cooperative_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          volume_kg?: number
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_contract_request_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_contract_request_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_contract_request_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperative"
            referencedColumns: ["id"]
          },
        ]
      }
      variety: {
        Row: {
          base_temp_c: number
          commodity_id: string
          days_to_harvest_max: number
          days_to_harvest_min: number
          gdd_requirement: number
          id: string
          name: string
          yield_per_ha_max: number
          yield_per_ha_min: number
        }
        Insert: {
          base_temp_c: number
          commodity_id: string
          days_to_harvest_max: number
          days_to_harvest_min: number
          gdd_requirement: number
          id?: string
          name: string
          yield_per_ha_max: number
          yield_per_ha_min: number
        }
        Update: {
          base_temp_c?: number
          commodity_id?: string
          days_to_harvest_max?: number
          days_to_harvest_min?: number
          gdd_requirement?: number
          id?: string
          name?: string
          yield_per_ha_max?: number
          yield_per_ha_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "variety_commodity_id_fkey"
            columns: ["commodity_id"]
            isOneToOne: false
            referencedRelation: "commodity"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_daily: {
        Row: {
          date: string
          grid_lat: number
          grid_lng: number
          temp_max: number
          temp_min: number
        }
        Insert: {
          date: string
          grid_lat: number
          grid_lng: number
          temp_max: number
          temp_min: number
        }
        Update: {
          date?: string
          grid_lat?: number
          grid_lng?: number
          temp_max?: number
          temp_min?: number
        }
        Relationships: []
      }
      weather_normals: {
        Row: {
          day_of_year: number
          grid_lat: number
          grid_lng: number
          mean_c: number
          sd_c: number
        }
        Insert: {
          day_of_year: number
          grid_lat: number
          grid_lng: number
          mean_c: number
          sd_c: number
        }
        Update: {
          day_of_year?: number
          grid_lat?: number
          grid_lng?: number
          mean_c?: number
          sd_c?: number
        }
        Relationships: []
      }
    }
    Views: {
      public_plot: {
        Row: {
          area_ha: number | null
          district: string | null
          member_name: string | null
          name: string | null
          public_id: string | null
          terrain_seed: number | null
          tile_size_m2: number | null
          village: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_cooperative_id: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      order_status: "draft" | "submitted" | "completed"
      region_level: "province" | "district"
      request_status: "pending" | "accepted" | "declined" | "withdrawn"
      user_role: "kader" | "pengurus" | "buyer"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      order_status: ["draft", "submitted", "completed"],
      region_level: ["province", "district"],
      request_status: ["pending", "accepted", "declined", "withdrawn"],
      user_role: ["kader", "pengurus", "buyer"],
    },
  },
} as const

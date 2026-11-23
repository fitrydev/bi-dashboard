
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "allowed_emails": {
                  Row: {
                    "added_by": string | null,"created_at": string,"email": string,"role": Database["public"]['Enums']["app_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "added_by"?: string | null,"created_at"?: string,"email": string,"role"?: Database["public"]['Enums']["app_role"]
                  }
                  Update: {
                    "added_by"?: string | null,"created_at"?: string,"email"?: string,"role"?: Database["public"]['Enums']["app_role"]
                  }
                  Relationships: [
                    
                  ]
                },"assessment_drafts": {
                  Row: {
                    "asset_id": string,"data": NonNullable<Json>,"id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "asset_id": string,"data"?: NonNullable<Json>,"id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "asset_id"?: string,"data"?: NonNullable<Json>,"id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assessment_drafts_asset_id_fkey"
      columns: ["asset_id"]
isOneToOne: false
      referencedRelation: "assets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assessment_drafts_asset_id_fkey"
      columns: ["asset_id"]
isOneToOne: false
      referencedRelation: "v_asset_latest"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assessment_drafts_asset_id_fkey"
      columns: ["asset_id"]
isOneToOne: false
      referencedRelation: "v_data_quality_issues"
      referencedColumns: ["asset_id"]
    }
                  ]
                },"assessments": {
                  Row: {
                    "assessed_at": string,"asset_id": string,"category": Database["public"]['Enums']["risk_category"] | null,"created_at": string,"created_by": string | null,"critical_override": boolean,"findings": string | null,"follow_up": string | null,"follow_up_pic": string | null,"id": string,"is_complete": boolean,"override_reason": string | null,"params_version": number,"s_control": number | null,"s_legal": number | null,"s_location": number | null,"s_physical": number | null,"s_strategic": number | null,"s_utilization": number | null,"target_date": string | null,"total_score": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "assessed_at": string,"asset_id": string,"category"?: Database["public"]['Enums']["risk_category"] | null,"created_at"?: string,"created_by"?: string | null,"critical_override"?: boolean,"findings"?: string | null,"follow_up"?: string | null,"follow_up_pic"?: string | null,"id"?: string,"is_complete"?: boolean,"override_reason"?: string | null,"params_version": number,"s_control"?: number | null,"s_legal"?: number | null,"s_location"?: number | null,"s_physical"?: number | null,"s_strategic"?: number | null,"s_utilization"?: number | null,"target_date"?: string | null,"total_score"?: number | null
                  }
                  Update: {
                    "assessed_at"?: string,"asset_id"?: string,"category"?: Database["public"]['Enums']["risk_category"] | null,"created_at"?: string,"created_by"?: string | null,"critical_override"?: boolean,"findings"?: string | null,"follow_up"?: string | null,"follow_up_pic"?: string | null,"id"?: string,"is_complete"?: boolean,"override_reason"?: string | null,"params_version"?: number,"s_control"?: number | null,"s_legal"?: number | null,"s_location"?: number | null,"s_physical"?: number | null,"s_strategic"?: number | null,"s_utilization"?: number | null,"target_date"?: string | null,"total_score"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "assessments_asset_id_fkey"
      columns: ["asset_id"]
isOneToOne: false
      referencedRelation: "assets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assessments_asset_id_fkey"
      columns: ["asset_id"]
isOneToOne: false
      referencedRelation: "v_asset_latest"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assessments_asset_id_fkey"
      columns: ["asset_id"]
isOneToOne: false
      referencedRelation: "v_data_quality_issues"
      referencedColumns: ["asset_id"]
    },{
      foreignKeyName: "assessments_params_version_fkey"
      columns: ["params_version"]
isOneToOne: false
      referencedRelation: "scoring_params"
      referencedColumns: ["version"]
    }
                  ]
                },"assets": {
                  Row: {
                    "address": string | null,"area_is_placeholder": boolean | null,"asset_code": string,"book_value": number | null,"building_area_m2": number | null,"created_at": string,"created_by": string | null,"id": string,"is_active": boolean,"land_area_m2": number | null,"last_monitored_at": string | null,"legal_status": string | null,"name": string,"notes": string | null,"pic_unit": string | null,"region_id": string,"right_expiry_date": string | null,"type": Database["public"]['Enums']["asset_type"],"updated_at": string,"updated_by": string | null,"utilization": Database["public"]['Enums']["utilization_status"] | null,"utilization_needs_review": boolean,"utilization_raw": string | null,"value_is_placeholder": boolean | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"area_is_placeholder"?: never,"asset_code": string,"book_value"?: number | null,"building_area_m2"?: number | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"land_area_m2"?: number | null,"last_monitored_at"?: string | null,"legal_status"?: string | null,"name": string,"notes"?: string | null,"pic_unit"?: string | null,"region_id": string,"right_expiry_date"?: string | null,"type": Database["public"]['Enums']["asset_type"],"updated_at"?: string,"updated_by"?: string | null,"utilization"?: Database["public"]['Enums']["utilization_status"] | null,"utilization_needs_review"?: boolean,"utilization_raw"?: string | null,"value_is_placeholder"?: never
                  }
                  Update: {
                    "address"?: string | null,"area_is_placeholder"?: never,"asset_code"?: string,"book_value"?: number | null,"building_area_m2"?: number | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"land_area_m2"?: number | null,"last_monitored_at"?: string | null,"legal_status"?: string | null,"name"?: string,"notes"?: string | null,"pic_unit"?: string | null,"region_id"?: string,"right_expiry_date"?: string | null,"type"?: Database["public"]['Enums']["asset_type"],"updated_at"?: string,"updated_by"?: string | null,"utilization"?: Database["public"]['Enums']["utilization_status"] | null,"utilization_needs_review"?: boolean,"utilization_raw"?: string | null,"value_is_placeholder"?: never
                  }
                  Relationships: [
                    {
      foreignKeyName: "assets_region_id_fkey"
      columns: ["region_id"]
isOneToOne: false
      referencedRelation: "regions"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor": string | null,"after": Json | null,"at": string,"before": Json | null,"id": string,"row_id": string,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor"?: string | null,"after"?: Json | null,"at"?: string,"before"?: Json | null,"id"?: string,"row_id": string,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor"?: string | null,"after"?: Json | null,"at"?: string,"before"?: Json | null,"id"?: string,"row_id"?: string,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"import_batches": {
                  Row: {
                    "committed_at": string | null,"created_at": string,"file_name": string | null,"file_path": string | null,"id": string,"report": NonNullable<Json>,"rows_error": number,"rows_ok": number,"rows_total": number,"rows_warn": number,"status": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "committed_at"?: string | null,"created_at"?: string,"file_name"?: string | null,"file_path"?: string | null,"id"?: string,"report"?: NonNullable<Json>,"rows_error"?: number,"rows_ok"?: number,"rows_total"?: number,"rows_warn"?: number,"status"?: string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "committed_at"?: string | null,"created_at"?: string,"file_name"?: string | null,"file_path"?: string | null,"id"?: string,"report"?: NonNullable<Json>,"rows_error"?: number,"rows_ok"?: number,"rows_total"?: number,"rows_warn"?: number,"status"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"monitoring_events": {
                  Row: {
                    "asset_id": string,"created_at": string,"created_by": string | null,"findings": string | null,"id": string,"method": Database["public"]['Enums']["monitoring_method"],"monitored_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "asset_id": string,"created_at"?: string,"created_by"?: string | null,"findings"?: string | null,"id"?: string,"method": Database["public"]['Enums']["monitoring_method"],"monitored_at": string
                  }
                  Update: {
                    "asset_id"?: string,"created_at"?: string,"created_by"?: string | null,"findings"?: string | null,"id"?: string,"method"?: Database["public"]['Enums']["monitoring_method"],"monitored_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "monitoring_events_asset_id_fkey"
      columns: ["asset_id"]
isOneToOne: false
      referencedRelation: "assets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "monitoring_events_asset_id_fkey"
      columns: ["asset_id"]
isOneToOne: false
      referencedRelation: "v_asset_latest"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "monitoring_events_asset_id_fkey"
      columns: ["asset_id"]
isOneToOne: false
      referencedRelation: "v_data_quality_issues"
      referencedColumns: ["asset_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"full_name": string | null,"id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"region_aliases": {
                  Row: {
                    "alias": string,"region_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alias": string,"region_id": string
                  }
                  Update: {
                    "alias"?: string,"region_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "region_aliases_region_id_fkey"
      columns: ["region_id"]
isOneToOne: false
      referencedRelation: "regions"
      referencedColumns: ["id"]
    }
                  ]
                },"regions": {
                  Row: {
                    "id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"name": string
                  }
                  Update: {
                    "id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"score_criteria": {
                  Row: {
                    "description": string,"indicator": Database["public"]['Enums']["score_indicator"],"params_version": number,"revised_from_excel": boolean,"score": number
                  }
                  ComputedFields: never
                  Insert: {
                    "description": string,"indicator": Database["public"]['Enums']["score_indicator"],"params_version": number,"revised_from_excel"?: boolean,"score": number
                  }
                  Update: {
                    "description"?: string,"indicator"?: Database["public"]['Enums']["score_indicator"],"params_version"?: number,"revised_from_excel"?: boolean,"score"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "score_criteria_params_version_fkey"
      columns: ["params_version"]
isOneToOne: false
      referencedRelation: "scoring_params"
      referencedColumns: ["version"]
    }
                  ]
                },"scoring_params": {
                  Row: {
                    "approved_by": string | null,"created_at": string,"created_by": string | null,"effective_from": string,"indicator_labels": NonNullable<Json>,"intervals": NonNullable<Json>,"is_active": boolean,"methods": NonNullable<Json>,"notes": string | null,"thresholds": NonNullable<Json>,"version": number,"weights": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"effective_from"?: string,"indicator_labels"?: NonNullable<Json>,"intervals": NonNullable<Json>,"is_active"?: boolean,"methods"?: NonNullable<Json>,"notes"?: string | null,"thresholds": NonNullable<Json>,"version": number,"weights": NonNullable<Json>
                  }
                  Update: {
                    "approved_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"effective_from"?: string,"indicator_labels"?: NonNullable<Json>,"intervals"?: NonNullable<Json>,"is_active"?: boolean,"methods"?: NonNullable<Json>,"notes"?: string | null,"thresholds"?: NonNullable<Json>,"version"?: number,"weights"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"utilization_aliases": {
                  Row: {
                    "needs_review": boolean,"raw": string,"status": Database["public"]['Enums']["utilization_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "needs_review"?: boolean,"raw": string,"status": Database["public"]['Enums']["utilization_status"]
                  }
                  Update: {
                    "needs_review"?: boolean,"raw"?: string,"status"?: Database["public"]['Enums']["utilization_status"]
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "v_asset_latest": {
                  Row: {
                    "address": string | null,"area_is_placeholder": boolean | null,"assessed_at": string | null,"assessment_id": string | null,"asset_code": string,"book_value": number | null,"building_area_m2": number | null,"category": Database["public"]['Enums']["risk_category"] | null,"created_at": string,"critical_override": boolean | null,"days_until_due": number | null,"due_date": string | null,"findings": string | null,"follow_up": string | null,"follow_up_pic": string | null,"id": string,"interval_months": number | null,"is_active": boolean,"is_complete": boolean | null,"land_area_m2": number | null,"last_monitored_at": string | null,"legal_status": string | null,"name": string,"notes": string | null,"override_reason": string | null,"params_version": number | null,"pic_unit": string | null,"region": string,"region_id": string,"right_expiry_date": string | null,"s_control": number | null,"s_legal": number | null,"s_location": number | null,"s_physical": number | null,"s_strategic": number | null,"s_utilization": number | null,"schedule_status": string | null,"target_date": string | null,"total_score": number | null,"type": Database["public"]['Enums']["asset_type"],"updated_at": string,"utilization": Database["public"]['Enums']["utilization_status"] | null,"utilization_label": string | null,"utilization_needs_review": boolean,"utilization_raw": string | null,"value_is_placeholder": boolean | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "assessments_params_version_fkey"
      columns: ["params_version"]
isOneToOne: false
      referencedRelation: "scoring_params"
      referencedColumns: ["version"]
    },{
      foreignKeyName: "assets_region_id_fkey"
      columns: ["region_id"]
isOneToOne: false
      referencedRelation: "regions"
      referencedColumns: ["id"]
    }
                  ]
                },"v_data_quality_issues": {
                  Row: {
                    "asset_code": string,"asset_id": string,"detail": string | null,"issue_code": string | null,"kind": string | null,"name": string
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "active_params_version":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"category_for":
{ Args: { "p_override": boolean,"p_score": number,"p_version": number }; Returns: Database["public"]['Enums']["risk_category"]
                           },
"compute_score":
{ Args: { "p_scores": (number)[],"p_version": number }; Returns: number
                           },
"current_app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["app_role"]
                           },
"dashboard_summary":
{ Args: { "filters"?: Json }; Returns: Json
                           },
"has_role":
{ Args: { "p_role": Database["public"]['Enums']["app_role"] }; Returns: boolean
                           },
"hook_before_user_created":
{ Args: { "event": Json }; Returns: Json
                           },
"import_commit":
{ Args: { "batch_id": string,"rows": Json }; Returns: Json
                           },
"interval_months":
{ Args: { "p_category": Database["public"]['Enums']["risk_category"],"p_version": number }; Returns: number
                           },
"is_allowed":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"recalculate_with_active_params":
{ Args: { "dry_run"?: boolean }; Returns: Json
                           },
"today_wib":
{ Args: { "p_at"?: string }; Returns: string
                           },
"utilization_label":
{ Args: { "p": Database["public"]['Enums']["utilization_status"] }; Returns: string
                           }
          }
          Enums: {
            "app_role": "viewer"|"editor"|"admin","asset_type": "tanah"|"bangunan"|"gabungan","monitoring_method": "site_visit"|"remote"|"desk_review","risk_category": "critical"|"high"|"medium"|"low","score_indicator": "legal"|"control"|"physical"|"utilization"|"location"|"strategic","utilization_status": "digunakan_sendiri"|"disewakan_kerja_sama"|"idle_kosong"|"digunakan_pihak_lain"|"lainnya"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["viewer", "editor", "admin"],"asset_type": ["tanah", "bangunan", "gabungan"],"monitoring_method": ["site_visit", "remote", "desk_review"],"risk_category": ["critical", "high", "medium", "low"],"score_indicator": ["legal", "control", "physical", "utilization", "location", "strategic"],"utilization_status": ["digunakan_sendiri", "disewakan_kerja_sama", "idle_kosong", "digunakan_pihak_lain", "lainnya"]
          }
        }
} as const

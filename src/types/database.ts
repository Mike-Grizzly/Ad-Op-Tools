// HAND-MAINTAINED — not generated. Update this file by hand when a migration changes the schema.
// (We are not running `supabase gen types` against the shared project; see docs/decision-log.md.)
// Last updated by hand: 2026-06-26 (added platform_connections, budget_entries)

export type Database = {
  public: {
    Tables: {
      utm_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          source: string | null
          medium: string | null
          campaign: string | null
          content: string | null
          term: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          source?: string | null
          medium?: string | null
          campaign?: string | null
          content?: string | null
          term?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          source?: string | null
          medium?: string | null
          campaign?: string | null
          content?: string | null
          term?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'utm_templates_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      utm_history: {
        Row: {
          id: string
          user_id: string
          template_id: string | null
          base_url: string
          source: string
          medium: string
          campaign: string
          content: string | null
          term: string | null
          ad_set: string | null
          creative: string | null
          generated_url: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          template_id?: string | null
          base_url: string
          source: string
          medium: string
          campaign: string
          content?: string | null
          term?: string | null
          ad_set?: string | null
          creative?: string | null
          generated_url: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          template_id?: string | null
          base_url?: string
          source?: string
          medium?: string
          campaign?: string
          content?: string | null
          term?: string | null
          ad_set?: string | null
          creative?: string | null
          generated_url?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'utm_history_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'utm_history_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'utm_templates'
            referencedColumns: ['id']
          }
        ]
      }
      platform_connections: {
        Row: {
          id: string
          user_id: string
          platform: string
          external_account_id: string
          account_name: string | null
          scopes: string[]
          token_key_id: string
          access_token_ciphertext: string
          access_token_iv: string
          access_token_auth_tag: string
          refresh_token_ciphertext: string | null
          refresh_token_iv: string | null
          refresh_token_auth_tag: string | null
          token_expires_at: string | null
          status: string
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: string
          external_account_id: string
          account_name?: string | null
          scopes?: string[]
          token_key_id?: string
          access_token_ciphertext: string
          access_token_iv: string
          access_token_auth_tag: string
          refresh_token_ciphertext?: string | null
          refresh_token_iv?: string | null
          refresh_token_auth_tag?: string | null
          token_expires_at?: string | null
          status?: string
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: string
          external_account_id?: string
          account_name?: string | null
          scopes?: string[]
          token_key_id?: string
          access_token_ciphertext?: string
          access_token_iv?: string
          access_token_auth_tag?: string
          refresh_token_ciphertext?: string | null
          refresh_token_iv?: string | null
          refresh_token_auth_tag?: string | null
          token_expires_at?: string | null
          status?: string
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'platform_connections_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      budget_entries: {
        Row: {
          id: string
          user_id: string
          platform: string
          external_account_id: string
          campaign_external_id: string
          campaign_name: string | null
          entry_date: string
          spend_micros: number
          currency: string
          impressions: number | null
          clicks: number | null
          created_at: string
          synced_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: string
          external_account_id: string
          campaign_external_id: string
          campaign_name?: string | null
          entry_date: string
          spend_micros: number
          currency: string
          impressions?: number | null
          clicks?: number | null
          created_at?: string
          synced_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: string
          external_account_id?: string
          campaign_external_id?: string
          campaign_name?: string | null
          entry_date?: string
          spend_micros?: number
          currency?: string
          impressions?: number | null
          clicks?: number | null
          created_at?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'budget_entries_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      budget_caps: {
        Row: {
          id: string
          user_id: string
          scope: string
          amount_micros: number
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          scope: string
          amount_micros: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          scope?: string
          amount_micros?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'budget_caps_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

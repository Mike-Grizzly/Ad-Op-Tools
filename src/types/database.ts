// HAND-MAINTAINED — not generated. Update this file by hand when a migration changes the schema.
// (We are not running `supabase gen types` against the shared project; see docs/decision-log.md.)
// Last updated by hand: 2026-07-22 (clients slice: clients, client_platforms,
// platform_connections.client_id)

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          id: string
          org_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'organization_members_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      audit_log: {
        Row: {
          id: string
          org_id: string
          actor_user_id: string | null
          action: string
          target: string | null
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          actor_user_id?: string | null
          action: string
          target?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          actor_user_id?: string | null
          action?: string
          target?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_log_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_log_actor_user_id_fkey'
            columns: ['actor_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      clients: {
        Row: {
          id: string
          org_id: string
          user_id: string
          name: string
          monthly_budget_micros: number | null
          budget_reset_day: number
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          name: string
          monthly_budget_micros?: number | null
          budget_reset_day?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          name?: string
          monthly_budget_micros?: number | null
          budget_reset_day?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'clients_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'clients_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      client_platforms: {
        Row: {
          id: string
          org_id: string
          client_id: string
          platform: string
          monthly_budget_override_micros: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          client_id: string
          platform: string
          monthly_budget_override_micros: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          client_id?: string
          platform?: string
          monthly_budget_override_micros?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_platforms_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_platforms_org_id_client_id_fkey'
            columns: ['org_id', 'client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['org_id', 'id']
          }
        ]
      }
      utm_templates: {
        Row: {
          id: string
          user_id: string
          org_id: string
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
          org_id: string
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
          org_id?: string
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
          },
          {
            foreignKeyName: 'utm_templates_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          }
        ]
      }
      utm_history: {
        Row: {
          id: string
          user_id: string
          org_id: string
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
          org_id: string
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
          org_id?: string
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
            foreignKeyName: 'utm_history_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
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
          org_id: string
          client_id: string | null
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
          org_id: string
          client_id?: string | null
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
          org_id?: string
          client_id?: string | null
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
          },
          {
            foreignKeyName: 'platform_connections_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'platform_connections_client_fk'
            columns: ['org_id', 'client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['org_id', 'id']
          }
        ]
      }
      budget_entries: {
        Row: {
          id: string
          user_id: string
          org_id: string
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
          org_id: string
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
          org_id?: string
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
          },
          {
            foreignKeyName: 'budget_entries_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          }
        ]
      }
      budget_caps: {
        Row: {
          id: string
          user_id: string
          org_id: string
          scope: string
          amount_micros: number
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id: string
          scope: string
          amount_micros: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string
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
          },
          {
            foreignKeyName: 'budget_caps_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      is_org_member: {
        Args: { org: string }
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

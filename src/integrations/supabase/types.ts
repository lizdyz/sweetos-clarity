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
      cadence_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          key: string
          label: string
          max_value: number | null
          min_value: number | null
          sort_order: number
          step_value: number | null
          updated_at: string
          updated_by: string | null
          value_number: number
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          label: string
          max_value?: number | null
          min_value?: number | null
          sort_order?: number
          step_value?: number | null
          updated_at?: string
          updated_by?: string | null
          value_number: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          label?: string
          max_value?: number | null
          min_value?: number | null
          sort_order?: number
          step_value?: number | null
          updated_at?: string
          updated_by?: string | null
          value_number?: number
        }
        Relationships: []
      }
      campaign_contacts: {
        Row: {
          campaign_id: string
          relationship_id: string
        }
        Insert: {
          campaign_id: string
          relationship_id: string
        }
        Update: {
          campaign_id?: string
          relationship_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_contacts_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_projects: {
        Row: {
          campaign_id: string
          project_id: string
        }
        Insert: {
          campaign_id: string
          project_id: string
        }
        Update: {
          campaign_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_projects_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          blocked_by: string | null
          brief_for_next_action: string | null
          campaign_brief: string | null
          campaign_name: string
          created_at: string
          created_by: string
          deadline: string | null
          execution_prompt: string | null
          goal: string | null
          id: string
          key_deliverables: string | null
          next_executable_action: string | null
          next_milestone: string | null
          notes: string | null
          owner: string | null
          prompt_status: string | null
          revenue_target_usd: number | null
          status: string | null
          target_persona: string[] | null
          type: string | null
          updated_at: string
        }
        Insert: {
          blocked_by?: string | null
          brief_for_next_action?: string | null
          campaign_brief?: string | null
          campaign_name: string
          created_at?: string
          created_by?: string
          deadline?: string | null
          execution_prompt?: string | null
          goal?: string | null
          id?: string
          key_deliverables?: string | null
          next_executable_action?: string | null
          next_milestone?: string | null
          notes?: string | null
          owner?: string | null
          prompt_status?: string | null
          revenue_target_usd?: number | null
          status?: string | null
          target_persona?: string[] | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          blocked_by?: string | null
          brief_for_next_action?: string | null
          campaign_brief?: string | null
          campaign_name?: string
          created_at?: string
          created_by?: string
          deadline?: string | null
          execution_prompt?: string | null
          goal?: string | null
          id?: string
          key_deliverables?: string | null
          next_executable_action?: string | null
          next_milestone?: string | null
          notes?: string | null
          owner?: string | null
          prompt_status?: string | null
          revenue_target_usd?: number | null
          status?: string | null
          target_persona?: string[] | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      components: {
        Row: {
          created_at: string
          created_by: string
          created_from_session_id: string | null
          current_maturity_level:
            | Database["public"]["Enums"]["maturity_level"]
            | null
          description: string | null
          id: string
          journey_id: string | null
          last_reviewed: string | null
          maturity_threshold_definition: string | null
          name: string
          quality_status: Database["public"]["Enums"]["quality_status"] | null
          related_domains: string[] | null
          related_tenets: string[] | null
          related_workflows: string[] | null
          reuse_count: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          created_from_session_id?: string | null
          current_maturity_level?:
            | Database["public"]["Enums"]["maturity_level"]
            | null
          description?: string | null
          id?: string
          journey_id?: string | null
          last_reviewed?: string | null
          maturity_threshold_definition?: string | null
          name: string
          quality_status?: Database["public"]["Enums"]["quality_status"] | null
          related_domains?: string[] | null
          related_tenets?: string[] | null
          related_workflows?: string[] | null
          reuse_count?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          created_from_session_id?: string | null
          current_maturity_level?:
            | Database["public"]["Enums"]["maturity_level"]
            | null
          description?: string | null
          id?: string
          journey_id?: string | null
          last_reviewed?: string | null
          maturity_threshold_definition?: string | null
          name?: string
          quality_status?: Database["public"]["Enums"]["quality_status"] | null
          related_domains?: string[] | null
          related_tenets?: string[] | null
          related_workflows?: string[] | null
          reuse_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "components_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "components_session_fk"
            columns: ["created_from_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          context: string | null
          created_at: string
          created_by: string
          date_made: string | null
          decision: string
          domain: string | null
          id: string
          implications: string | null
          made_by: string | null
          related_project_id: string | null
          status: string | null
          supersedes: string | null
          updated_at: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          created_by?: string
          date_made?: string | null
          decision: string
          domain?: string | null
          id?: string
          implications?: string | null
          made_by?: string | null
          related_project_id?: string | null
          status?: string | null
          supersedes?: string | null
          updated_at?: string
        }
        Update: {
          context?: string | null
          created_at?: string
          created_by?: string
          date_made?: string | null
          decision?: string
          domain?: string | null
          id?: string
          implications?: string | null
          made_by?: string | null
          related_project_id?: string | null
          status?: string | null
          supersedes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_related_project_id_fkey"
            columns: ["related_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_supersedes_fkey"
            columns: ["supersedes"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      delegation: {
        Row: {
          can_be_delegated_to: string | null
          category: string | null
          created_at: string
          created_by: string
          currently_done_by: string | null
          delegation_type: string | null
          effort_to_hand_off: string | null
          id: string
          linked_project_id: string | null
          notes: string | null
          only_liz_can_do_this_because: string | null
          status: string | null
          task_or_responsibility: string
          updated_at: string
          what_would_make_it_delegatable: string | null
        }
        Insert: {
          can_be_delegated_to?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          currently_done_by?: string | null
          delegation_type?: string | null
          effort_to_hand_off?: string | null
          id?: string
          linked_project_id?: string | null
          notes?: string | null
          only_liz_can_do_this_because?: string | null
          status?: string | null
          task_or_responsibility: string
          updated_at?: string
          what_would_make_it_delegatable?: string | null
        }
        Update: {
          can_be_delegated_to?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          currently_done_by?: string | null
          delegation_type?: string | null
          effort_to_hand_off?: string | null
          id?: string
          linked_project_id?: string | null
          notes?: string | null
          only_liz_can_do_this_because?: string | null
          status?: string | null
          task_or_responsibility?: string
          updated_at?: string
          what_would_make_it_delegatable?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delegation_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          audience_primary_concern: string | null
          created_at: string
          created_by: string
          drive_chat_link: string | null
          execution_prompt: string | null
          for_client_id: string | null
          full_brief: string | null
          id: string
          last_reviewed: string | null
          length_format: string | null
          name: string
          notes: string | null
          owner: string | null
          prompt_status: string | null
          status: string | null
          tone_voice: string | null
          type: string | null
          updated_at: string
          used_in_workflows: string[] | null
          version: string | null
        }
        Insert: {
          audience_primary_concern?: string | null
          created_at?: string
          created_by?: string
          drive_chat_link?: string | null
          execution_prompt?: string | null
          for_client_id?: string | null
          full_brief?: string | null
          id?: string
          last_reviewed?: string | null
          length_format?: string | null
          name: string
          notes?: string | null
          owner?: string | null
          prompt_status?: string | null
          status?: string | null
          tone_voice?: string | null
          type?: string | null
          updated_at?: string
          used_in_workflows?: string[] | null
          version?: string | null
        }
        Update: {
          audience_primary_concern?: string | null
          created_at?: string
          created_by?: string
          drive_chat_link?: string | null
          execution_prompt?: string | null
          for_client_id?: string | null
          full_brief?: string | null
          id?: string
          last_reviewed?: string | null
          length_format?: string | null
          name?: string
          notes?: string | null
          owner?: string | null
          prompt_status?: string | null
          status?: string | null
          tone_voice?: string | null
          type?: string | null
          updated_at?: string
          used_in_workflows?: string[] | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_for_client_id_fkey"
            columns: ["for_client_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_assessments: {
        Row: {
          assessment_date: string | null
          client_id: string | null
          client_score: number | null
          confidence:
            | Database["public"]["Enums"]["intelligence_confidence"]
            | null
          created_at: string
          created_by: string
          domain: string
          gap: number | null
          gap_direction: string | null
          id: string
          liz_score: number | null
          name: string | null
          notes: string | null
          priority: string | null
          progression_note: string | null
          session_id: string | null
          spark_type_affinity: string[] | null
          updated_at: string
        }
        Insert: {
          assessment_date?: string | null
          client_id?: string | null
          client_score?: number | null
          confidence?:
            | Database["public"]["Enums"]["intelligence_confidence"]
            | null
          created_at?: string
          created_by?: string
          domain: string
          gap?: number | null
          gap_direction?: string | null
          id?: string
          liz_score?: number | null
          name?: string | null
          notes?: string | null
          priority?: string | null
          progression_note?: string | null
          session_id?: string | null
          spark_type_affinity?: string[] | null
          updated_at?: string
        }
        Update: {
          assessment_date?: string | null
          client_id?: string | null
          client_score?: number | null
          confidence?:
            | Database["public"]["Enums"]["intelligence_confidence"]
            | null
          created_at?: string
          created_by?: string
          domain?: string
          gap?: number | null
          gap_direction?: string | null
          id?: string
          liz_score?: number | null
          name?: string | null
          notes?: string | null
          priority?: string | null
          progression_note?: string | null
          session_id?: string | null
          spark_type_affinity?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_assessments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      journeys: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          related_domains: string[] | null
          related_tenets: string[] | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name: string
          related_domains?: string[] | null
          related_tenets?: string[] | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          related_domains?: string[] | null
          related_tenets?: string[] | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      missions: {
        Row: {
          activated_journeys: string[] | null
          client_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          status: string | null
          target_timeframe: string | null
          updated_at: string
        }
        Insert: {
          activated_journeys?: string[] | null
          client_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name: string
          status?: string | null
          target_timeframe?: string | null
          updated_at?: string
        }
        Update: {
          activated_journeys?: string[] | null
          client_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          target_timeframe?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      outcomes: {
        Row: {
          client_id: string | null
          component_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          measured_date: string | null
          measured_value: string | null
          outcome_type: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          component_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          measured_date?: string | null
          measured_value?: string | null
          outcome_type: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          component_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          measured_date?: string | null
          measured_value?: string | null
          outcome_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outcomes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcomes_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          autonomy_level: string | null
          contract_considerations: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          notes: string | null
          practice_structure: string | null
          real_examples: string | null
          regulatory_registration: string[] | null
          sector: string | null
          seed_adaptation_notes: string | null
          spec_status: Database["public"]["Enums"]["spec_status"] | null
          updated_at: string
        }
        Insert: {
          autonomy_level?: string | null
          contract_considerations?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name: string
          notes?: string | null
          practice_structure?: string | null
          real_examples?: string | null
          regulatory_registration?: string[] | null
          sector?: string | null
          seed_adaptation_notes?: string | null
          spec_status?: Database["public"]["Enums"]["spec_status"] | null
          updated_at?: string
        }
        Update: {
          autonomy_level?: string | null
          contract_considerations?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          notes?: string | null
          practice_structure?: string | null
          real_examples?: string | null
          regulatory_registration?: string[] | null
          sector?: string | null
          seed_adaptation_notes?: string | null
          spec_status?: Database["public"]["Enums"]["spec_status"] | null
          updated_at?: string
        }
        Relationships: []
      }
      playbook_workflows: {
        Row: {
          playbook_id: string
          workflow_id: string
        }
        Insert: {
          playbook_id: string
          workflow_id: string
        }
        Update: {
          playbook_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_workflows_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_workflows_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      playbooks: {
        Row: {
          best_practice_path: string | null
          bizzybot_signals: string[] | null
          cadence: string | null
          client_journey_note: string | null
          contract_rules_surfaced: string | null
          created_at: string
          created_by: string
          id: string
          minimum_viable_seed: string | null
          name: string
          named_alternates: string | null
          persona_id: string | null
          required_inputs: string[] | null
          seed_intelligence_layer: string | null
          service: string | null
          spec_status: Database["public"]["Enums"]["spec_status"] | null
          updated_at: string
          what_we_have_learned: string | null
        }
        Insert: {
          best_practice_path?: string | null
          bizzybot_signals?: string[] | null
          cadence?: string | null
          client_journey_note?: string | null
          contract_rules_surfaced?: string | null
          created_at?: string
          created_by?: string
          id?: string
          minimum_viable_seed?: string | null
          name: string
          named_alternates?: string | null
          persona_id?: string | null
          required_inputs?: string[] | null
          seed_intelligence_layer?: string | null
          service?: string | null
          spec_status?: Database["public"]["Enums"]["spec_status"] | null
          updated_at?: string
          what_we_have_learned?: string | null
        }
        Update: {
          best_practice_path?: string | null
          bizzybot_signals?: string[] | null
          cadence?: string | null
          client_journey_note?: string | null
          contract_rules_surfaced?: string | null
          created_at?: string
          created_by?: string
          id?: string
          minimum_viable_seed?: string | null
          name?: string
          named_alternates?: string | null
          persona_id?: string | null
          required_inputs?: string[] | null
          seed_intelligence_layer?: string | null
          service?: string | null
          spec_status?: Database["public"]["Enums"]["spec_status"] | null
          updated_at?: string
          what_we_have_learned?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playbooks_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          role_label: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          role_label?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role_label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string
          current_blocker_specific: string | null
          deadline: string | null
          dependencies: string | null
          execution_prompt: string | null
          id: string
          last_updated: string | null
          name: string
          next_action: string | null
          next_action_due: string | null
          next_deliverable_specific: string | null
          owner: string | null
          priority: string | null
          project_brief: string | null
          prompt_status: string | null
          revenue_potential_usd: number | null
          sprint: string | null
          status: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string
          current_blocker_specific?: string | null
          deadline?: string | null
          dependencies?: string | null
          execution_prompt?: string | null
          id?: string
          last_updated?: string | null
          name: string
          next_action?: string | null
          next_action_due?: string | null
          next_deliverable_specific?: string | null
          owner?: string | null
          priority?: string | null
          project_brief?: string | null
          prompt_status?: string | null
          revenue_potential_usd?: number | null
          sprint?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string
          current_blocker_specific?: string | null
          deadline?: string | null
          dependencies?: string | null
          execution_prompt?: string | null
          id?: string
          last_updated?: string | null
          name?: string
          next_action?: string | null
          next_action_due?: string | null
          next_deliverable_specific?: string | null
          owner?: string | null
          priority?: string | null
          project_brief?: string | null
          prompt_status?: string | null
          revenue_potential_usd?: number | null
          sprint?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          bizzybot_perspective: string | null
          components_advanced: Json | null
          created_at: string
          created_by: string
          deliverable_produced_id: string | null
          description: string | null
          framework_lens: string | null
          id: string
          journey_id: string | null
          name: string
          progression_state:
            | Database["public"]["Enums"]["progression_state"]
            | null
          source_of_advancement:
            | Database["public"]["Enums"]["source_of_advancement"]
            | null
          updated_at: string
        }
        Insert: {
          bizzybot_perspective?: string | null
          components_advanced?: Json | null
          created_at?: string
          created_by?: string
          deliverable_produced_id?: string | null
          description?: string | null
          framework_lens?: string | null
          id?: string
          journey_id?: string | null
          name: string
          progression_state?:
            | Database["public"]["Enums"]["progression_state"]
            | null
          source_of_advancement?:
            | Database["public"]["Enums"]["source_of_advancement"]
            | null
          updated_at?: string
        }
        Update: {
          bizzybot_perspective?: string | null
          components_advanced?: Json | null
          created_at?: string
          created_by?: string
          deliverable_produced_id?: string | null
          description?: string | null
          framework_lens?: string | null
          id?: string
          journey_id?: string | null
          name?: string
          progression_state?:
            | Database["public"]["Enums"]["progression_state"]
            | null
          source_of_advancement?:
            | Database["public"]["Enums"]["source_of_advancement"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quests_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      relationships: {
        Row: {
          active_services: string[] | null
          ai_sophistication: string | null
          brief_for_next_touchpoint: string | null
          company: string | null
          created_at: string
          created_by: string
          email: string | null
          execution_prompt: string | null
          geography: string | null
          id: string
          ideal_next_touchpoint: string | null
          intelligence_confidence:
            | Database["public"]["Enums"]["intelligence_confidence"]
            | null
          intelligence_summary: string | null
          last_contact: string | null
          last_touchpoint_type: string | null
          mirror_status: string | null
          name: string
          narrative_persona: string | null
          next_action: string | null
          next_action_due: string | null
          notes: string | null
          persona_id: string | null
          pipeline_stage: string | null
          portal_delivered: boolean | null
          portal_link: string | null
          prompt_status: string | null
          referred_by: string | null
          revenue_potential_usd: number | null
          role: string | null
          sessions_purchased: number | null
          sessions_remaining: number | null
          sessions_used: number | null
          status: string | null
          sweetconnect_credits: number | null
          sweetconnect_credits_used: number | null
          type: string | null
          updated_at: string
        }
        Insert: {
          active_services?: string[] | null
          ai_sophistication?: string | null
          brief_for_next_touchpoint?: string | null
          company?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          execution_prompt?: string | null
          geography?: string | null
          id?: string
          ideal_next_touchpoint?: string | null
          intelligence_confidence?:
            | Database["public"]["Enums"]["intelligence_confidence"]
            | null
          intelligence_summary?: string | null
          last_contact?: string | null
          last_touchpoint_type?: string | null
          mirror_status?: string | null
          name: string
          narrative_persona?: string | null
          next_action?: string | null
          next_action_due?: string | null
          notes?: string | null
          persona_id?: string | null
          pipeline_stage?: string | null
          portal_delivered?: boolean | null
          portal_link?: string | null
          prompt_status?: string | null
          referred_by?: string | null
          revenue_potential_usd?: number | null
          role?: string | null
          sessions_purchased?: number | null
          sessions_remaining?: number | null
          sessions_used?: number | null
          status?: string | null
          sweetconnect_credits?: number | null
          sweetconnect_credits_used?: number | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          active_services?: string[] | null
          ai_sophistication?: string | null
          brief_for_next_touchpoint?: string | null
          company?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          execution_prompt?: string | null
          geography?: string | null
          id?: string
          ideal_next_touchpoint?: string | null
          intelligence_confidence?:
            | Database["public"]["Enums"]["intelligence_confidence"]
            | null
          intelligence_summary?: string | null
          last_contact?: string | null
          last_touchpoint_type?: string | null
          mirror_status?: string | null
          name?: string
          narrative_persona?: string | null
          next_action?: string | null
          next_action_due?: string | null
          notes?: string | null
          persona_id?: string | null
          pipeline_stage?: string | null
          portal_delivered?: boolean | null
          portal_link?: string | null
          prompt_status?: string | null
          referred_by?: string | null
          revenue_potential_usd?: number | null
          role?: string | null
          sessions_purchased?: number | null
          sessions_remaining?: number | null
          sessions_used?: number | null
          status?: string | null
          sweetconnect_credits?: number | null
          sweetconnect_credits_used?: number | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationships_persona_fk"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      session_components: {
        Row: {
          advancement_type: string | null
          component_id: string
          session_id: string
        }
        Insert: {
          advancement_type?: string | null
          component_id: string
          session_id: string
        }
        Update: {
          advancement_type?: string | null
          component_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_components_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_deliverables: {
        Row: {
          document_id: string
          session_id: string
        }
        Insert: {
          document_id: string
          session_id: string
        }
        Update: {
          document_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_deliverables_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_deliverables_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          biggest_gap: string | null
          client_perception_summary: string | null
          confidence:
            | Database["public"]["Enums"]["intelligence_confidence"]
            | null
          created_at: string
          created_by: string
          delivery_variation: string | null
          id: string
          key_findings: string | null
          linked_project_id: string | null
          name: string
          next_recommended_service: string | null
          persona_id: string | null
          playbook_id: string | null
          progression_state:
            | Database["public"]["Enums"]["progression_state"]
            | null
          reality_assessment_summary: string | null
          relationship_id: string | null
          seed_status: string | null
          seed_submitted: boolean | null
          service: string | null
          session_date: string | null
          session_number: number | null
          ship_status: string | null
          source_of_advancement:
            | Database["public"]["Enums"]["source_of_advancement"]
            | null
          status: string | null
          sweetcycle_phase:
            | Database["public"]["Enums"]["sweetcycle_phase"]
            | null
          sync_status: string | null
          updated_at: string
          what_i_learned: string | null
          workflow_id: string | null
        }
        Insert: {
          biggest_gap?: string | null
          client_perception_summary?: string | null
          confidence?:
            | Database["public"]["Enums"]["intelligence_confidence"]
            | null
          created_at?: string
          created_by?: string
          delivery_variation?: string | null
          id?: string
          key_findings?: string | null
          linked_project_id?: string | null
          name: string
          next_recommended_service?: string | null
          persona_id?: string | null
          playbook_id?: string | null
          progression_state?:
            | Database["public"]["Enums"]["progression_state"]
            | null
          reality_assessment_summary?: string | null
          relationship_id?: string | null
          seed_status?: string | null
          seed_submitted?: boolean | null
          service?: string | null
          session_date?: string | null
          session_number?: number | null
          ship_status?: string | null
          source_of_advancement?:
            | Database["public"]["Enums"]["source_of_advancement"]
            | null
          status?: string | null
          sweetcycle_phase?:
            | Database["public"]["Enums"]["sweetcycle_phase"]
            | null
          sync_status?: string | null
          updated_at?: string
          what_i_learned?: string | null
          workflow_id?: string | null
        }
        Update: {
          biggest_gap?: string | null
          client_perception_summary?: string | null
          confidence?:
            | Database["public"]["Enums"]["intelligence_confidence"]
            | null
          created_at?: string
          created_by?: string
          delivery_variation?: string | null
          id?: string
          key_findings?: string | null
          linked_project_id?: string | null
          name?: string
          next_recommended_service?: string | null
          persona_id?: string | null
          playbook_id?: string | null
          progression_state?:
            | Database["public"]["Enums"]["progression_state"]
            | null
          reality_assessment_summary?: string | null
          relationship_id?: string | null
          seed_status?: string | null
          seed_submitted?: boolean | null
          service?: string | null
          session_date?: string | null
          session_number?: number | null
          ship_status?: string | null
          source_of_advancement?:
            | Database["public"]["Enums"]["source_of_advancement"]
            | null
          status?: string | null
          sweetcycle_phase?:
            | Database["public"]["Enums"]["sweetcycle_phase"]
            | null
          sync_status?: string | null
          updated_at?: string
          what_i_learned?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      sparks: {
        Row: {
          affected_components: string[] | null
          affected_domains: string[] | null
          affected_tenets: string[] | null
          captured_answer: string | null
          confidence:
            | Database["public"]["Enums"]["intelligence_confidence"]
            | null
          content: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          progression_state:
            | Database["public"]["Enums"]["progression_state"]
            | null
          quest_id: string | null
          sequence_order: number | null
          source_of_advancement:
            | Database["public"]["Enums"]["source_of_advancement"]
            | null
          spark_type: Database["public"]["Enums"]["spark_type"] | null
          updated_at: string
        }
        Insert: {
          affected_components?: string[] | null
          affected_domains?: string[] | null
          affected_tenets?: string[] | null
          captured_answer?: string | null
          confidence?:
            | Database["public"]["Enums"]["intelligence_confidence"]
            | null
          content?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name: string
          progression_state?:
            | Database["public"]["Enums"]["progression_state"]
            | null
          quest_id?: string | null
          sequence_order?: number | null
          source_of_advancement?:
            | Database["public"]["Enums"]["source_of_advancement"]
            | null
          spark_type?: Database["public"]["Enums"]["spark_type"] | null
          updated_at?: string
        }
        Update: {
          affected_components?: string[] | null
          affected_domains?: string[] | null
          affected_tenets?: string[] | null
          captured_answer?: string | null
          confidence?:
            | Database["public"]["Enums"]["intelligence_confidence"]
            | null
          content?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          progression_state?:
            | Database["public"]["Enums"]["progression_state"]
            | null
          quest_id?: string | null
          sequence_order?: number | null
          source_of_advancement?:
            | Database["public"]["Enums"]["source_of_advancement"]
            | null
          spark_type?: Database["public"]["Enums"]["spark_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sparks_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          context_to_load: string | null
          created_at: string
          created_by: string
          deliverable_specific: string | null
          dependencies: string | null
          due_date: string | null
          effort: string | null
          execution_prompt: string | null
          for_whom: string | null
          frameworks_lenses: string[] | null
          id: string
          name: string
          notes: string | null
          output_format: string | null
          output_link: string | null
          owner: string | null
          priority: string | null
          project_id: string | null
          prompt_status: string | null
          recurring: boolean | null
          recurring_cadence: string | null
          relationship_id: string | null
          status: string | null
          success_criteria: string | null
          updated_at: string
          waiting_on: string | null
        }
        Insert: {
          context_to_load?: string | null
          created_at?: string
          created_by?: string
          deliverable_specific?: string | null
          dependencies?: string | null
          due_date?: string | null
          effort?: string | null
          execution_prompt?: string | null
          for_whom?: string | null
          frameworks_lenses?: string[] | null
          id?: string
          name: string
          notes?: string | null
          output_format?: string | null
          output_link?: string | null
          owner?: string | null
          priority?: string | null
          project_id?: string | null
          prompt_status?: string | null
          recurring?: boolean | null
          recurring_cadence?: string | null
          relationship_id?: string | null
          status?: string | null
          success_criteria?: string | null
          updated_at?: string
          waiting_on?: string | null
        }
        Update: {
          context_to_load?: string | null
          created_at?: string
          created_by?: string
          deliverable_specific?: string | null
          dependencies?: string | null
          due_date?: string | null
          effort?: string | null
          execution_prompt?: string | null
          for_whom?: string | null
          frameworks_lenses?: string[] | null
          id?: string
          name?: string
          notes?: string | null
          output_format?: string | null
          output_link?: string | null
          owner?: string | null
          priority?: string | null
          project_id?: string | null
          prompt_status?: string | null
          recurring?: boolean | null
          recurring_cadence?: string | null
          relationship_id?: string | null
          status?: string | null
          success_criteria?: string | null
          updated_at?: string
          waiting_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
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
      workflow_components: {
        Row: {
          component_id: string
          workflow_id: string
        }
        Insert: {
          component_id: string
          workflow_id: string
        }
        Update: {
          component_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_components_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_domains: {
        Row: {
          domain: string
          workflow_id: string
        }
        Insert: {
          domain: string
          workflow_id: string
        }
        Update: {
          domain?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_domains_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_states: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          id: string
          notes: string | null
          source_of_advancement:
            | Database["public"]["Enums"]["source_of_advancement"]
            | null
          state_of_the_thing:
            | Database["public"]["Enums"]["state_of_the_thing"]
            | null
          updated_at: string
          workflow_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          source_of_advancement?:
            | Database["public"]["Enums"]["source_of_advancement"]
            | null
          state_of_the_thing?:
            | Database["public"]["Enums"]["state_of_the_thing"]
            | null
          updated_at?: string
          workflow_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          source_of_advancement?:
            | Database["public"]["Enums"]["source_of_advancement"]
            | null
          state_of_the_thing?:
            | Database["public"]["Enums"]["state_of_the_thing"]
            | null
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_states_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_states_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          machine_available: boolean | null
          map_available: boolean | null
          name: string
          notes: string | null
          origin_client: string | null
          quality_status: Database["public"]["Enums"]["quality_status"] | null
          related_tenets: string[] | null
          required_inputs: string[] | null
          reuse_count: number | null
          sweetsync_decomposed: boolean | null
          theme: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          machine_available?: boolean | null
          map_available?: boolean | null
          name: string
          notes?: string | null
          origin_client?: string | null
          quality_status?: Database["public"]["Enums"]["quality_status"] | null
          related_tenets?: string[] | null
          required_inputs?: string[] | null
          reuse_count?: number | null
          sweetsync_decomposed?: boolean | null
          theme?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          machine_available?: boolean | null
          map_available?: boolean | null
          name?: string
          notes?: string | null
          origin_client?: string | null
          quality_status?: Database["public"]["Enums"]["quality_status"] | null
          related_tenets?: string[] | null
          required_inputs?: string[] | null
          reuse_count?: number | null
          sweetsync_decomposed?: boolean | null
          theme?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_origin_client_fkey"
            columns: ["origin_client"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
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
      is_team_member: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "member"
      intelligence_confidence:
        | "Not Yet Verified"
        | "Inferred"
        | "Observed"
        | "Verified"
        | "Confirmed"
      maturity_level:
        | "L1 Lacking"
        | "L2 Learning"
        | "L3 Launching"
        | "L4 Leveraging"
        | "L5 Leading"
      progression_state:
        | "Not Started"
        | "Open"
        | "Pre-filled"
        | "Provisionally Satisfied"
        | "Completed by you"
        | "Completed with Liz"
        | "Completed for you"
        | "Confirmed Complete"
        | "Skipped"
        | "Reopened"
        | "Superseded"
      quality_status: "Draft" | "Tested" | "Proven" | "Canonical"
      source_of_advancement:
        | "Seed"
        | "Mirror"
        | "Map Session"
        | "Machine Build"
        | "SweetSync Spark"
        | "SweetSync Quest"
        | "Uploaded Material"
        | "Session Judgment"
        | "Observation"
        | "System Extract"
        | "Client Self-Report"
      spark_type:
        | "Question"
        | "Creation"
        | "Definition"
        | "Decision"
        | "Reflection"
        | "Action"
      spec_status: "Emerging" | "Draft" | "Proven" | "Refined"
      state_of_the_thing:
        | "Identified"
        | "Defined"
        | "Designed"
        | "Built"
        | "Delivered"
        | "Adopted"
        | "Sustained"
      sweetcycle_phase: "Seed" | "Synthesize" | "Session" | "Sync" | "Ship"
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
      app_role: ["admin", "member"],
      intelligence_confidence: [
        "Not Yet Verified",
        "Inferred",
        "Observed",
        "Verified",
        "Confirmed",
      ],
      maturity_level: [
        "L1 Lacking",
        "L2 Learning",
        "L3 Launching",
        "L4 Leveraging",
        "L5 Leading",
      ],
      progression_state: [
        "Not Started",
        "Open",
        "Pre-filled",
        "Provisionally Satisfied",
        "Completed by you",
        "Completed with Liz",
        "Completed for you",
        "Confirmed Complete",
        "Skipped",
        "Reopened",
        "Superseded",
      ],
      quality_status: ["Draft", "Tested", "Proven", "Canonical"],
      source_of_advancement: [
        "Seed",
        "Mirror",
        "Map Session",
        "Machine Build",
        "SweetSync Spark",
        "SweetSync Quest",
        "Uploaded Material",
        "Session Judgment",
        "Observation",
        "System Extract",
        "Client Self-Report",
      ],
      spark_type: [
        "Question",
        "Creation",
        "Definition",
        "Decision",
        "Reflection",
        "Action",
      ],
      spec_status: ["Emerging", "Draft", "Proven", "Refined"],
      state_of_the_thing: [
        "Identified",
        "Defined",
        "Designed",
        "Built",
        "Delivered",
        "Adopted",
        "Sustained",
      ],
      sweetcycle_phase: ["Seed", "Synthesize", "Session", "Sync", "Ship"],
    },
  },
} as const

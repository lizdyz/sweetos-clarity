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
      agent_runs: {
        Row: {
          cadence: string | null
          created_at: string
          created_by: string | null
          error: string | null
          finished_at: string | null
          id: string
          notes: string | null
          operator_id: string
          proposals_count: number
          started_at: string | null
          status: string
        }
        Insert: {
          cadence?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          notes?: string | null
          operator_id: string
          proposals_count?: number
          started_at?: string | null
          status?: string
        }
        Update: {
          cadence?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          notes?: string | null
          operator_id?: string
          proposals_count?: number
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operator_workload"
            referencedColumns: ["operator_id"]
          },
          {
            foreignKeyName: "agent_runs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
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
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
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
            referencedRelation: "project_rollup"
            referencedColumns: ["project_id"]
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
          confidence: number | null
          created_at: string
          created_by: string
          deadline: string | null
          execution_prompt: string | null
          goal: string | null
          id: string
          key_deliverables: string | null
          next_executable_action: string | null
          next_milestone: string | null
          not_before: string | null
          notes: string | null
          operator_id: string | null
          owner: string | null
          prompt_status: string | null
          proposal_id: string | null
          recurrence_parent_id: string | null
          recurrence_rule: string | null
          revenue_target_usd: number | null
          scheduled_for: string | null
          source: Database["public"]["Enums"]["proposal_source"] | null
          source_ref: string | null
          status: string | null
          tagged_components: string[]
          tagged_domains: string[]
          tagged_tenets: string[]
          target_persona: string[] | null
          type: string | null
          updated_at: string
        }
        Insert: {
          blocked_by?: string | null
          brief_for_next_action?: string | null
          campaign_brief?: string | null
          campaign_name: string
          confidence?: number | null
          created_at?: string
          created_by?: string
          deadline?: string | null
          execution_prompt?: string | null
          goal?: string | null
          id?: string
          key_deliverables?: string | null
          next_executable_action?: string | null
          next_milestone?: string | null
          not_before?: string | null
          notes?: string | null
          operator_id?: string | null
          owner?: string | null
          prompt_status?: string | null
          proposal_id?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          revenue_target_usd?: number | null
          scheduled_for?: string | null
          source?: Database["public"]["Enums"]["proposal_source"] | null
          source_ref?: string | null
          status?: string | null
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          target_persona?: string[] | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          blocked_by?: string | null
          brief_for_next_action?: string | null
          campaign_brief?: string | null
          campaign_name?: string
          confidence?: number | null
          created_at?: string
          created_by?: string
          deadline?: string | null
          execution_prompt?: string | null
          goal?: string | null
          id?: string
          key_deliverables?: string | null
          next_executable_action?: string | null
          next_milestone?: string | null
          not_before?: string | null
          notes?: string | null
          operator_id?: string | null
          owner?: string | null
          prompt_status?: string | null
          proposal_id?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          revenue_target_usd?: number | null
          scheduled_for?: string | null
          source?: Database["public"]["Enums"]["proposal_source"] | null
          source_ref?: string | null
          status?: string | null
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          target_persona?: string[] | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operator_workload"
            referencedColumns: ["operator_id"]
          },
          {
            foreignKeyName: "campaigns_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      capture_attachments: {
        Row: {
          created_at: string
          created_by: string
          entity_id: string | null
          entity_table: string | null
          extracted_text: string | null
          id: string
          mime_type: string | null
          original_name: string
          proposal_id: string | null
          size_bytes: number | null
          source: string
          storage_path: string
          tagged_components: string[]
          tagged_domains: string[]
          tagged_personas: string[]
          tagged_relationships: string[]
          tagged_tenets: string[]
          visibility: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          entity_id?: string | null
          entity_table?: string | null
          extracted_text?: string | null
          id?: string
          mime_type?: string | null
          original_name: string
          proposal_id?: string | null
          size_bytes?: number | null
          source?: string
          storage_path: string
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_personas?: string[]
          tagged_relationships?: string[]
          tagged_tenets?: string[]
          visibility?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          entity_id?: string | null
          entity_table?: string | null
          extracted_text?: string | null
          id?: string
          mime_type?: string | null
          original_name?: string
          proposal_id?: string | null
          size_bytes?: number | null
          source?: string
          storage_path?: string
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_personas?: string[]
          tagged_relationships?: string[]
          tagged_tenets?: string[]
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "capture_attachments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      component_outputs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body_md: string | null
          component_id: string
          created_at: string
          created_by: string
          for_persona_id: string | null
          for_relationship_id: string | null
          generated_at: string | null
          generated_by_model: string | null
          generated_by_operator_id: string | null
          generation_prompt_key: string | null
          id: string
          notes: string | null
          output_kind: string
          status: string
          storage_path: string | null
          supersedes: string | null
          title: string
          updated_at: string
          version: number
          visibility: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body_md?: string | null
          component_id: string
          created_at?: string
          created_by?: string
          for_persona_id?: string | null
          for_relationship_id?: string | null
          generated_at?: string | null
          generated_by_model?: string | null
          generated_by_operator_id?: string | null
          generation_prompt_key?: string | null
          id?: string
          notes?: string | null
          output_kind: string
          status?: string
          storage_path?: string | null
          supersedes?: string | null
          title: string
          updated_at?: string
          version?: number
          visibility?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body_md?: string | null
          component_id?: string
          created_at?: string
          created_by?: string
          for_persona_id?: string | null
          for_relationship_id?: string | null
          generated_at?: string | null
          generated_by_model?: string | null
          generated_by_operator_id?: string | null
          generation_prompt_key?: string | null
          id?: string
          notes?: string | null
          output_kind?: string
          status?: string
          storage_path?: string | null
          supersedes?: string | null
          title?: string
          updated_at?: string
          version?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "component_outputs_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "component_build_pipeline"
            referencedColumns: ["component_id"]
          },
          {
            foreignKeyName: "component_outputs_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_outputs_for_persona_id_fkey"
            columns: ["for_persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_outputs_for_relationship_id_fkey"
            columns: ["for_relationship_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
          {
            foreignKeyName: "component_outputs_for_relationship_id_fkey"
            columns: ["for_relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_outputs_generated_by_operator_id_fkey"
            columns: ["generated_by_operator_id"]
            isOneToOne: false
            referencedRelation: "operator_workload"
            referencedColumns: ["operator_id"]
          },
          {
            foreignKeyName: "component_outputs_generated_by_operator_id_fkey"
            columns: ["generated_by_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_outputs_supersedes_fkey"
            columns: ["supersedes"]
            isOneToOne: false
            referencedRelation: "component_outputs"
            referencedColumns: ["id"]
          },
        ]
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
          prerequisite_component_ids: string[]
          quality_status: Database["public"]["Enums"]["quality_status"] | null
          questions_it_answers: string | null
          related_domains: string[] | null
          related_tenets: string[] | null
          related_workflows: string[] | null
          responsible_operator_id: string | null
          reuse_count: number | null
          typical_session_length: string | null
          updated_at: string
          used_in_offerings: string[]
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
          prerequisite_component_ids?: string[]
          quality_status?: Database["public"]["Enums"]["quality_status"] | null
          questions_it_answers?: string | null
          related_domains?: string[] | null
          related_tenets?: string[] | null
          related_workflows?: string[] | null
          responsible_operator_id?: string | null
          reuse_count?: number | null
          typical_session_length?: string | null
          updated_at?: string
          used_in_offerings?: string[]
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
          prerequisite_component_ids?: string[]
          quality_status?: Database["public"]["Enums"]["quality_status"] | null
          questions_it_answers?: string | null
          related_domains?: string[] | null
          related_tenets?: string[] | null
          related_workflows?: string[] | null
          responsible_operator_id?: string | null
          reuse_count?: number | null
          typical_session_length?: string | null
          updated_at?: string
          used_in_offerings?: string[]
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
            foreignKeyName: "components_responsible_operator_id_fkey"
            columns: ["responsible_operator_id"]
            isOneToOne: false
            referencedRelation: "operator_workload"
            referencedColumns: ["operator_id"]
          },
          {
            foreignKeyName: "components_responsible_operator_id_fkey"
            columns: ["responsible_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "components_session_fk"
            columns: ["created_from_session_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["current_session_id"]
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
          ocda_stage: string | null
          related_project_id: string | null
          status: string | null
          supersedes: string | null
          tagged_components: string[]
          tagged_domains: string[]
          tagged_tenets: string[]
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
          ocda_stage?: string | null
          related_project_id?: string | null
          status?: string | null
          supersedes?: string | null
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
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
          ocda_stage?: string | null
          related_project_id?: string | null
          status?: string | null
          supersedes?: string | null
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_related_project_id_fkey"
            columns: ["related_project_id"]
            isOneToOne: false
            referencedRelation: "project_rollup"
            referencedColumns: ["project_id"]
          },
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
          tagged_components: string[]
          tagged_domains: string[]
          tagged_tenets: string[]
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
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
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
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          task_or_responsibility?: string
          updated_at?: string
          what_would_make_it_delegatable?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delegation_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "project_rollup"
            referencedColumns: ["project_id"]
          },
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
          component_template_for: string | null
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
          related_session_id: string | null
          reusability_tier:
            | Database["public"]["Enums"]["reusability_tier"]
            | null
          session_phase: Database["public"]["Enums"]["session_phase"] | null
          status: string | null
          tagged_components: string[]
          tagged_domains: string[]
          tagged_tenets: string[]
          tone_voice: string | null
          type: string | null
          updated_at: string
          used_in_workflows: string[] | null
          version: string | null
        }
        Insert: {
          audience_primary_concern?: string | null
          component_template_for?: string | null
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
          related_session_id?: string | null
          reusability_tier?:
            | Database["public"]["Enums"]["reusability_tier"]
            | null
          session_phase?: Database["public"]["Enums"]["session_phase"] | null
          status?: string | null
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          tone_voice?: string | null
          type?: string | null
          updated_at?: string
          used_in_workflows?: string[] | null
          version?: string | null
        }
        Update: {
          audience_primary_concern?: string | null
          component_template_for?: string | null
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
          related_session_id?: string | null
          reusability_tier?:
            | Database["public"]["Enums"]["reusability_tier"]
            | null
          session_phase?: Database["public"]["Enums"]["session_phase"] | null
          status?: string | null
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          tone_voice?: string | null
          type?: string | null
          updated_at?: string
          used_in_workflows?: string[] | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_component_template_fk"
            columns: ["component_template_for"]
            isOneToOne: false
            referencedRelation: "component_build_pipeline"
            referencedColumns: ["component_id"]
          },
          {
            foreignKeyName: "documents_component_template_fk"
            columns: ["component_template_for"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_for_client_id_fkey"
            columns: ["for_client_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
          {
            foreignKeyName: "documents_for_client_id_fkey"
            columns: ["for_client_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_related_session_fk"
            columns: ["related_session_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["current_session_id"]
          },
          {
            foreignKeyName: "documents_related_session_fk"
            columns: ["related_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
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
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
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
            referencedRelation: "relationship_journey"
            referencedColumns: ["current_session_id"]
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
      domain_curators: {
        Row: {
          created_at: string
          created_by: string
          domain_id: string
          id: string
          operator_id: string
          role: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          domain_id: string
          id?: string
          operator_id: string
          role?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          domain_id?: string
          id?: string
          operator_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_curators_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_curators_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "relationship_domain_maturity"
            referencedColumns: ["domain_id"]
          },
          {
            foreignKeyName: "domain_curators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operator_workload"
            referencedColumns: ["operator_id"]
          },
          {
            foreignKeyName: "domain_curators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_tenets: {
        Row: {
          domain_id: string
          tenet_id: string
        }
        Insert: {
          domain_id: string
          tenet_id: string
        }
        Update: {
          domain_id?: string
          tenet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_tenets_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_tenets_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "relationship_domain_maturity"
            referencedColumns: ["domain_id"]
          },
          {
            foreignKeyName: "domain_tenets_tenet_id_fkey"
            columns: ["tenet_id"]
            isOneToOne: false
            referencedRelation: "tenets"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          enabled: boolean
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      engagement_plans: {
        Row: {
          created_at: string
          created_by: string
          end_date: string | null
          expected_domains: string[]
          id: string
          machine_roadmap: string | null
          map_roadmap: string | null
          notes: string | null
          plan_name: string
          relationship_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["engagement_plan_status"]
          total_revenue_usd: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          end_date?: string | null
          expected_domains?: string[]
          id?: string
          machine_roadmap?: string | null
          map_roadmap?: string | null
          notes?: string | null
          plan_name: string
          relationship_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["engagement_plan_status"]
          total_revenue_usd?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string | null
          expected_domains?: string[]
          id?: string
          machine_roadmap?: string | null
          map_roadmap?: string | null
          notes?: string | null
          plan_name?: string
          relationship_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["engagement_plan_status"]
          total_revenue_usd?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_plans_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
          {
            foreignKeyName: "engagement_plans_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_services: {
        Row: {
          created_at: string
          created_by: string
          end_date: string | null
          id: string
          not_before: string | null
          notes: string | null
          plan_id: string | null
          recurrence_parent_id: string | null
          recurrence_rule: string | null
          relationship_id: string
          scheduled_for: string | null
          service_type: Database["public"]["Enums"]["engagement_service_type"]
          sessions_purchased: number | null
          sessions_used: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["engagement_service_status"]
          target_completion_date: string | null
          total_value_usd: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          end_date?: string | null
          id?: string
          not_before?: string | null
          notes?: string | null
          plan_id?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          relationship_id: string
          scheduled_for?: string | null
          service_type: Database["public"]["Enums"]["engagement_service_type"]
          sessions_purchased?: number | null
          sessions_used?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["engagement_service_status"]
          target_completion_date?: string | null
          total_value_usd?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string | null
          id?: string
          not_before?: string | null
          notes?: string | null
          plan_id?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          relationship_id?: string
          scheduled_for?: string | null
          service_type?: Database["public"]["Enums"]["engagement_service_type"]
          sessions_purchased?: number | null
          sessions_used?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["engagement_service_status"]
          target_completion_date?: string | null
          total_value_usd?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_services_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "engagement_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_services_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "engagement_service_rollup"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "engagement_services_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "engagement_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_services_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
          {
            foreignKeyName: "engagement_services_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_audit_log: {
        Row: {
          agent_run_id: string | null
          change_type: string
          created_at: string
          created_by: string | null
          field: string | null
          id: string
          model: string | null
          new_value: Json | null
          notes: string | null
          old_value: Json | null
          operator_id: string | null
          source: string
          subject_id: string
          subject_kind: string
        }
        Insert: {
          agent_run_id?: string | null
          change_type?: string
          created_at?: string
          created_by?: string | null
          field?: string | null
          id?: string
          model?: string | null
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          operator_id?: string | null
          source?: string
          subject_id: string
          subject_kind: string
        }
        Update: {
          agent_run_id?: string | null
          change_type?: string
          created_at?: string
          created_by?: string | null
          field?: string | null
          id?: string
          model?: string | null
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          operator_id?: string | null
          source?: string
          subject_id?: string
          subject_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_audit_log_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operator_workload"
            referencedColumns: ["operator_id"]
          },
          {
            foreignKeyName: "entity_audit_log_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_crib_sheets: {
        Row: {
          common_pitfalls: string[]
          core_principles: string[]
          created_at: string
          created_by: string
          generated_at: string
          generated_by_model: string | null
          id: string
          is_pinned: boolean
          quick_facts: string[]
          signature_metrics: string[]
          subject_id: string
          subject_kind: Database["public"]["Enums"]["lens_subject_kind"]
          tldr: string | null
          updated_at: string
          version: number
        }
        Insert: {
          common_pitfalls?: string[]
          core_principles?: string[]
          created_at?: string
          created_by?: string
          generated_at?: string
          generated_by_model?: string | null
          id?: string
          is_pinned?: boolean
          quick_facts?: string[]
          signature_metrics?: string[]
          subject_id: string
          subject_kind: Database["public"]["Enums"]["lens_subject_kind"]
          tldr?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          common_pitfalls?: string[]
          core_principles?: string[]
          created_at?: string
          created_by?: string
          generated_at?: string
          generated_by_model?: string | null
          id?: string
          is_pinned?: boolean
          quick_facts?: string[]
          signature_metrics?: string[]
          subject_id?: string
          subject_kind?: Database["public"]["Enums"]["lens_subject_kind"]
          tldr?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      excellence_checklist_progress: {
        Row: {
          checked: boolean
          checked_at: string
          checked_by: string | null
          checklist_item_index: number
          created_at: string
          id: string
          notes: string | null
          relationship_id: string
          rubric_id: string
          updated_at: string
        }
        Insert: {
          checked?: boolean
          checked_at?: string
          checked_by?: string | null
          checklist_item_index: number
          created_at?: string
          id?: string
          notes?: string | null
          relationship_id: string
          rubric_id: string
          updated_at?: string
        }
        Update: {
          checked?: boolean
          checked_at?: string
          checked_by?: string | null
          checklist_item_index?: number
          created_at?: string
          id?: string
          notes?: string | null
          relationship_id?: string
          rubric_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "excellence_checklist_progress_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "excellence_rubric"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excellence_checklist_progress_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "maturity_threshold_progress"
            referencedColumns: ["rubric_id"]
          },
        ]
      }
      excellence_checklist_proposals: {
        Row: {
          confidence: number | null
          created_at: string
          domain_id: string | null
          id: string
          notes: string | null
          proposed_text: string
          rationale: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rubric_id: string | null
          scanner_run_id: string | null
          source_snippet: string | null
          source_url: string | null
          status: string
          tenet_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          domain_id?: string | null
          id?: string
          notes?: string | null
          proposed_text: string
          rationale?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rubric_id?: string | null
          scanner_run_id?: string | null
          source_snippet?: string | null
          source_url?: string | null
          status?: string
          tenet_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          domain_id?: string | null
          id?: string
          notes?: string | null
          proposed_text?: string
          rationale?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rubric_id?: string | null
          scanner_run_id?: string | null
          source_snippet?: string | null
          source_url?: string | null
          status?: string
          tenet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "excellence_checklist_proposals_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excellence_checklist_proposals_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "relationship_domain_maturity"
            referencedColumns: ["domain_id"]
          },
          {
            foreignKeyName: "excellence_checklist_proposals_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "excellence_rubric"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excellence_checklist_proposals_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "maturity_threshold_progress"
            referencedColumns: ["rubric_id"]
          },
          {
            foreignKeyName: "excellence_checklist_proposals_scanner_run_id_fkey"
            columns: ["scanner_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excellence_checklist_proposals_tenet_id_fkey"
            columns: ["tenet_id"]
            isOneToOne: false
            referencedRelation: "tenets"
            referencedColumns: ["id"]
          },
        ]
      }
      excellence_perspectives: {
        Row: {
          code: string
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      excellence_rubric: {
        Row: {
          checklist_items: string[]
          created_at: string
          created_by: string | null
          enabled: boolean
          excellence_definition: string | null
          id: string
          level: Database["public"]["Enums"]["maturity_level"]
          perspective_id: string
          sort_order: number
          subject_id: string
          subject_kind: Database["public"]["Enums"]["excellence_subject_kind"]
          updated_at: string
        }
        Insert: {
          checklist_items?: string[]
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          excellence_definition?: string | null
          id?: string
          level: Database["public"]["Enums"]["maturity_level"]
          perspective_id: string
          sort_order?: number
          subject_id: string
          subject_kind: Database["public"]["Enums"]["excellence_subject_kind"]
          updated_at?: string
        }
        Update: {
          checklist_items?: string[]
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          excellence_definition?: string | null
          id?: string
          level?: Database["public"]["Enums"]["maturity_level"]
          perspective_id?: string
          sort_order?: number
          subject_id?: string
          subject_kind?: Database["public"]["Enums"]["excellence_subject_kind"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "excellence_rubric_perspective_id_fkey"
            columns: ["perspective_id"]
            isOneToOne: false
            referencedRelation: "excellence_perspectives"
            referencedColumns: ["id"]
          },
        ]
      }
      excellence_scores: {
        Row: {
          assessed_at: string
          assessed_by: string | null
          created_at: string
          id: string
          notes: string | null
          relationship_id: string
          rubric_id: string
          state: Database["public"]["Enums"]["excellence_score_state"]
          updated_at: string
        }
        Insert: {
          assessed_at?: string
          assessed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          relationship_id: string
          rubric_id: string
          state?: Database["public"]["Enums"]["excellence_score_state"]
          updated_at?: string
        }
        Update: {
          assessed_at?: string
          assessed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          relationship_id?: string
          rubric_id?: string
          state?: Database["public"]["Enums"]["excellence_score_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "excellence_scores_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
          {
            foreignKeyName: "excellence_scores_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excellence_scores_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "excellence_rubric"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excellence_scores_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "maturity_threshold_progress"
            referencedColumns: ["rubric_id"]
          },
        ]
      }
      industries: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          enabled: boolean
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      jobs_to_be_done: {
        Row: {
          context: string | null
          created_at: string
          created_by: string
          current_solution: string | null
          desired_outcome: string | null
          id: string
          job_type: string
          notes: string | null
          pain_severity: number | null
          persona_id: string | null
          related_components: string[]
          related_domains: string[]
          related_outcomes: string[]
          related_tenets: string[]
          relationship_id: string | null
          source: string | null
          source_ref: string | null
          statement: string
          status: string
          updated_at: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          created_by?: string
          current_solution?: string | null
          desired_outcome?: string | null
          id?: string
          job_type?: string
          notes?: string | null
          pain_severity?: number | null
          persona_id?: string | null
          related_components?: string[]
          related_domains?: string[]
          related_outcomes?: string[]
          related_tenets?: string[]
          relationship_id?: string | null
          source?: string | null
          source_ref?: string | null
          statement: string
          status?: string
          updated_at?: string
        }
        Update: {
          context?: string | null
          created_at?: string
          created_by?: string
          current_solution?: string | null
          desired_outcome?: string | null
          id?: string
          job_type?: string
          notes?: string | null
          pain_severity?: number | null
          persona_id?: string | null
          related_components?: string[]
          related_domains?: string[]
          related_outcomes?: string[]
          related_tenets?: string[]
          relationship_id?: string | null
          source?: string | null
          source_ref?: string | null
          statement?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_to_be_done_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_to_be_done_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
          {
            foreignKeyName: "jobs_to_be_done_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
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
      lens_curators: {
        Row: {
          created_at: string
          created_by: string
          id: string
          lens_id: string
          operator_id: string
          role: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          lens_id: string
          operator_id: string
          role?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          lens_id?: string
          operator_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "lens_curators_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_curators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operator_workload"
            referencedColumns: ["operator_id"]
          },
          {
            foreignKeyName: "lens_curators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      lens_perspectives: {
        Row: {
          confidence: number | null
          created_at: string
          created_by: string
          generated_at: string
          generated_by_model: string | null
          id: string
          is_pinned: boolean
          key_questions: string[]
          lens_id: string
          next_actions: string[]
          perspective_md: string | null
          quick_facts: string[]
          stages_breakdown: Json
          subject_id: string
          subject_kind: Database["public"]["Enums"]["lens_subject_kind"]
          updated_at: string
          version: number
          watch_outs: string[]
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          created_by?: string
          generated_at?: string
          generated_by_model?: string | null
          id?: string
          is_pinned?: boolean
          key_questions?: string[]
          lens_id: string
          next_actions?: string[]
          perspective_md?: string | null
          quick_facts?: string[]
          stages_breakdown?: Json
          subject_id: string
          subject_kind: Database["public"]["Enums"]["lens_subject_kind"]
          updated_at?: string
          version?: number
          watch_outs?: string[]
        }
        Update: {
          confidence?: number | null
          created_at?: string
          created_by?: string
          generated_at?: string
          generated_by_model?: string | null
          id?: string
          is_pinned?: boolean
          key_questions?: string[]
          lens_id?: string
          next_actions?: string[]
          perspective_md?: string | null
          quick_facts?: string[]
          stages_breakdown?: Json
          subject_id?: string
          subject_kind?: Database["public"]["Enums"]["lens_subject_kind"]
          updated_at?: string
          version?: number
          watch_outs?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "lens_perspectives_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
        ]
      }
      lenses: {
        Row: {
          accent_color: string
          best_use: string | null
          bizzybot_emoji: string | null
          code: string
          created_at: string
          enabled: boolean
          icon_key: string | null
          id: string
          model: string
          name: string
          sort_order: number
          stages: string[]
          system_prompt: string | null
          tagline: string
          updated_at: string
          user_prompt_template: string | null
          what_it_asks: string | null
        }
        Insert: {
          accent_color?: string
          best_use?: string | null
          bizzybot_emoji?: string | null
          code: string
          created_at?: string
          enabled?: boolean
          icon_key?: string | null
          id?: string
          model?: string
          name: string
          sort_order?: number
          stages?: string[]
          system_prompt?: string | null
          tagline: string
          updated_at?: string
          user_prompt_template?: string | null
          what_it_asks?: string | null
        }
        Update: {
          accent_color?: string
          best_use?: string | null
          bizzybot_emoji?: string | null
          code?: string
          created_at?: string
          enabled?: boolean
          icon_key?: string | null
          id?: string
          model?: string
          name?: string
          sort_order?: number
          stages?: string[]
          system_prompt?: string | null
          tagline?: string
          updated_at?: string
          user_prompt_template?: string | null
          what_it_asks?: string | null
        }
        Relationships: []
      }
      measure_readings: {
        Row: {
          created_at: string
          id: string
          measure_id: string
          notes: string | null
          recorded_at: string
          recorded_by: string
          source: Database["public"]["Enums"]["measure_reading_source"]
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          measure_id: string
          notes?: string | null
          recorded_at?: string
          recorded_by?: string
          source?: Database["public"]["Enums"]["measure_reading_source"]
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          measure_id?: string
          notes?: string | null
          recorded_at?: string
          recorded_by?: string
          source?: Database["public"]["Enums"]["measure_reading_source"]
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "measure_readings_measure_id_fkey"
            columns: ["measure_id"]
            isOneToOne: false
            referencedRelation: "measure_health"
            referencedColumns: ["measure_id"]
          },
          {
            foreignKeyName: "measure_readings_measure_id_fkey"
            columns: ["measure_id"]
            isOneToOne: false
            referencedRelation: "measures"
            referencedColumns: ["id"]
          },
        ]
      }
      measures: {
        Row: {
          baseline_value: number | null
          cadence: Database["public"]["Enums"]["measure_cadence"]
          created_at: string
          created_by: string
          current_value: number | null
          description: string | null
          direction: Database["public"]["Enums"]["measure_direction"]
          done_at: string | null
          due_date: string | null
          id: string
          kind: Database["public"]["Enums"]["measure_kind"]
          name: string
          notes: string | null
          parent_measure_id: string | null
          status: string | null
          subject_id: string
          subject_type: Database["public"]["Enums"]["measure_subject_type"]
          tagged_domains: string[]
          tagged_tenets: string[]
          target_unit: string | null
          target_value: number | null
          updated_at: string
        }
        Insert: {
          baseline_value?: number | null
          cadence?: Database["public"]["Enums"]["measure_cadence"]
          created_at?: string
          created_by?: string
          current_value?: number | null
          description?: string | null
          direction?: Database["public"]["Enums"]["measure_direction"]
          done_at?: string | null
          due_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["measure_kind"]
          name: string
          notes?: string | null
          parent_measure_id?: string | null
          status?: string | null
          subject_id: string
          subject_type: Database["public"]["Enums"]["measure_subject_type"]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          target_unit?: string | null
          target_value?: number | null
          updated_at?: string
        }
        Update: {
          baseline_value?: number | null
          cadence?: Database["public"]["Enums"]["measure_cadence"]
          created_at?: string
          created_by?: string
          current_value?: number | null
          description?: string | null
          direction?: Database["public"]["Enums"]["measure_direction"]
          done_at?: string | null
          due_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["measure_kind"]
          name?: string
          notes?: string | null
          parent_measure_id?: string | null
          status?: string | null
          subject_id?: string
          subject_type?: Database["public"]["Enums"]["measure_subject_type"]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          target_unit?: string | null
          target_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measures_parent_measure_id_fkey"
            columns: ["parent_measure_id"]
            isOneToOne: false
            referencedRelation: "measure_health"
            referencedColumns: ["measure_id"]
          },
          {
            foreignKeyName: "measures_parent_measure_id_fkey"
            columns: ["parent_measure_id"]
            isOneToOne: false
            referencedRelation: "measures"
            referencedColumns: ["id"]
          },
        ]
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
          tagged_components: string[]
          tagged_domains: string[]
          tagged_tenets: string[]
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
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
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
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          target_timeframe?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
          {
            foreignKeyName: "missions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          agent_model: string | null
          agent_role: string | null
          agent_system_prompt: string | null
          availability: string
          avatar_url: string | null
          created_at: string
          created_by: string
          dislikes: string[]
          enabled: boolean
          id: string
          kind: Database["public"]["Enums"]["operator_kind"]
          likes: string[]
          name: string
          notes: string | null
          profile_id: string | null
          skills: string[]
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          agent_model?: string | null
          agent_role?: string | null
          agent_system_prompt?: string | null
          availability?: string
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          dislikes?: string[]
          enabled?: boolean
          id?: string
          kind: Database["public"]["Enums"]["operator_kind"]
          likes?: string[]
          name: string
          notes?: string | null
          profile_id?: string | null
          skills?: string[]
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          agent_model?: string | null
          agent_role?: string | null
          agent_system_prompt?: string | null
          availability?: string
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          dislikes?: string[]
          enabled?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["operator_kind"]
          likes?: string[]
          name?: string
          notes?: string | null
          profile_id?: string | null
          skills?: string[]
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operators_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          done_at: string | null
          id: string
          measured_date: string | null
          measured_value: string | null
          outcome_type: string
          tagged_components: string[]
          tagged_domains: string[]
          tagged_tenets: string[]
          target_date: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          component_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          done_at?: string | null
          id?: string
          measured_date?: string | null
          measured_value?: string | null
          outcome_type: string
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          component_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          done_at?: string | null
          id?: string
          measured_date?: string | null
          measured_value?: string | null
          outcome_type?: string
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outcomes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
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
            referencedRelation: "component_build_pipeline"
            referencedColumns: ["component_id"]
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
      persona_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          enabled: boolean
          id: string
          industry: string
          name: string
          sort_order: number
          suggested_fields: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          description?: string | null
          enabled?: boolean
          id?: string
          industry: string
          name: string
          sort_order?: number
          suggested_fields?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          enabled?: boolean
          id?: string
          industry?: string
          name?: string
          sort_order?: number
          suggested_fields?: Json
          updated_at?: string
        }
        Relationships: []
      }
      personas: {
        Row: {
          autonomy_level: string | null
          confidence: number | null
          contract_considerations: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          notes: string | null
          practice_structure: string | null
          proposal_id: string | null
          real_examples: string | null
          regulatory_registration: string[] | null
          sector: string | null
          seed_adaptation_notes: string | null
          source: Database["public"]["Enums"]["proposal_source"] | null
          source_ref: string | null
          spec_status: Database["public"]["Enums"]["spec_status"] | null
          tagged_components: string[]
          tagged_domains: string[]
          tagged_tenets: string[]
          updated_at: string
        }
        Insert: {
          autonomy_level?: string | null
          confidence?: number | null
          contract_considerations?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name: string
          notes?: string | null
          practice_structure?: string | null
          proposal_id?: string | null
          real_examples?: string | null
          regulatory_registration?: string[] | null
          sector?: string | null
          seed_adaptation_notes?: string | null
          source?: Database["public"]["Enums"]["proposal_source"] | null
          source_ref?: string | null
          spec_status?: Database["public"]["Enums"]["spec_status"] | null
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          updated_at?: string
        }
        Update: {
          autonomy_level?: string | null
          confidence?: number | null
          contract_considerations?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          notes?: string | null
          practice_structure?: string | null
          proposal_id?: string | null
          real_examples?: string | null
          regulatory_registration?: string[] | null
          sector?: string | null
          seed_adaptation_notes?: string | null
          source?: Database["public"]["Enums"]["proposal_source"] | null
          source_ref?: string | null
          spec_status?: Database["public"]["Enums"]["spec_status"] | null
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personas_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
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
          tagged_components: string[]
          tagged_domains: string[]
          tagged_tenets: string[]
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
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
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
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
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
      project_components: {
        Row: {
          component_id: string
          contribution_type: Database["public"]["Enums"]["component_contribution_type"]
          created_at: string
          created_by: string
          id: string
          notes: string | null
          project_id: string
          target_date: string | null
          target_maturity_level:
            | Database["public"]["Enums"]["maturity_level"]
            | null
          updated_at: string
        }
        Insert: {
          component_id: string
          contribution_type?: Database["public"]["Enums"]["component_contribution_type"]
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          project_id: string
          target_date?: string | null
          target_maturity_level?:
            | Database["public"]["Enums"]["maturity_level"]
            | null
          updated_at?: string
        }
        Update: {
          component_id?: string
          contribution_type?: Database["public"]["Enums"]["component_contribution_type"]
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          project_id?: string
          target_date?: string | null
          target_maturity_level?:
            | Database["public"]["Enums"]["maturity_level"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "component_build_pipeline"
            referencedColumns: ["component_id"]
          },
          {
            foreignKeyName: "project_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_components_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_rollup"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_components_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string | null
          confidence: number | null
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
          not_before: string | null
          ocda_stage: string | null
          operator_id: string | null
          owner: string | null
          priority: string | null
          project_brief: string | null
          prompt_status: string | null
          proposal_id: string | null
          recurrence_parent_id: string | null
          recurrence_rule: string | null
          relationship_id: string | null
          revenue_potential_usd: number | null
          scheduled_for: string | null
          source: Database["public"]["Enums"]["proposal_source"] | null
          source_ref: string | null
          sprint: string | null
          status: string | null
          tagged_components: string[]
          tagged_domains: string[]
          tagged_tenets: string[]
          type: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          confidence?: number | null
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
          not_before?: string | null
          ocda_stage?: string | null
          operator_id?: string | null
          owner?: string | null
          priority?: string | null
          project_brief?: string | null
          prompt_status?: string | null
          proposal_id?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          relationship_id?: string | null
          revenue_potential_usd?: number | null
          scheduled_for?: string | null
          source?: Database["public"]["Enums"]["proposal_source"] | null
          source_ref?: string | null
          sprint?: string | null
          status?: string | null
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          type?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          confidence?: number | null
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
          not_before?: string | null
          ocda_stage?: string | null
          operator_id?: string | null
          owner?: string | null
          priority?: string | null
          project_brief?: string | null
          prompt_status?: string | null
          proposal_id?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          relationship_id?: string | null
          revenue_potential_usd?: number | null
          scheduled_for?: string | null
          source?: Database["public"]["Enums"]["proposal_source"] | null
          source_ref?: string | null
          sprint?: string | null
          status?: string | null
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operator_workload"
            referencedColumns: ["operator_id"]
          },
          {
            foreignKeyName: "projects_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "project_rollup"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "projects_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
          {
            foreignKeyName: "projects_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          ai_model: string | null
          ai_notes: string | null
          approved_at: string | null
          approved_by: string | null
          confidence: number | null
          conflicts: Json
          created_at: string
          created_by: string
          entity_type: Database["public"]["Enums"]["proposal_entity_type"]
          id: string
          matched_record_id: string | null
          matched_record_table: string | null
          proposed_fields: Json
          raw_input: string | null
          rejected_reason: string | null
          source: Database["public"]["Enums"]["proposal_source"]
          source_label: string | null
          source_ref: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          tag_suggestions: Json
          tagged_components: string[]
          tagged_domains: string[]
          tagged_tenets: string[]
          updated_at: string
          written_record_id: string | null
          written_record_table: string | null
        }
        Insert: {
          ai_model?: string | null
          ai_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          confidence?: number | null
          conflicts?: Json
          created_at?: string
          created_by?: string
          entity_type: Database["public"]["Enums"]["proposal_entity_type"]
          id?: string
          matched_record_id?: string | null
          matched_record_table?: string | null
          proposed_fields?: Json
          raw_input?: string | null
          rejected_reason?: string | null
          source: Database["public"]["Enums"]["proposal_source"]
          source_label?: string | null
          source_ref?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          tag_suggestions?: Json
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          updated_at?: string
          written_record_id?: string | null
          written_record_table?: string | null
        }
        Update: {
          ai_model?: string | null
          ai_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          confidence?: number | null
          conflicts?: Json
          created_at?: string
          created_by?: string
          entity_type?: Database["public"]["Enums"]["proposal_entity_type"]
          id?: string
          matched_record_id?: string | null
          matched_record_table?: string | null
          proposed_fields?: Json
          raw_input?: string | null
          rejected_reason?: string | null
          source?: Database["public"]["Enums"]["proposal_source"]
          source_label?: string | null
          source_ref?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          tag_suggestions?: Json
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          updated_at?: string
          written_record_id?: string | null
          written_record_table?: string | null
        }
        Relationships: []
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
      relationship_portals: {
        Row: {
          created_at: string
          created_by: string
          delivered_at: string | null
          id: string
          kind: Database["public"]["Enums"]["portal_kind"]
          notes: string | null
          relationship_id: string
          updated_at: string
          url: string
          version: string | null
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          delivered_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["portal_kind"]
          notes?: string | null
          relationship_id: string
          updated_at?: string
          url: string
          version?: string | null
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          delivered_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["portal_kind"]
          notes?: string | null
          relationship_id?: string
          updated_at?: string
          url?: string
          version?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relationship_portals_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
          {
            foreignKeyName: "relationship_portals_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      relationships: {
        Row: {
          active_services: string[] | null
          ai_sophistication: string | null
          awareness_tier: Database["public"]["Enums"]["awareness_tier"] | null
          brief_for_next_touchpoint: string | null
          company: string | null
          confidence: number | null
          created_at: string
          created_by: string
          drift_risk: Database["public"]["Enums"]["drift_risk"] | null
          email: string | null
          execution_prompt: string | null
          geography: string | null
          id: string
          ideal_next_touchpoint: string | null
          industry: string | null
          industry_id: string | null
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
          primary_service:
            | Database["public"]["Enums"]["engagement_service_type"]
            | null
          prompt_status: string | null
          proposal_document_id: string | null
          proposal_expires_at: string | null
          proposal_id: string | null
          proposal_sent_at: string | null
          proposal_version: string | null
          recommendation_rationale: string | null
          recommended_package:
            | Database["public"]["Enums"]["service_package"]
            | null
          referred_by: string | null
          revenue_potential_usd: number | null
          role: string | null
          service_end_date: string | null
          service_package: Database["public"]["Enums"]["service_package"] | null
          service_start_date: string | null
          service_status:
            | Database["public"]["Enums"]["engagement_service_status"]
            | null
          sessions_purchased: number | null
          sessions_remaining: number | null
          sessions_used: number | null
          source: Database["public"]["Enums"]["proposal_source"] | null
          source_ref: string | null
          status: string | null
          sweetconnect_credits: number | null
          sweetconnect_credits_used: number | null
          tagged_components: string[]
          tagged_domains: string[]
          tagged_tenets: string[]
          temperature:
            | Database["public"]["Enums"]["relationship_temperature"]
            | null
          type: string | null
          updated_at: string
        }
        Insert: {
          active_services?: string[] | null
          ai_sophistication?: string | null
          awareness_tier?: Database["public"]["Enums"]["awareness_tier"] | null
          brief_for_next_touchpoint?: string | null
          company?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string
          drift_risk?: Database["public"]["Enums"]["drift_risk"] | null
          email?: string | null
          execution_prompt?: string | null
          geography?: string | null
          id?: string
          ideal_next_touchpoint?: string | null
          industry?: string | null
          industry_id?: string | null
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
          primary_service?:
            | Database["public"]["Enums"]["engagement_service_type"]
            | null
          prompt_status?: string | null
          proposal_document_id?: string | null
          proposal_expires_at?: string | null
          proposal_id?: string | null
          proposal_sent_at?: string | null
          proposal_version?: string | null
          recommendation_rationale?: string | null
          recommended_package?:
            | Database["public"]["Enums"]["service_package"]
            | null
          referred_by?: string | null
          revenue_potential_usd?: number | null
          role?: string | null
          service_end_date?: string | null
          service_package?:
            | Database["public"]["Enums"]["service_package"]
            | null
          service_start_date?: string | null
          service_status?:
            | Database["public"]["Enums"]["engagement_service_status"]
            | null
          sessions_purchased?: number | null
          sessions_remaining?: number | null
          sessions_used?: number | null
          source?: Database["public"]["Enums"]["proposal_source"] | null
          source_ref?: string | null
          status?: string | null
          sweetconnect_credits?: number | null
          sweetconnect_credits_used?: number | null
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          temperature?:
            | Database["public"]["Enums"]["relationship_temperature"]
            | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          active_services?: string[] | null
          ai_sophistication?: string | null
          awareness_tier?: Database["public"]["Enums"]["awareness_tier"] | null
          brief_for_next_touchpoint?: string | null
          company?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string
          drift_risk?: Database["public"]["Enums"]["drift_risk"] | null
          email?: string | null
          execution_prompt?: string | null
          geography?: string | null
          id?: string
          ideal_next_touchpoint?: string | null
          industry?: string | null
          industry_id?: string | null
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
          primary_service?:
            | Database["public"]["Enums"]["engagement_service_type"]
            | null
          prompt_status?: string | null
          proposal_document_id?: string | null
          proposal_expires_at?: string | null
          proposal_id?: string | null
          proposal_sent_at?: string | null
          proposal_version?: string | null
          recommendation_rationale?: string | null
          recommended_package?:
            | Database["public"]["Enums"]["service_package"]
            | null
          referred_by?: string | null
          revenue_potential_usd?: number | null
          role?: string | null
          service_end_date?: string | null
          service_package?:
            | Database["public"]["Enums"]["service_package"]
            | null
          service_start_date?: string | null
          service_status?:
            | Database["public"]["Enums"]["engagement_service_status"]
            | null
          sessions_purchased?: number | null
          sessions_remaining?: number | null
          sessions_used?: number | null
          source?: Database["public"]["Enums"]["proposal_source"] | null
          source_ref?: string | null
          status?: string | null
          sweetconnect_credits?: number | null
          sweetconnect_credits_used?: number | null
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          temperature?:
            | Database["public"]["Enums"]["relationship_temperature"]
            | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationships_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_persona_fk"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_proposal_document_fk"
            columns: ["proposal_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
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
      rubric_items: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          excellence_definition: string | null
          id: string
          prompt: string
          scale_max: number
          scale_min: number
          sort_order: number
          tenet_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          excellence_definition?: string | null
          id?: string
          prompt: string
          scale_max?: number
          scale_min?: number
          sort_order?: number
          tenet_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          excellence_definition?: string | null
          id?: string
          prompt?: string
          scale_max?: number
          scale_min?: number
          sort_order?: number
          tenet_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubric_items_tenet_id_fkey"
            columns: ["tenet_id"]
            isOneToOne: false
            referencedRelation: "tenets"
            referencedColumns: ["id"]
          },
        ]
      }
      rubric_scores: {
        Row: {
          assessed_at: string
          assessed_by: string | null
          created_at: string
          id: string
          notes: string | null
          relationship_id: string
          rubric_item_id: string
          score: number | null
          updated_at: string
        }
        Insert: {
          assessed_at?: string
          assessed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          relationship_id: string
          rubric_item_id: string
          score?: number | null
          updated_at?: string
        }
        Update: {
          assessed_at?: string
          assessed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          relationship_id?: string
          rubric_item_id?: string
          score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubric_scores_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
          {
            foreignKeyName: "rubric_scores_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubric_scores_rubric_item_id_fkey"
            columns: ["rubric_item_id"]
            isOneToOne: false
            referencedRelation: "rubric_items"
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
            referencedRelation: "component_build_pipeline"
            referencedColumns: ["component_id"]
          },
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
            referencedRelation: "relationship_journey"
            referencedColumns: ["current_session_id"]
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
            referencedRelation: "relationship_journey"
            referencedColumns: ["current_session_id"]
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
      session_templates: {
        Row: {
          agenda: string[]
          closing_checklist: string[]
          created_at: string
          created_by: string
          default_components: string[]
          default_deliverable_template_ids: string[]
          default_duration_minutes: number
          default_phase_owner: Database["public"]["Enums"]["phase_owner"] | null
          default_sweetcycle_phase:
            | Database["public"]["Enums"]["sweetcycle_phase"]
            | null
          description: string | null
          enabled: boolean
          id: string
          linked_workflow_id: string | null
          name: string
          prep_checklist: string[]
          service_type: string | null
          sort_order: number
          typical_position_in_journey: number | null
          updated_at: string
        }
        Insert: {
          agenda?: string[]
          closing_checklist?: string[]
          created_at?: string
          created_by?: string
          default_components?: string[]
          default_deliverable_template_ids?: string[]
          default_duration_minutes?: number
          default_phase_owner?:
            | Database["public"]["Enums"]["phase_owner"]
            | null
          default_sweetcycle_phase?:
            | Database["public"]["Enums"]["sweetcycle_phase"]
            | null
          description?: string | null
          enabled?: boolean
          id?: string
          linked_workflow_id?: string | null
          name: string
          prep_checklist?: string[]
          service_type?: string | null
          sort_order?: number
          typical_position_in_journey?: number | null
          updated_at?: string
        }
        Update: {
          agenda?: string[]
          closing_checklist?: string[]
          created_at?: string
          created_by?: string
          default_components?: string[]
          default_deliverable_template_ids?: string[]
          default_duration_minutes?: number
          default_phase_owner?:
            | Database["public"]["Enums"]["phase_owner"]
            | null
          default_sweetcycle_phase?:
            | Database["public"]["Enums"]["sweetcycle_phase"]
            | null
          description?: string | null
          enabled?: boolean
          id?: string
          linked_workflow_id?: string | null
          name?: string
          prep_checklist?: string[]
          service_type?: string | null
          sort_order?: number
          typical_position_in_journey?: number | null
          updated_at?: string
        }
        Relationships: []
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
          domain_covered: string | null
          engagement_plan_id: string | null
          engagement_service_id: string | null
          id: string
          key_findings: string | null
          linked_project_id: string | null
          maturity_lift_from:
            | Database["public"]["Enums"]["maturity_level"]
            | null
          maturity_lift_to: Database["public"]["Enums"]["maturity_level"] | null
          name: string
          next_recommended_service: string | null
          not_before: string | null
          operator_id: string | null
          outcome_findings: string | null
          persona_id: string | null
          phase_blocker: string | null
          phase_due_date: string | null
          phase_owner: Database["public"]["Enums"]["phase_owner"] | null
          playbook_id: string | null
          progression_state:
            | Database["public"]["Enums"]["progression_state"]
            | null
          reality_assessment_summary: string | null
          recurrence_parent_id: string | null
          recurrence_rule: string | null
          relationship_id: string | null
          scheduled_for: string | null
          seed_status: string | null
          seed_submitted: boolean | null
          sequence: number | null
          service: string | null
          session_date: string | null
          session_number: number | null
          session_template_id: string | null
          ship_status: string | null
          source_of_advancement:
            | Database["public"]["Enums"]["source_of_advancement"]
            | null
          status: string | null
          sweetcycle_phase:
            | Database["public"]["Enums"]["sweetcycle_phase"]
            | null
          sync_status: string | null
          tagged_components: string[]
          tagged_domains: string[]
          tagged_tenets: string[]
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
          domain_covered?: string | null
          engagement_plan_id?: string | null
          engagement_service_id?: string | null
          id?: string
          key_findings?: string | null
          linked_project_id?: string | null
          maturity_lift_from?:
            | Database["public"]["Enums"]["maturity_level"]
            | null
          maturity_lift_to?:
            | Database["public"]["Enums"]["maturity_level"]
            | null
          name: string
          next_recommended_service?: string | null
          not_before?: string | null
          operator_id?: string | null
          outcome_findings?: string | null
          persona_id?: string | null
          phase_blocker?: string | null
          phase_due_date?: string | null
          phase_owner?: Database["public"]["Enums"]["phase_owner"] | null
          playbook_id?: string | null
          progression_state?:
            | Database["public"]["Enums"]["progression_state"]
            | null
          reality_assessment_summary?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          relationship_id?: string | null
          scheduled_for?: string | null
          seed_status?: string | null
          seed_submitted?: boolean | null
          sequence?: number | null
          service?: string | null
          session_date?: string | null
          session_number?: number | null
          session_template_id?: string | null
          ship_status?: string | null
          source_of_advancement?:
            | Database["public"]["Enums"]["source_of_advancement"]
            | null
          status?: string | null
          sweetcycle_phase?:
            | Database["public"]["Enums"]["sweetcycle_phase"]
            | null
          sync_status?: string | null
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
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
          domain_covered?: string | null
          engagement_plan_id?: string | null
          engagement_service_id?: string | null
          id?: string
          key_findings?: string | null
          linked_project_id?: string | null
          maturity_lift_from?:
            | Database["public"]["Enums"]["maturity_level"]
            | null
          maturity_lift_to?:
            | Database["public"]["Enums"]["maturity_level"]
            | null
          name?: string
          next_recommended_service?: string | null
          not_before?: string | null
          operator_id?: string | null
          outcome_findings?: string | null
          persona_id?: string | null
          phase_blocker?: string | null
          phase_due_date?: string | null
          phase_owner?: Database["public"]["Enums"]["phase_owner"] | null
          playbook_id?: string | null
          progression_state?:
            | Database["public"]["Enums"]["progression_state"]
            | null
          reality_assessment_summary?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          relationship_id?: string | null
          scheduled_for?: string | null
          seed_status?: string | null
          seed_submitted?: boolean | null
          sequence?: number | null
          service?: string | null
          session_date?: string | null
          session_number?: number | null
          session_template_id?: string | null
          ship_status?: string | null
          source_of_advancement?:
            | Database["public"]["Enums"]["source_of_advancement"]
            | null
          status?: string | null
          sweetcycle_phase?:
            | Database["public"]["Enums"]["sweetcycle_phase"]
            | null
          sync_status?: string | null
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          updated_at?: string
          what_i_learned?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_engagement_plan_fk"
            columns: ["engagement_plan_id"]
            isOneToOne: false
            referencedRelation: "engagement_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_engagement_service_id_fkey"
            columns: ["engagement_service_id"]
            isOneToOne: false
            referencedRelation: "engagement_service_rollup"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "sessions_engagement_service_id_fkey"
            columns: ["engagement_service_id"]
            isOneToOne: false
            referencedRelation: "engagement_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "project_rollup"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sessions_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operator_workload"
            referencedColumns: ["operator_id"]
          },
          {
            foreignKeyName: "sessions_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
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
            foreignKeyName: "sessions_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["current_session_id"]
          },
          {
            foreignKeyName: "sessions_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
          {
            foreignKeyName: "sessions_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_session_template_id_fkey"
            columns: ["session_template_id"]
            isOneToOne: false
            referencedRelation: "session_templates"
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
      sources: {
        Row: {
          created_at: string
          created_by: string
          enabled: boolean
          entity_type: Database["public"]["Enums"]["proposal_entity_type"]
          external_id: string
          external_url: string | null
          id: string
          kind: string
          last_pull_count: number | null
          last_pull_status: string | null
          last_pulled_at: string | null
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          enabled?: boolean
          entity_type: Database["public"]["Enums"]["proposal_entity_type"]
          external_id: string
          external_url?: string | null
          id?: string
          kind?: string
          last_pull_count?: number | null
          last_pull_status?: string | null
          last_pulled_at?: string | null
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          enabled?: boolean
          entity_type?: Database["public"]["Enums"]["proposal_entity_type"]
          external_id?: string
          external_url?: string | null
          id?: string
          kind?: string
          last_pull_count?: number | null
          last_pull_status?: string | null
          last_pulled_at?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
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
          done_at: string | null
          due_date: string | null
          generated_by_kind: Database["public"]["Enums"]["spark_generator_kind"]
          generator_operator_id: string | null
          id: string
          name: string
          not_before: string | null
          origin_event: string | null
          progression_state:
            | Database["public"]["Enums"]["progression_state"]
            | null
          quest_id: string | null
          recurrence_parent_id: string | null
          recurrence_rule: string | null
          scheduled_for: string | null
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
          done_at?: string | null
          due_date?: string | null
          generated_by_kind?: Database["public"]["Enums"]["spark_generator_kind"]
          generator_operator_id?: string | null
          id?: string
          name: string
          not_before?: string | null
          origin_event?: string | null
          progression_state?:
            | Database["public"]["Enums"]["progression_state"]
            | null
          quest_id?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          scheduled_for?: string | null
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
          done_at?: string | null
          due_date?: string | null
          generated_by_kind?: Database["public"]["Enums"]["spark_generator_kind"]
          generator_operator_id?: string | null
          id?: string
          name?: string
          not_before?: string | null
          origin_event?: string | null
          progression_state?:
            | Database["public"]["Enums"]["progression_state"]
            | null
          quest_id?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          scheduled_for?: string | null
          sequence_order?: number | null
          source_of_advancement?:
            | Database["public"]["Enums"]["source_of_advancement"]
            | null
          spark_type?: Database["public"]["Enums"]["spark_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sparks_generator_operator_id_fkey"
            columns: ["generator_operator_id"]
            isOneToOne: false
            referencedRelation: "operator_workload"
            referencedColumns: ["operator_id"]
          },
          {
            foreignKeyName: "sparks_generator_operator_id_fkey"
            columns: ["generator_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sparks_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sparks_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "sparks"
            referencedColumns: ["id"]
          },
        ]
      }
      system_prompts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          model: string | null
          name: string
          scope: string | null
          system_prompt: string | null
          updated_at: string
          updated_by: string | null
          user_prompt_template: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          model?: string | null
          name: string
          scope?: string | null
          system_prompt?: string | null
          updated_at?: string
          updated_by?: string | null
          user_prompt_template?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          model?: string | null
          name?: string
          scope?: string | null
          system_prompt?: string | null
          updated_at?: string
          updated_by?: string | null
          user_prompt_template?: string | null
        }
        Relationships: []
      }
      task_components: {
        Row: {
          component_id: string
          created_at: string
          created_by: string
          id: string
          task_id: string
        }
        Insert: {
          component_id: string
          created_at?: string
          created_by?: string
          id?: string
          task_id: string
        }
        Update: {
          component_id?: string
          created_at?: string
          created_by?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "component_build_pipeline"
            referencedColumns: ["component_id"]
          },
          {
            foreignKeyName: "task_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_components_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string
          created_by: string
          depends_on_task_id: string
          id: string
          kind: string
          task_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          depends_on_task_id: string
          id?: string
          kind?: string
          task_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          depends_on_task_id?: string
          id?: string
          kind?: string
          task_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          blocked: boolean
          confidence: number | null
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
          not_before: string | null
          notes: string | null
          ocda_stage: string | null
          operator_id: string | null
          output_format: string | null
          output_link: string | null
          owner: string | null
          priority: string | null
          project_id: string | null
          prompt_status: string | null
          proposal_id: string | null
          recurrence_parent_id: string | null
          recurrence_rule: string | null
          recurring: boolean | null
          recurring_cadence: string | null
          relationship_id: string | null
          scheduled_for: string | null
          source: Database["public"]["Enums"]["proposal_source"] | null
          source_ref: string | null
          status: string | null
          success_criteria: string | null
          tagged_components: string[]
          tagged_domains: string[]
          tagged_tenets: string[]
          updated_at: string
          waiting_on: string | null
        }
        Insert: {
          assignee_id?: string | null
          blocked?: boolean
          confidence?: number | null
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
          not_before?: string | null
          notes?: string | null
          ocda_stage?: string | null
          operator_id?: string | null
          output_format?: string | null
          output_link?: string | null
          owner?: string | null
          priority?: string | null
          project_id?: string | null
          prompt_status?: string | null
          proposal_id?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          recurring?: boolean | null
          recurring_cadence?: string | null
          relationship_id?: string | null
          scheduled_for?: string | null
          source?: Database["public"]["Enums"]["proposal_source"] | null
          source_ref?: string | null
          status?: string | null
          success_criteria?: string | null
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          updated_at?: string
          waiting_on?: string | null
        }
        Update: {
          assignee_id?: string | null
          blocked?: boolean
          confidence?: number | null
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
          not_before?: string | null
          notes?: string | null
          ocda_stage?: string | null
          operator_id?: string | null
          output_format?: string | null
          output_link?: string | null
          owner?: string | null
          priority?: string | null
          project_id?: string | null
          prompt_status?: string | null
          proposal_id?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          recurring?: boolean | null
          recurring_cadence?: string | null
          relationship_id?: string | null
          scheduled_for?: string | null
          source?: Database["public"]["Enums"]["proposal_source"] | null
          source_ref?: string | null
          status?: string | null
          success_criteria?: string | null
          tagged_components?: string[]
          tagged_domains?: string[]
          tagged_tenets?: string[]
          updated_at?: string
          waiting_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operator_workload"
            referencedColumns: ["operator_id"]
          },
          {
            foreignKeyName: "tasks_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_rollup"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
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
      tenet_curators: {
        Row: {
          created_at: string
          created_by: string
          id: string
          operator_id: string
          role: string
          tenet_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          operator_id: string
          role?: string
          tenet_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          operator_id?: string
          role?: string
          tenet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenet_curators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operator_workload"
            referencedColumns: ["operator_id"]
          },
          {
            foreignKeyName: "tenet_curators_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenet_curators_tenet_id_fkey"
            columns: ["tenet_id"]
            isOneToOne: false
            referencedRelation: "tenets"
            referencedColumns: ["id"]
          },
        ]
      }
      tenets: {
        Row: {
          category: Database["public"]["Enums"]["tenet_category"]
          created_at: string
          created_by: string | null
          description: string | null
          enabled: boolean
          excellence_definition: string | null
          id: string
          industry_id: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["tenet_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          excellence_definition?: string | null
          id?: string
          industry_id?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["tenet_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          excellence_definition?: string | null
          id?: string
          industry_id?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenets_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
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
            referencedRelation: "component_build_pipeline"
            referencedColumns: ["component_id"]
          },
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
      workflow_relationship_state: {
        Row: {
          created_at: string
          last_updated: string
          notes: string | null
          relationship_id: string
          source_of_advancement:
            | Database["public"]["Enums"]["source_of_advancement"]
            | null
          state_of_the_thing: string
          updated_by: string | null
          workflow_id: string
        }
        Insert: {
          created_at?: string
          last_updated?: string
          notes?: string | null
          relationship_id: string
          source_of_advancement?:
            | Database["public"]["Enums"]["source_of_advancement"]
            | null
          state_of_the_thing?: string
          updated_by?: string | null
          workflow_id: string
        }
        Update: {
          created_at?: string
          last_updated?: string
          notes?: string | null
          relationship_id?: string
          source_of_advancement?:
            | Database["public"]["Enums"]["source_of_advancement"]
            | null
          state_of_the_thing?: string
          updated_by?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_relationship_state_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
          {
            foreignKeyName: "workflow_relationship_state_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          approval_requested_at: string | null
          awaiting_approval_from: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_step_id: string | null
          id: string
          notes: string | null
          progress_pct: number
          project_id: string | null
          relationship_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["workflow_run_status"]
          updated_at: string
          workflow_id: string
        }
        Insert: {
          approval_requested_at?: string | null
          awaiting_approval_from?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_step_id?: string | null
          id?: string
          notes?: string | null
          progress_pct?: number
          project_id?: string | null
          relationship_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_run_status"]
          updated_at?: string
          workflow_id: string
        }
        Update: {
          approval_requested_at?: string | null
          awaiting_approval_from?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_step_id?: string | null
          id?: string
          notes?: string | null
          progress_pct?: number
          project_id?: string | null
          relationship_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_run_status"]
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_rollup"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "workflow_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
          {
            foreignKeyName: "workflow_runs_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
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
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
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
      workflow_step_dependencies: {
        Row: {
          depends_on_step_id: string
          step_id: string
        }
        Insert: {
          depends_on_step_id: string
          step_id: string
        }
        Update: {
          depends_on_step_id?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_dependencies_depends_on_step_id_fkey"
            columns: ["depends_on_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_step_pipeline"
            referencedColumns: ["step_id"]
          },
          {
            foreignKeyName: "workflow_step_dependencies_depends_on_step_id_fkey"
            columns: ["depends_on_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_dependencies_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_step_pipeline"
            referencedColumns: ["step_id"]
          },
          {
            foreignKeyName: "workflow_step_dependencies_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_step_runs: {
        Row: {
          approval_at: string | null
          approval_by: string | null
          approval_decision: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          operator_id: string | null
          output_document_id: string | null
          run_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["workflow_step_status"]
          step_id: string
          updated_at: string
        }
        Insert: {
          approval_at?: string | null
          approval_by?: string | null
          approval_decision?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          operator_id?: string | null
          output_document_id?: string | null
          run_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_step_status"]
          step_id: string
          updated_at?: string
        }
        Update: {
          approval_at?: string | null
          approval_by?: string | null
          approval_decision?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          operator_id?: string | null
          output_document_id?: string | null
          run_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_step_status"]
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_runs_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_step_pipeline"
            referencedColumns: ["step_id"]
          },
          {
            foreignKeyName: "workflow_step_runs_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          approval_role: Database["public"]["Enums"]["approval_role"] | null
          created_at: string
          created_by: string
          default_operator_id: string | null
          description: string | null
          expected_duration_minutes: number | null
          id: string
          name: string
          position: number
          produces_document_type: string | null
          requires_human_approval: boolean
          step_type: Database["public"]["Enums"]["workflow_step_type"]
          success_criteria: string | null
          tagged_components: string[]
          updated_at: string
          workflow_id: string
        }
        Insert: {
          approval_role?: Database["public"]["Enums"]["approval_role"] | null
          created_at?: string
          created_by?: string
          default_operator_id?: string | null
          description?: string | null
          expected_duration_minutes?: number | null
          id?: string
          name: string
          position?: number
          produces_document_type?: string | null
          requires_human_approval?: boolean
          step_type?: Database["public"]["Enums"]["workflow_step_type"]
          success_criteria?: string | null
          tagged_components?: string[]
          updated_at?: string
          workflow_id: string
        }
        Update: {
          approval_role?: Database["public"]["Enums"]["approval_role"] | null
          created_at?: string
          created_by?: string
          default_operator_id?: string | null
          description?: string | null
          expected_duration_minutes?: number | null
          id?: string
          name?: string
          position?: number
          produces_document_type?: string | null
          requires_human_approval?: boolean
          step_type?: Database["public"]["Enums"]["workflow_step_type"]
          success_criteria?: string | null
          tagged_components?: string[]
          updated_at?: string
          workflow_id?: string
        }
        Relationships: []
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
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
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
      component_build_pipeline: {
        Row: {
          active_project_count: number | null
          active_project_ids: string[] | null
          active_task_count: number | null
          active_task_ids: string[] | null
          component_id: string | null
          component_name: string | null
          current_maturity_level:
            | Database["public"]["Enums"]["maturity_level"]
            | null
        }
        Relationships: []
      }
      engagement_service_rollup: {
        Row: {
          completion_pct: number | null
          next_session_date: string | null
          plan_id: string | null
          relationship_id: string | null
          service_id: string | null
          service_type:
            | Database["public"]["Enums"]["engagement_service_type"]
            | null
          sessions_in_flight: number | null
          sessions_shipped: number | null
          sessions_total: number | null
          status:
            | Database["public"]["Enums"]["engagement_service_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_services_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "engagement_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_services_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
          {
            foreignKeyName: "engagement_services_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      maturity_threshold_progress: {
        Row: {
          current_level: Database["public"]["Enums"]["maturity_level"] | null
          items_passed_at_level: number | null
          items_total_at_level: number | null
          ready_to_advance: boolean | null
          relationship_id: string | null
          rubric_id: string | null
          subject_id: string | null
          subject_kind:
            | Database["public"]["Enums"]["excellence_subject_kind"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "excellence_scores_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
          {
            foreignKeyName: "excellence_scores_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      measure_health: {
        Row: {
          baseline_value: number | null
          cadence: Database["public"]["Enums"]["measure_cadence"] | null
          direction: Database["public"]["Enums"]["measure_direction"] | null
          kind: Database["public"]["Enums"]["measure_kind"] | null
          last_reading_at: string | null
          latest_value: number | null
          measure_id: string | null
          name: string | null
          pct_to_target: number | null
          status_color: string | null
          subject_id: string | null
          subject_type:
            | Database["public"]["Enums"]["measure_subject_type"]
            | null
          target_value: number | null
        }
        Relationships: []
      }
      operator_workload: {
        Row: {
          availability: string | null
          avatar_url: string | null
          blocked_tasks: number | null
          enabled: boolean | null
          kind: Database["public"]["Enums"]["operator_kind"] | null
          name: string | null
          next_due: string | null
          open_tasks: number | null
          operator_id: string | null
          overdue_tasks: number | null
          skills: string[] | null
        }
        Relationships: []
      }
      project_rollup: {
        Row: {
          blocked_tasks: number | null
          next_due_date: string | null
          open_tasks: number | null
          overdue_tasks: number | null
          owners: string[] | null
          project_id: string | null
          total_tasks: number | null
        }
        Relationships: []
      }
      recent_done_log: {
        Row: {
          done_at: string | null
          entity_id: string | null
          entity_type: string | null
          name: string | null
          relationship_id: string | null
        }
        Relationships: []
      }
      relationship_domain_maturity: {
        Row: {
          current_level: Database["public"]["Enums"]["maturity_level"] | null
          domain_id: string | null
          domain_name: string | null
          domain_slug: string | null
          last_assessed_at: string | null
          last_score_id: string | null
          relationship_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "excellence_scores_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationship_journey"
            referencedColumns: ["relationship_id"]
          },
          {
            foreignKeyName: "excellence_scores_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_journey: {
        Row: {
          awareness_tier: Database["public"]["Enums"]["awareness_tier"] | null
          current_blocker: string | null
          current_phase: Database["public"]["Enums"]["sweetcycle_phase"] | null
          current_service_id: string | null
          current_session_id: string | null
          current_stage: string | null
          drift_risk: Database["public"]["Enums"]["drift_risk"] | null
          latest_portal_delivered_at: string | null
          latest_portal_kind: Database["public"]["Enums"]["portal_kind"] | null
          latest_portal_url: string | null
          latest_portal_viewed_at: string | null
          name: string | null
          next_action_due: string | null
          next_action_owner: Database["public"]["Enums"]["phase_owner"] | null
          pipeline_stage: string | null
          primary_service:
            | Database["public"]["Enums"]["engagement_service_type"]
            | null
          relationship_id: string | null
          service_status:
            | Database["public"]["Enums"]["engagement_service_status"]
            | null
          ship_count: number | null
          temperature:
            | Database["public"]["Enums"]["relationship_temperature"]
            | null
          total_session_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_engagement_service_id_fkey"
            columns: ["current_service_id"]
            isOneToOne: false
            referencedRelation: "engagement_service_rollup"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "sessions_engagement_service_id_fkey"
            columns: ["current_service_id"]
            isOneToOne: false
            referencedRelation: "engagement_services"
            referencedColumns: ["id"]
          },
        ]
      }
      task_blockers: {
        Row: {
          blocker_name: string | null
          blocker_status: string | null
          blocker_task_id: string | null
          task_id: string | null
        }
        Relationships: []
      }
      time_grid: {
        Row: {
          done_at: string | null
          due_date: string | null
          entity_id: string | null
          entity_type: string | null
          name: string | null
          not_before: string | null
          recurrence_rule: string | null
          relationship_id: string | null
          scheduled_for: string | null
          status: string | null
        }
        Relationships: []
      }
      work_context: {
        Row: {
          blocked_by_tasks: string[] | null
          blocking_tasks: string[] | null
          building_components: string[] | null
          done_at: string | null
          due_date: string | null
          entity_id: string | null
          entity_type: string | null
          for_relationship: string | null
          name: string | null
          not_before: string | null
          parent_campaign_id: string | null
          parent_project_id: string | null
          recurrence_rule: string | null
          scheduled_for: string | null
          status: string | null
          tagged_components: string[] | null
          tagged_domains: string[] | null
          tagged_tenets: string[] | null
        }
        Relationships: []
      }
      workflow_step_pipeline: {
        Row: {
          actual_operator_id: string | null
          approval_at: string | null
          approval_by: string | null
          approval_decision: string | null
          approval_role: Database["public"]["Enums"]["approval_role"] | null
          completed_at: string | null
          default_operator_id: string | null
          expected_duration_minutes: number | null
          output_document_id: string | null
          position: number | null
          requires_human_approval: boolean | null
          run_id: string | null
          run_status: Database["public"]["Enums"]["workflow_step_status"] | null
          started_at: string | null
          step_id: string | null
          step_name: string | null
          step_run_id: string | null
          step_type: Database["public"]["Enums"]["workflow_step_type"] | null
          success_criteria: string | null
          tagged_components: string[] | null
          workflow_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      default_phase_owner: {
        Args: { _phase: Database["public"]["Enums"]["sweetcycle_phase"] }
        Returns: Database["public"]["Enums"]["phase_owner"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team_member: { Args: { _user_id: string }; Returns: boolean }
      next_recurrence: {
        Args: { _anchor: string; _rule: string }
        Returns: string
      }
      recompute_task_blocked: { Args: { _task_id: string }; Returns: undefined }
      seed_excellence_defaults: {
        Args: {
          _subject_id: string
          _subject_kind: Database["public"]["Enums"]["excellence_subject_kind"]
        }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "member"
      approval_role: "owner" | "admin" | "any_team_member" | "named_operator"
      awareness_tier:
        | "Unaware"
        | "Problem-aware"
        | "Solution-aware"
        | "Product-aware"
        | "Most-aware"
      component_contribution_type:
        | "Builds"
        | "Refines"
        | "Tests"
        | "Documents"
        | "Retires"
      drift_risk: "None" | "Low" | "Medium" | "High"
      engagement_plan_status:
        | "Proposed"
        | "Accepted"
        | "In Progress"
        | "Completed"
        | "Cancelled"
      engagement_service_status:
        | "Not Started"
        | "Active"
        | "Paused"
        | "Completed"
        | "Renewed"
        | "Cancelled"
      engagement_service_type:
        | "Mirror"
        | "Map"
        | "Machine"
        | "SweetSync"
        | "SweetConnect"
      excellence_score_state: "not_assessed" | "not_met" | "partial" | "met"
      excellence_subject_kind: "domain" | "tenet" | "component"
      intelligence_confidence:
        | "Not Yet Verified"
        | "Inferred"
        | "Observed"
        | "Verified"
        | "Confirmed"
      lens_subject_kind:
        | "domain"
        | "tenet"
        | "component"
        | "relationship"
        | "mission"
        | "project"
      maturity_level:
        | "L1 Lacking"
        | "L2 Learning"
        | "L3 Launching"
        | "L4 Leveraging"
        | "L5 Leading"
      measure_cadence:
        | "daily"
        | "weekly"
        | "monthly"
        | "quarterly"
        | "per_event"
      measure_direction: "higher_is_better" | "lower_is_better" | "hit_target"
      measure_kind: "Objective" | "KeyResult" | "KPI" | "CSF"
      measure_reading_source: "manual" | "session" | "workflow_run" | "agent"
      measure_subject_type:
        | "operator"
        | "project"
        | "task"
        | "campaign"
        | "workflow"
        | "component"
        | "relationship"
        | "mission"
        | "engagement_service"
        | "session"
      operator_kind: "human" | "workflow" | "agent"
      phase_owner: "client" | "us" | "both"
      portal_kind:
        | "Pre-Engagement"
        | "Pre-Mirror"
        | "Mirror Output"
        | "Pre-Map"
        | "Map Output"
        | "Pre-Machine"
        | "Machine Output"
        | "Sync"
        | "Other"
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
      proposal_entity_type:
        | "persona"
        | "relationship"
        | "campaign"
        | "project"
        | "task"
        | "session"
        | "document"
        | "decision"
        | "spark"
        | "quest"
        | "component"
        | "workflow"
        | "journey"
        | "mission"
        | "outcome"
        | "domain_assessment"
        | "delegation"
        | "playbook"
      proposal_source: "capture" | "notion" | "external_ai" | "manual"
      proposal_status: "pending" | "approved" | "rejected" | "held" | "merged"
      quality_status: "Draft" | "Tested" | "Proven" | "Canonical"
      relationship_temperature: "Warm" | "Cool" | "Cold" | "Paused"
      reusability_tier: "One-Time" | "Relationship" | "Org" | "System"
      service_package:
        | "Mirror Only"
        | "Mirror + Machine"
        | "Machine Only"
        | "Map"
        | "None"
      session_phase: "Pre-Engagement" | "Deliverable" | "Follow-up"
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
      spark_generator_kind: "system" | "agent" | "workflow"
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
      tenet_category: "Foundation" | "Specialization" | "Advanced" | "Mastery"
      workflow_run_status:
        | "planned"
        | "running"
        | "paused"
        | "completed"
        | "cancelled"
      workflow_step_status:
        | "pending"
        | "in_progress"
        | "awaiting_approval"
        | "approved"
        | "rejected"
        | "done"
        | "skipped"
      workflow_step_type: "action" | "gate" | "branch" | "sub_workflow"
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
      approval_role: ["owner", "admin", "any_team_member", "named_operator"],
      awareness_tier: [
        "Unaware",
        "Problem-aware",
        "Solution-aware",
        "Product-aware",
        "Most-aware",
      ],
      component_contribution_type: [
        "Builds",
        "Refines",
        "Tests",
        "Documents",
        "Retires",
      ],
      drift_risk: ["None", "Low", "Medium", "High"],
      engagement_plan_status: [
        "Proposed",
        "Accepted",
        "In Progress",
        "Completed",
        "Cancelled",
      ],
      engagement_service_status: [
        "Not Started",
        "Active",
        "Paused",
        "Completed",
        "Renewed",
        "Cancelled",
      ],
      engagement_service_type: [
        "Mirror",
        "Map",
        "Machine",
        "SweetSync",
        "SweetConnect",
      ],
      excellence_score_state: ["not_assessed", "not_met", "partial", "met"],
      excellence_subject_kind: ["domain", "tenet", "component"],
      intelligence_confidence: [
        "Not Yet Verified",
        "Inferred",
        "Observed",
        "Verified",
        "Confirmed",
      ],
      lens_subject_kind: [
        "domain",
        "tenet",
        "component",
        "relationship",
        "mission",
        "project",
      ],
      maturity_level: [
        "L1 Lacking",
        "L2 Learning",
        "L3 Launching",
        "L4 Leveraging",
        "L5 Leading",
      ],
      measure_cadence: ["daily", "weekly", "monthly", "quarterly", "per_event"],
      measure_direction: ["higher_is_better", "lower_is_better", "hit_target"],
      measure_kind: ["Objective", "KeyResult", "KPI", "CSF"],
      measure_reading_source: ["manual", "session", "workflow_run", "agent"],
      measure_subject_type: [
        "operator",
        "project",
        "task",
        "campaign",
        "workflow",
        "component",
        "relationship",
        "mission",
        "engagement_service",
        "session",
      ],
      operator_kind: ["human", "workflow", "agent"],
      phase_owner: ["client", "us", "both"],
      portal_kind: [
        "Pre-Engagement",
        "Pre-Mirror",
        "Mirror Output",
        "Pre-Map",
        "Map Output",
        "Pre-Machine",
        "Machine Output",
        "Sync",
        "Other",
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
      proposal_entity_type: [
        "persona",
        "relationship",
        "campaign",
        "project",
        "task",
        "session",
        "document",
        "decision",
        "spark",
        "quest",
        "component",
        "workflow",
        "journey",
        "mission",
        "outcome",
        "domain_assessment",
        "delegation",
        "playbook",
      ],
      proposal_source: ["capture", "notion", "external_ai", "manual"],
      proposal_status: ["pending", "approved", "rejected", "held", "merged"],
      quality_status: ["Draft", "Tested", "Proven", "Canonical"],
      relationship_temperature: ["Warm", "Cool", "Cold", "Paused"],
      reusability_tier: ["One-Time", "Relationship", "Org", "System"],
      service_package: [
        "Mirror Only",
        "Mirror + Machine",
        "Machine Only",
        "Map",
        "None",
      ],
      session_phase: ["Pre-Engagement", "Deliverable", "Follow-up"],
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
      spark_generator_kind: ["system", "agent", "workflow"],
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
      tenet_category: ["Foundation", "Specialization", "Advanced", "Mastery"],
      workflow_run_status: [
        "planned",
        "running",
        "paused",
        "completed",
        "cancelled",
      ],
      workflow_step_status: [
        "pending",
        "in_progress",
        "awaiting_approval",
        "approved",
        "rejected",
        "done",
        "skipped",
      ],
      workflow_step_type: ["action", "gate", "branch", "sub_workflow"],
    },
  },
} as const

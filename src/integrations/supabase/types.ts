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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_deletion_log: {
        Row: {
          deleted_at: string | null
          deleted_by: string | null
          deletion_summary: Json | null
          id: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_summary?: Json | null
          id?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_summary?: Json | null
          id?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          id: string
          ip_address: unknown
          query_details: Json | null
          target_record_id: string | null
          target_table: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          query_details?: Json | null
          target_record_id?: string | null
          target_table?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          query_details?: Json | null
          target_record_id?: string | null
          target_table?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      app_events: {
        Row: {
          created_at: string | null
          id: number
          meta: Json | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          meta?: Json | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          meta?: Json | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      application_attachments: {
        Row: {
          application_id: string
          created_at: string | null
          file_name: string | null
          file_path: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          user_document_id: string | null
        }
        Insert: {
          application_id: string
          created_at?: string | null
          file_name?: string | null
          file_path: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          user_document_id?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string | null
          file_name?: string | null
          file_path?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          user_document_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_attachments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_attachments_user_document_id_fkey"
            columns: ["user_document_id"]
            isOneToOne: false
            referencedRelation: "user_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      application_messages: {
        Row: {
          application_id: string | null
          created_at: string | null
          direction: string
          headers: Json | null
          html_body: string | null
          id: string
          is_read: boolean
          match_confidence: string | null
          match_signals: Json | null
          message_id: string | null
          payload: Json | null
          provider_message_id: string | null
          recipient: string | null
          reply_to: string | null
          sender: string | null
          subject: string | null
          text_body: string | null
          user_id: string | null
        }
        Insert: {
          application_id?: string | null
          created_at?: string | null
          direction: string
          headers?: Json | null
          html_body?: string | null
          id?: string
          is_read?: boolean
          match_confidence?: string | null
          match_signals?: Json | null
          message_id?: string | null
          payload?: Json | null
          provider_message_id?: string | null
          recipient?: string | null
          reply_to?: string | null
          sender?: string | null
          subject?: string | null
          text_body?: string | null
          user_id?: string | null
        }
        Update: {
          application_id?: string | null
          created_at?: string | null
          direction?: string
          headers?: Json | null
          html_body?: string | null
          id?: string
          is_read?: boolean
          match_confidence?: string | null
          match_signals?: Json | null
          message_id?: string | null
          payload?: Json | null
          provider_message_id?: string | null
          recipient?: string | null
          reply_to?: string | null
          sender?: string | null
          subject?: string | null
          text_body?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          cover_letter_document_id: string | null
          created_at: string | null
          cv_document_id: string | null
          error_message: string | null
          id: string
          job_id: string
          message_html: string | null
          message_text: string | null
          recipient_email: string
          reply_to: string | null
          reply_token: string | null
          sender_email: string
          status: string
          subject: string | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cover_letter_document_id?: string | null
          created_at?: string | null
          cv_document_id?: string | null
          error_message?: string | null
          id?: string
          job_id: string
          message_html?: string | null
          message_text?: string | null
          recipient_email: string
          reply_to?: string | null
          reply_token?: string | null
          sender_email?: string
          status?: string
          subject?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cover_letter_document_id?: string | null
          created_at?: string | null
          cv_document_id?: string | null
          error_message?: string | null
          id?: string
          job_id?: string
          message_html?: string | null
          message_text?: string | null
          recipient_email?: string
          reply_to?: string | null
          reply_token?: string | null
          sender_email?: string
          status?: string
          subject?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_cover_letter_document_id_fkey"
            columns: ["cover_letter_document_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_cv_document_id_fkey"
            columns: ["cv_document_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "stale_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      berlin_hospital_jobs: {
        Row: {
          apply_url: string | null
          consecutive_misses: number | null
          created_at: string | null
          department: string | null
          description: string | null
          first_seen_at: string | null
          hospital_id: string
          id: string
          is_new: boolean | null
          last_seen_at: string | null
          notes: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          apply_url?: string | null
          consecutive_misses?: number | null
          created_at?: string | null
          department?: string | null
          description?: string | null
          first_seen_at?: string | null
          hospital_id: string
          id?: string
          is_new?: boolean | null
          last_seen_at?: string | null
          notes?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          apply_url?: string | null
          consecutive_misses?: number | null
          created_at?: string | null
          department?: string | null
          description?: string | null
          first_seen_at?: string | null
          hospital_id?: string
          id?: string
          is_new?: boolean | null
          last_seen_at?: string | null
          notes?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "berlin_hospital_jobs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "berlin_hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      berlin_hospitals: {
        Row: {
          career_url: string | null
          career_url_verified: boolean | null
          created_at: string | null
          dkv_url: string | null
          id: string
          is_active: boolean | null
          last_scraped_at: string | null
          name: string
          scrape_error: string | null
          scrape_status: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          career_url?: string | null
          career_url_verified?: boolean | null
          created_at?: string | null
          dkv_url?: string | null
          id?: string
          is_active?: boolean | null
          last_scraped_at?: string | null
          name: string
          scrape_error?: string | null
          scrape_status?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          career_url?: string | null
          career_url_verified?: boolean | null
          created_at?: string | null
          dkv_url?: string | null
          id?: string
          is_active?: boolean | null
          last_scraped_at?: string | null
          name?: string
          scrape_error?: string | null
          scrape_status?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      candidate_share_requests: {
        Row: {
          candidate_user_id: string
          created_at: string | null
          hospital_id: string | null
          id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          candidate_user_id: string
          created_at?: string | null
          hospital_id?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          candidate_user_id?: string
          created_at?: string | null
          hospital_id?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      certifications: {
        Row: {
          aussteller: string | null
          created_at: string | null
          datum: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aussteller?: string | null
          created_at?: string | null
          datum?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aussteller?: string | null
          created_at?: string | null
          datum?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      custom_section_entries: {
        Row: {
          created_at: string | null
          datum: string | null
          description: string | null
          id: string
          section_id: string
          title: string
          updated_at: string | null
          user_id: string
          zeitraum_bis: string | null
          zeitraum_von: string | null
        }
        Insert: {
          created_at?: string | null
          datum?: string | null
          description?: string | null
          id?: string
          section_id: string
          title: string
          updated_at?: string | null
          user_id: string
          zeitraum_bis?: string | null
          zeitraum_von?: string | null
        }
        Update: {
          created_at?: string | null
          datum?: string | null
          description?: string | null
          id?: string
          section_id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
          zeitraum_bis?: string | null
          zeitraum_von?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_section_entries_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "custom_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_sections: {
        Row: {
          created_at: string | null
          id: string
          section_name: string
          section_order: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          section_name: string
          section_order?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          section_name?: string
          section_order?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      document_versions: {
        Row: {
          application_status: string | null
          applied: boolean | null
          applied_date: string | null
          created_at: string | null
          department_or_specialty: string | null
          followup_date: string | null
          hospital_name: string | null
          html_content: string
          id: string
          input_snapshot: Json | null
          job_url: string | null
          name: string
          notes: string | null
          position_title: string | null
          show_foto: boolean | null
          show_signatur: boolean | null
          typ: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          application_status?: string | null
          applied?: boolean | null
          applied_date?: string | null
          created_at?: string | null
          department_or_specialty?: string | null
          followup_date?: string | null
          hospital_name?: string | null
          html_content: string
          id?: string
          input_snapshot?: Json | null
          job_url?: string | null
          name: string
          notes?: string | null
          position_title?: string | null
          show_foto?: boolean | null
          show_signatur?: boolean | null
          typ: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          application_status?: string | null
          applied?: boolean | null
          applied_date?: string | null
          created_at?: string | null
          department_or_specialty?: string | null
          followup_date?: string | null
          hospital_name?: string | null
          html_content?: string
          id?: string
          input_snapshot?: Json | null
          job_url?: string | null
          name?: string
          notes?: string | null
          position_title?: string | null
          show_foto?: boolean | null
          show_signatur?: boolean | null
          typ?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      education_entries: {
        Row: {
          abschluss: string | null
          abschlussarbeit: string | null
          created_at: string | null
          id: string
          universitaet: string
          updated_at: string | null
          user_id: string
          zeitraum_bis: string | null
          zeitraum_von: string | null
        }
        Insert: {
          abschluss?: string | null
          abschlussarbeit?: string | null
          created_at?: string | null
          id?: string
          universitaet: string
          updated_at?: string | null
          user_id: string
          zeitraum_bis?: string | null
          zeitraum_von?: string | null
        }
        Update: {
          abschluss?: string | null
          abschlussarbeit?: string | null
          created_at?: string | null
          id?: string
          universitaet?: string
          updated_at?: string | null
          user_id?: string
          zeitraum_bis?: string | null
          zeitraum_von?: string | null
        }
        Relationships: []
      }
      hospitals: {
        Row: {
          beds_count: number | null
          bundesland: string
          career_page_url: string | null
          career_platform: string | null
          case_count: number | null
          city: string
          created_at: string | null
          data_quality_score: number | null
          departments: Json | null
          email: string | null
          has_job_postings: boolean | null
          id: string
          iknr: string | null
          is_active: boolean | null
          job_postings_count: number | null
          last_error_message: string | null
          last_scrape_success: boolean | null
          last_scraped_at: string | null
          latitude: number | null
          longitude: number | null
          name: string
          name_normalized: string
          phone: string | null
          plz: string | null
          scrape_error_count: number | null
          scrape_success_count: number | null
          source: string[] | null
          street: string | null
          type: string | null
          updated_at: string | null
          verification_date: string | null
          verified: boolean | null
          website: string | null
        }
        Insert: {
          beds_count?: number | null
          bundesland: string
          career_page_url?: string | null
          career_platform?: string | null
          case_count?: number | null
          city: string
          created_at?: string | null
          data_quality_score?: number | null
          departments?: Json | null
          email?: string | null
          has_job_postings?: boolean | null
          id?: string
          iknr?: string | null
          is_active?: boolean | null
          job_postings_count?: number | null
          last_error_message?: string | null
          last_scrape_success?: boolean | null
          last_scraped_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          name_normalized: string
          phone?: string | null
          plz?: string | null
          scrape_error_count?: number | null
          scrape_success_count?: number | null
          source?: string[] | null
          street?: string | null
          type?: string | null
          updated_at?: string | null
          verification_date?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          beds_count?: number | null
          bundesland?: string
          career_page_url?: string | null
          career_platform?: string | null
          case_count?: number | null
          city?: string
          created_at?: string | null
          data_quality_score?: number | null
          departments?: Json | null
          email?: string | null
          has_job_postings?: boolean | null
          id?: string
          iknr?: string | null
          is_active?: boolean | null
          job_postings_count?: number | null
          last_error_message?: string | null
          last_scrape_success?: boolean | null
          last_scraped_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          name_normalized?: string
          phone?: string | null
          plz?: string | null
          scrape_error_count?: number | null
          scrape_success_count?: number | null
          source?: string[] | null
          street?: string | null
          type?: string | null
          updated_at?: string | null
          verification_date?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
      job_import_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          job_id: string | null
          job_title: string | null
          rss_guid: string | null
          run_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          job_id?: string | null
          job_title?: string | null
          rss_guid?: string | null
          run_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          job_id?: string | null
          job_title?: string | null
          rss_guid?: string | null
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_import_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_import_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "stale_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          apply_url: string | null
          apply_url_hash: string | null
          attribution_metadata: Json | null
          cache_expires_at: string | null
          consecutive_misses: number | null
          contact_email: string | null
          contact_name: string | null
          content_hash: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          description: string | null
          expires_at: string | null
          field_backfill_attempts: number
          field_backfill_last_attempt_at: string | null
          field_backfill_last_error: string | null
          field_backfill_status: string | null
          hospital_id: string | null
          hospital_name: string | null
          id: string
          import_status: string | null
          is_published: boolean
          last_seen_at: string | null
          link_checked_at: string | null
          link_failure_count: number | null
          link_status: string | null
          location: string | null
          published_at: string | null
          requirements: string | null
          rss_content_hash: string | null
          rss_feed_source: string | null
          rss_guid: string | null
          rss_imported_at: string | null
          rss_last_seen_at: string | null
          scraped_at: string | null
          source: string | null
          source_identifier: string | null
          source_name: string | null
          source_url: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          url_http_status: number | null
          url_is_dead: boolean | null
          url_validated: boolean | null
          url_validation_date: string | null
        }
        Insert: {
          apply_url?: string | null
          apply_url_hash?: string | null
          attribution_metadata?: Json | null
          cache_expires_at?: string | null
          consecutive_misses?: number | null
          contact_email?: string | null
          contact_name?: string | null
          content_hash?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          expires_at?: string | null
          field_backfill_attempts?: number
          field_backfill_last_attempt_at?: string | null
          field_backfill_last_error?: string | null
          field_backfill_status?: string | null
          hospital_id?: string | null
          hospital_name?: string | null
          id?: string
          import_status?: string | null
          is_published?: boolean
          last_seen_at?: string | null
          link_checked_at?: string | null
          link_failure_count?: number | null
          link_status?: string | null
          location?: string | null
          published_at?: string | null
          requirements?: string | null
          rss_content_hash?: string | null
          rss_feed_source?: string | null
          rss_guid?: string | null
          rss_imported_at?: string | null
          rss_last_seen_at?: string | null
          scraped_at?: string | null
          source?: string | null
          source_identifier?: string | null
          source_name?: string | null
          source_url?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          url_http_status?: number | null
          url_is_dead?: boolean | null
          url_validated?: boolean | null
          url_validation_date?: string | null
        }
        Update: {
          apply_url?: string | null
          apply_url_hash?: string | null
          attribution_metadata?: Json | null
          cache_expires_at?: string | null
          consecutive_misses?: number | null
          contact_email?: string | null
          contact_name?: string | null
          content_hash?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          expires_at?: string | null
          field_backfill_attempts?: number
          field_backfill_last_attempt_at?: string | null
          field_backfill_last_error?: string | null
          field_backfill_status?: string | null
          hospital_id?: string | null
          hospital_name?: string | null
          id?: string
          import_status?: string | null
          is_published?: boolean
          last_seen_at?: string | null
          link_checked_at?: string | null
          link_failure_count?: number | null
          link_status?: string | null
          location?: string | null
          published_at?: string | null
          requirements?: string | null
          rss_content_hash?: string | null
          rss_feed_source?: string | null
          rss_guid?: string | null
          rss_imported_at?: string | null
          rss_last_seen_at?: string | null
          scraped_at?: string | null
          source?: string | null
          source_identifier?: string | null
          source_name?: string | null
          source_url?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          url_http_status?: number | null
          url_is_dead?: boolean | null
          url_validated?: boolean | null
          url_validation_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_scraping_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      lifecycle_email_logs: {
        Row: {
          campaign_type: string
          created_at: string
          dedupe_key: string
          error_message: string | null
          id: string
          meta: Json | null
          provider_message_id: string | null
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_type: string
          created_at?: string
          dedupe_key: string
          error_message?: string | null
          id?: string
          meta?: Json | null
          provider_message_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_type?: string
          created_at?: string
          dedupe_key?: string
          error_message?: string | null
          id?: string
          meta?: Json | null
          provider_message_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      practical_experiences: {
        Row: {
          beschreibung: string | null
          created_at: string | null
          einrichtung: string
          fachbereich: string | null
          id: string
          typ: string | null
          updated_at: string | null
          user_id: string
          zeitraum_bis: string | null
          zeitraum_von: string | null
        }
        Insert: {
          beschreibung?: string | null
          created_at?: string | null
          einrichtung: string
          fachbereich?: string | null
          id?: string
          typ?: string | null
          updated_at?: string | null
          user_id: string
          zeitraum_bis?: string | null
          zeitraum_von?: string | null
        }
        Update: {
          beschreibung?: string | null
          created_at?: string | null
          einrichtung?: string
          fachbereich?: string | null
          id?: string
          typ?: string | null
          updated_at?: string | null
          user_id?: string
          zeitraum_bis?: string | null
          zeitraum_von?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approbationsstatus: string | null
          berufserfahrung_jahre: number | null
          berufserfahrung_monate: number | null
          created_at: string | null
          cv_text: string | null
          deutschniveau: string | null
          dsgvo_einwilligung: boolean | null
          dsgvo_einwilligung_datum: string | null
          edv_kenntnisse: string[] | null
          email: string | null
          fachrichtung: string | null
          familienstand: string | null
          foto_url: string | null
          geburtsdatum: string | null
          id: string
          interessen: string | null
          klaro_email: string | null
          last_seen_at: string | null
          medizinische_kenntnisse: string[] | null
          nachname: string
          onboarding_completed: boolean | null
          role: string
          share_consent: boolean | null
          share_consent_at: string | null
          signatur_url: string | null
          sprachkenntnisse: string[] | null
          staatsangehoerigkeit: string | null
          stadt: string | null
          telefon: string | null
          updated_at: string | null
          user_id: string
          visibility_status: string | null
          vorname: string
        }
        Insert: {
          approbationsstatus?: string | null
          berufserfahrung_jahre?: number | null
          berufserfahrung_monate?: number | null
          created_at?: string | null
          cv_text?: string | null
          deutschniveau?: string | null
          dsgvo_einwilligung?: boolean | null
          dsgvo_einwilligung_datum?: string | null
          edv_kenntnisse?: string[] | null
          email?: string | null
          fachrichtung?: string | null
          familienstand?: string | null
          foto_url?: string | null
          geburtsdatum?: string | null
          id?: string
          interessen?: string | null
          klaro_email?: string | null
          last_seen_at?: string | null
          medizinische_kenntnisse?: string[] | null
          nachname: string
          onboarding_completed?: boolean | null
          role?: string
          share_consent?: boolean | null
          share_consent_at?: string | null
          signatur_url?: string | null
          sprachkenntnisse?: string[] | null
          staatsangehoerigkeit?: string | null
          stadt?: string | null
          telefon?: string | null
          updated_at?: string | null
          user_id: string
          visibility_status?: string | null
          vorname: string
        }
        Update: {
          approbationsstatus?: string | null
          berufserfahrung_jahre?: number | null
          berufserfahrung_monate?: number | null
          created_at?: string | null
          cv_text?: string | null
          deutschniveau?: string | null
          dsgvo_einwilligung?: boolean | null
          dsgvo_einwilligung_datum?: string | null
          edv_kenntnisse?: string[] | null
          email?: string | null
          fachrichtung?: string | null
          familienstand?: string | null
          foto_url?: string | null
          geburtsdatum?: string | null
          id?: string
          interessen?: string | null
          klaro_email?: string | null
          last_seen_at?: string | null
          medizinische_kenntnisse?: string[] | null
          nachname?: string
          onboarding_completed?: boolean | null
          role?: string
          share_consent?: boolean | null
          share_consent_at?: string | null
          signatur_url?: string | null
          sprachkenntnisse?: string[] | null
          staatsangehoerigkeit?: string | null
          stadt?: string | null
          telefon?: string | null
          updated_at?: string | null
          user_id?: string
          visibility_status?: string | null
          vorname?: string
        }
        Relationships: []
      }
      publications: {
        Row: {
          beschreibung: string | null
          created_at: string | null
          datum: string | null
          id: string
          journal_ort: string | null
          titel: string
          typ: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          beschreibung?: string | null
          created_at?: string | null
          datum?: string | null
          id?: string
          journal_ort?: string | null
          titel: string
          typ?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          beschreibung?: string | null
          created_at?: string | null
          datum?: string | null
          id?: string
          journal_ort?: string | null
          titel?: string
          typ?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_log: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_documents: {
        Row: {
          created_at: string | null
          doc_type: string
          expires_at: string | null
          file_name: string | null
          file_path: string
          id: string
          include_by_default: boolean
          mime_type: string | null
          size_bytes: number | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          doc_type: string
          expires_at?: string | null
          file_name?: string | null
          file_path: string
          id?: string
          include_by_default?: boolean
          mime_type?: string | null
          size_bytes?: number | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          doc_type?: string
          expires_at?: string | null
          file_name?: string | null
          file_path?: string
          id?: string
          include_by_default?: boolean
          mime_type?: string | null
          size_bytes?: number | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_email_aliases: {
        Row: {
          alias: string
          created_at: string | null
          deactivated_at: string | null
          domain: string
          full_address: string | null
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          alias: string
          created_at?: string | null
          deactivated_at?: string | null
          domain?: string
          full_address?: string | null
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          alias?: string
          created_at?: string | null
          deactivated_at?: string | null
          domain?: string
          full_address?: string | null
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          job_alerts_enabled: boolean
          last_job_alert_at: string | null
          last_onboarding_nudge_at: string | null
          last_reactivation_email_at: string | null
          onboarding_nudges_enabled: boolean
          reactivation_emails_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          job_alerts_enabled?: boolean
          last_job_alert_at?: string | null
          last_onboarding_nudge_at?: string | null
          last_reactivation_email_at?: string | null
          onboarding_nudges_enabled?: boolean
          reactivation_emails_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          job_alerts_enabled?: boolean
          last_job_alert_at?: string | null
          last_onboarding_nudge_at?: string | null
          last_reactivation_email_at?: string | null
          onboarding_nudges_enabled?: boolean
          reactivation_emails_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      work_experiences: {
        Row: {
          created_at: string | null
          id: string
          klinik: string
          station: string | null
          taetigkeiten: string | null
          updated_at: string | null
          user_id: string
          zeitraum_bis: string | null
          zeitraum_von: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          klinik: string
          station?: string | null
          taetigkeiten?: string | null
          updated_at?: string | null
          user_id: string
          zeitraum_bis?: string | null
          zeitraum_von?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          klinik?: string
          station?: string | null
          taetigkeiten?: string | null
          updated_at?: string | null
          user_id?: string
          zeitraum_bis?: string | null
          zeitraum_von?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_activity_summary: {
        Row: {
          action: string | null
          action_count: number | null
          admin_email: string | null
          admin_name: string | null
          admin_user_id: string | null
          last_action_at: string | null
        }
        Relationships: []
      }
      duplicate_jobs: {
        Row: {
          apply_url_hash: string | null
          content_hash: string | null
          duplicate_count: number | null
          hospitals: string[] | null
          job_ids: string[] | null
          titles: string[] | null
        }
        Relationships: []
      }
      hospital_scraping_stats: {
        Row: {
          bundesland: string | null
          career_page_url: string | null
          career_platform: string | null
          dead_jobs: number | null
          id: string | null
          last_scrape_success: boolean | null
          last_scraped_at: string | null
          most_recent_job_scraped: string | null
          name: string | null
          scrape_status: string | null
          total_jobs_found: number | null
          valid_jobs: number | null
        }
        Relationships: []
      }
      job_quality_metrics: {
        Row: {
          dead_link_rate_pct: number | null
          dead_links: number | null
          hospital_scraped: number | null
          hospitals_with_jobs: number | null
          rss_jobs: number | null
          scraped_jobs: number | null
          total_jobs: number | null
          unvalidated_jobs: number | null
          validated_jobs: number | null
          validation_rate_pct: number | null
        }
        Relationships: []
      }
      platform_performance: {
        Row: {
          avg_jobs_per_hospital: number | null
          career_platform: string | null
          failed_scrapes: number | null
          hospitals_count: number | null
          successful_scrapes: number | null
          total_jobs: number | null
          validated_jobs: number | null
          validation_rate_pct: number | null
        }
        Relationships: []
      }
      stale_jobs: {
        Row: {
          apply_url: string | null
          days_since_seen: unknown
          hospital_name: string | null
          id: string | null
          last_seen_at: string | null
          scraped_at: string | null
          staleness_status: string | null
          title: string | null
          url_is_dead: boolean | null
        }
        Insert: {
          apply_url?: string | null
          days_since_seen?: never
          hospital_name?: string | null
          id?: string | null
          last_seen_at?: string | null
          scraped_at?: string | null
          staleness_status?: never
          title?: string | null
          url_is_dead?: boolean | null
        }
        Update: {
          apply_url?: string | null
          days_since_seen?: never
          hospital_name?: string | null
          id?: string | null
          last_seen_at?: string | null
          scraped_at?: string | null
          staleness_status?: never
          title?: string | null
          url_is_dead?: boolean | null
        }
        Relationships: []
      }
      user_data_access_log: {
        Row: {
          action: string | null
          admin_name: string | null
          admin_user_id: string | null
          created_at: string | null
          target_table: string | null
          target_user_email: string | null
          target_user_id: string | null
          target_user_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_hospital_quality_score: {
        Args: { h: Database["public"]["Tables"]["hospitals"]["Row"] }
        Returns: number
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_max_requests: number
          p_user_id: string
          p_window_minutes: number
        }
        Returns: boolean
      }
      cleanup_expired_jobs: {
        Args: never
        Returns: {
          deleted_count: number
        }[]
      }
      cleanup_old_audit_logs: { Args: never; Returns: number }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      cleanup_stale_jobs: {
        Args: never
        Returns: {
          unpublished_count: number
        }[]
      }
      delete_user_account: { Args: { p_user_id: string }; Returns: Json }
      find_duplicate_job: {
        Args: { p_apply_url_hash: string; p_content_hash: string }
        Returns: string
      }
      generate_job_content_hash: {
        Args: {
          p_description: string
          p_hospital: string
          p_location: string
          p_title: string
        }
        Returns: string
      }
      generate_url_hash: { Args: { url: string }; Returns: string }
      get_jobs_needing_revalidation: {
        Args: { limit_count?: number }
        Returns: {
          apply_url: string
          id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      job_needs_refresh: { Args: { job_id: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action: string
          p_query_details?: Json
          p_target_record_id?: string
          p_target_table?: string
          p_target_user_id?: string
        }
        Returns: string
      }
      log_rate_limit: {
        Args: { p_endpoint: string; p_user_id: string }
        Returns: undefined
      }
      mark_stale_jobs_inactive: {
        Args: { days_threshold?: number }
        Returns: number
      }
      normalize_hospital_name: { Args: { name: string }; Returns: string }
      provision_user_alias: {
        Args: {
          p_domain?: string
          p_nachname: string
          p_user_id: string
          p_vorname: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

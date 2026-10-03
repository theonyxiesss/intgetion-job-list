# ERD

Generated from section 4.1 of `docs/TZ_INTGETION_v6.md`. Migration 0001 creates `users`. Migration 0002 creates `audit_logs` and `rate_limit_counters`. Migration 0003 creates `skills`, `skills_aliases`, and `skill_suggestions`. Other entities are the target model and are not tables yet.

```mermaid
erDiagram
  users ||--o| candidate_profiles : has
  users ||--o| employer_profiles : has
  users ||--o| candidate_preferences : prefers
  users ||--o{ company_members : member
  users ||--o{ applications : submits
  users ||--o{ saved_jobs : saves
  users ||--o{ user_job_feedback : feedback
  users ||--o{ bot_conversations : chats
  users ||--o{ matching_results : scored
  users ||--o{ notifications : receives
  users ||--o{ notification_preferences : configures
  users ||--o{ reports : files
  companies ||--o{ company_members : employs
  companies ||--o{ company_verifications : verifies
  companies ||--o{ jobs : posts
  jobs ||--o{ job_skills : requires
  jobs ||--o{ job_languages : requires
  jobs ||--o{ job_status_history : history
  jobs ||--o{ job_sources : sourced
  jobs ||--o{ applications : receives
  jobs ||--o{ matching_results : scored
  import_sources ||--o{ job_sources : provides
  import_sources ||--o{ import_runs : runs
  skills ||--o{ job_skills : used
  skills ||--o{ candidate_skills : used
  skills ||--o{ skills_aliases : alias
  skills ||--o{ skill_suggestions : suggested
  candidate_profiles ||--o{ candidate_skills : has
  candidate_profiles ||--o{ candidate_experience : has
  candidate_profiles ||--o{ candidate_languages : has
  candidate_profiles ||--|| candidate_contacts : contacts
  applications ||--o{ application_status_history : history
  applications ||--o| application_reveals : reveal
  bot_conversations ||--o{ bot_messages : messages
  fx_rates {
    char currency
    numeric rate_to_usd
    date as_of
  }
  rate_limit_counters {
    text key PK
    timestamptz window_start PK
    int count
  }
  moderation_queue {
    uuid id
    text entity_type
    uuid entity_id
  }
  audit_logs {
    uuid id PK
    uuid actor_id
    text action
    text entity_type
    uuid entity_id
    jsonb diff
    text ip_hash
    timestamptz created_at
  }
  skills {
    uuid id PK
    text slug UK
    text name_en
    text name_ru
    text category
    bool is_active
  }
  skills_aliases {
    text alias_normalized PK
    uuid skill_id FK
  }
  skill_suggestions {
    uuid id PK
    text raw_text
    text normalized UK
    text source
    int occurrences
    moderation_status status
    uuid mapped_skill_id FK
    timestamptz created_at
  }
```

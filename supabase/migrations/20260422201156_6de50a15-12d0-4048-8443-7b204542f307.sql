-- Pass 1: Security & DB hygiene
-- Set security_invoker=true on all public views so RLS applies as the caller, not view creator.
ALTER VIEW public.component_build_pipeline SET (security_invoker = true);
ALTER VIEW public.engagement_service_rollup SET (security_invoker = true);
ALTER VIEW public.maturity_threshold_progress SET (security_invoker = true);
ALTER VIEW public.measure_health SET (security_invoker = true);
ALTER VIEW public.operator_workload SET (security_invoker = true);
ALTER VIEW public.project_rollup SET (security_invoker = true);
ALTER VIEW public.recent_done_log SET (security_invoker = true);
ALTER VIEW public.relationship_domain_maturity SET (security_invoker = true);
ALTER VIEW public.relationship_journey SET (security_invoker = true);
ALTER VIEW public.task_blockers SET (security_invoker = true);
ALTER VIEW public.time_grid SET (security_invoker = true);
ALTER VIEW public.work_context SET (security_invoker = true);
ALTER VIEW public.workflow_step_pipeline SET (security_invoker = true);

-- Set immutable search_path on the one flagged function.
CREATE OR REPLACE FUNCTION public.default_phase_owner(_phase sweetcycle_phase)
 RETURNS phase_owner
 LANGUAGE sql
 IMMUTABLE
 SET search_path = public
AS $function$
  SELECT CASE _phase
    WHEN 'Seed' THEN 'client'::public.phase_owner
    WHEN 'Synthesize' THEN 'us'::public.phase_owner
    WHEN 'Session' THEN 'both'::public.phase_owner
    WHEN 'Sync' THEN 'us'::public.phase_owner
    WHEN 'Ship' THEN 'us'::public.phase_owner
    ELSE NULL
  END;
$function$;
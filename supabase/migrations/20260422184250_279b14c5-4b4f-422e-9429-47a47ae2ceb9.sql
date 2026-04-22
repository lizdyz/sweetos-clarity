
DROP VIEW IF EXISTS public.workflow_step_pipeline;
CREATE VIEW public.workflow_step_pipeline
WITH (security_invoker = true)
AS
SELECT ws.id AS step_id,
       ws.workflow_id,
       ws."position",
       ws.name AS step_name,
       ws.step_type,
       ws.requires_human_approval,
       ws.approval_role,
       ws.default_operator_id,
       ws.tagged_components,
       ws.expected_duration_minutes,
       ws.success_criteria,
       ws.deliverables,
       wsr.id AS step_run_id,
       wsr.run_id,
       wsr.status AS run_status,
       wsr.started_at,
       wsr.completed_at,
       wsr.operator_id AS actual_operator_id,
       wsr.output_document_id,
       wsr.approval_by,
       wsr.approval_at,
       wsr.approval_decision
  FROM public.workflow_steps ws
  LEFT JOIN public.workflow_step_runs wsr ON wsr.step_id = ws.id;


UPDATE public.quests
SET kind = 'reflection', is_template = false
WHERE kind = 'canonical' AND is_template = false AND name LIKE 'Which %';

// Untyped supabase client for dynamic table access used by the generic entity workspace.
// The generated `Database` types don't help here because table names are computed at runtime.
import { supabase } from "@/integrations/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sb = supabase as unknown as any;

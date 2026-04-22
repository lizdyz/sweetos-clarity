import { createFileRoute } from "@tanstack/react-router";
import { Vault } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { VaultGrid } from "@/components/vault-grid";

export const Route = createFileRoute("/_app/vault")({
  component: VaultPage,
});

function VaultPage() {
  return (
    <div className="space-y-5 p-6">
      <PageHeader
        icon={<Vault className="h-5 w-5" />}
        title="Vault"
        purpose="Every file you've captured, attached, or generated — searchable, tagged, and visible to the right audience. Internal by default; flip to 'Client shared' to surface in a client portal."
        whatYouCanDo={[
          "Search by filename or extracted text",
          "Filter by visibility, source, persona, component, or domain",
          "Open the original; share with a client by changing visibility",
        ]}
      />
      <VaultGrid />
    </div>
  );
}

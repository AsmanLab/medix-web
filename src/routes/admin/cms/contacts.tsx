import { createFileRoute, Link } from "@tanstack/react-router";
import { ContactsEditor } from "@/features/admin/ContactsEditor";
import { requireStaffPanel } from "@/session/guards";

export const Route = createFileRoute("/admin/cms/contacts")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: CmsContactsPage,
});

function CmsContactsPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <Link to="/admin/cms" className="font-semibold text-primary">
          CMS
        </Link>{" "}
        · контакты
      </p>
      <ContactsEditor />
    </div>
  );
}

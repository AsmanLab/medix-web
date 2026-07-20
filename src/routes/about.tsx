import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shared/AppShell";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <AppShell>
      <h1 className="font-display text-3xl font-bold">О компании</h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
        Medix International — дистрибьютор медицинского оборудования. Контент
        страницы будет загружаться из CMS API (фаза G3/G6).
      </p>
    </AppShell>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, MapPin, Megaphone, Percent } from "lucide-react";
import { requireStaffPanel } from "@/session/guards";

export const Route = createFileRoute("/admin/cms/")({
  beforeLoad: () => requireStaffPanel({ roles: ["admin"] }),
  component: CmsAdminHubPage,
});

const cards = [
  {
    to: "/admin/cms/pages" as const,
    title: "Страницы",
    description: "About, Privacy, Buyer и другие CMS-страницы",
    icon: FileText,
  },
  {
    to: "/admin/cms/promotions" as const,
    title: "Акции",
    description: "Промо с датами, картинкой и product deep link",
    icon: Percent,
  },
  {
    to: "/admin/cms/contacts" as const,
    title: "Контакты",
    description: "Офисы: адрес, телефоны, часы, карта",
    icon: MapPin,
  },
  {
    to: "/admin/banners" as const,
    title: "Баннеры",
    description: "Слайды главной (отдельный раздел)",
    icon: Megaphone,
  },
];

function CmsAdminHubPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">CMS</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Контент сайта без разработчика
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="rounded-3xl border border-border bg-card p-5 transition hover:border-primary/40"
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
              <card.icon className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <h2 className="mt-3 font-display text-lg font-bold">{card.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

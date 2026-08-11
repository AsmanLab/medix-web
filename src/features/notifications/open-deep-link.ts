import type { useNavigate } from "@tanstack/react-router";
import { parseDeepLink } from "@/features/notifications/deep-link";

/**
 * Открывает то, о чём уведомление.
 *
 * Клиентские и служебные адреса разведены на уровне `kind`, поэтому одна
 * функция обслуживает и кабинет, и админку, и всплывающее уведомление на
 * любой странице: клиенту служебные адреса не приходят, сотруднику —
 * клиентские.
 */
export async function openDeepLink(
  navigate: ReturnType<typeof useNavigate>,
  path: string | null | undefined,
): Promise<void> {
  const target = parseDeepLink(path);
  if (!target) return;

  switch (target.kind) {
    case "order":
      await navigate({ to: "/orders/$orderId", params: { orderId: target.id } });
      return;
    case "rfq":
      await navigate({ to: "/requests/$rfqId", params: { rfqId: target.id } });
      return;
    case "service":
      await navigate({
        to: "/service/requests/$requestId",
        params: { requestId: target.id },
      });
      return;
    case "admin-rfq":
      await navigate({
        to: "/admin/commerce/$rfqId",
        params: { rfqId: target.id },
      });
      return;
    case "admin-service":
      await navigate({
        to: "/admin/service-desk/$requestId",
        params: { requestId: target.id },
      });
      return;
    case "admin-customer":
      await navigate({
        to: "/admin/users/$customerId",
        params: { customerId: target.id },
      });
      return;
    case "profile":
      await navigate({ to: "/profile" });
      return;
  }
}

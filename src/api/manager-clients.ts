import { apiRequest } from "@/api/client";

export type CreateManagerClientBody = {
  phone: string;
  full_name: string;
  organization?: string;
  city?: string;
  address?: string;
  client_type?: "clinic" | "laboratory" | "hospital" | "individual";
};

export type ManagerClientCreated = {
  user_id: string;
  phone: string;
  full_name: string;
  /** Показывается ровно один раз в этом ответе — нигде больше не хранится. */
  temporary_password: string;
};

/** Менеджер заводит клиента, принятого по телефонному звонку. */
export function createManagerClient(
  body: CreateManagerClientBody,
): Promise<ManagerClientCreated> {
  return apiRequest<ManagerClientCreated>({
    method: "POST",
    path: "/manager/clients",
    body: {
      phone: body.phone,
      full_name: body.full_name,
      organization: body.organization ?? "",
      city: body.city ?? "",
      address: body.address ?? "",
      client_type: body.client_type ?? "individual",
    },
  });
}

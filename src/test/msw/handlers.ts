import { http, HttpResponse } from "msw";

const API = "http://localhost:8000/api/v1";

export const handlers = [
  http.get(`${API}/cms/banners`, () => {
    return HttpResponse.json([
      {
        id: "b1",
        image_key: "",
        title: "Оборудование для клиник",
        subtitle: "Каталог Medix International",
        cta_text: "Смотреть каталог",
        link_url: "/catalog",
        deep_link: "",
      },
    ]);
  }),
  http.get(`${API}/catalog/categories`, () => {
    return HttpResponse.json([
      {
        id: "1",
        name_ru: "Диагностика",
        name_en: "Diagnostic",
        slug: "diagnostic",
        parent_id: null,
        sort: 0,
        is_active: true,
        image_key: "",
        seo_title: "",
        seo_description: "",
      },
      {
        id: "2",
        name_ru: "УЗИ",
        name_en: "Ultrasound",
        slug: "ultrasound",
        parent_id: "1",
        sort: 0,
        is_active: true,
        image_key: "",
        seo_title: "",
        seo_description: "",
      },
      {
        id: "3",
        name_ru: "Рентген",
        name_en: "X-Ray",
        slug: "xray",
        parent_id: "1",
        sort: 1,
        is_active: true,
        image_key: "",
        seo_title: "",
        seo_description: "",
      },
    ]);
  }),
];

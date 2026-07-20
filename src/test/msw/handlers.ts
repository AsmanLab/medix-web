import { http, HttpResponse } from "msw";

const API = "http://localhost:8000/api/v1";

export const handlers = [
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
    ]);
  }),
];

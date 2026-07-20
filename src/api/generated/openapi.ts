/**
 * Minimal OpenAPI stub types until `npm run generate:api` overwrites this file.
 * DO NOT hand-edit after generation — regenerate from medix-core OpenAPI.
 */

export interface components {
  schemas: {
    TokenResponse: {
      access_token: string;
      refresh_token: string;
      token_type: string;
    };
    SendOtpResponse: {
      transaction_id: string;
    };
    CategoryOut: {
      id: string;
      name_ru: string;
      name_en: string;
      slug: string;
      parent_id: string | null;
      sort: number;
      is_active: boolean;
      image_key: string;
      seo_title: string;
      seo_description: string;
    };
    ProductListOut: {
      id: string;
      sku: string;
      name_ru: string;
      name_en: string;
      slug: string;
      manufacturer: string;
      country: string;
      availability: string;
      price: string | null;
      is_published: boolean;
    };
    ProductImageOut: {
      id: string;
      s3_key: string;
      url: string | null;
      sort: number;
      is_primary: boolean;
    };
    ProductDocumentOut: {
      id: string;
      name: string;
      s3_key: string;
      url: string | null;
    };
    ProductOptionOut: {
      id: string;
      name_ru: string;
      name_en: string;
      option_type: string;
      price: string | null;
      is_required: boolean;
      is_active: boolean;
      sort: number;
    };
    OptionGroupOut: {
      id: string;
      name_ru: string;
      sort: number;
      options: components["schemas"]["ProductOptionOut"][];
    };
    ProductDetailOut: components["schemas"]["ProductListOut"] & {
      description_ru: string;
      category_ids: string[];
      images: components["schemas"]["ProductImageOut"][];
      documents: components["schemas"]["ProductDocumentOut"][];
      option_groups: components["schemas"]["OptionGroupOut"][];
    };
    ProfileResponse: {
      id: string;
      user_id: string;
      full_name: string;
      organization: string;
      city: string;
      address: string;
      client_type: string;
      verification_status: string;
    };
    UpdateProfileRequest: {
      full_name?: string | null;
      organization?: string | null;
      city?: string | null;
      address?: string | null;
    };
  };
}

export type TokenResponse = components["schemas"]["TokenResponse"];
export type SendOtpResponse = components["schemas"]["SendOtpResponse"];
export type CategoryOut = components["schemas"]["CategoryOut"];
export type ProductListOut = components["schemas"]["ProductListOut"];
export type ProductDetailOut = components["schemas"]["ProductDetailOut"];
export type ProfileResponse = components["schemas"]["ProfileResponse"];
export type UpdateProfileRequest = components["schemas"]["UpdateProfileRequest"];

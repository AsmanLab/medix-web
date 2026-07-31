/**
 * Удобные алиасы на схемы из сгенерированного openapi.ts.
 *
 * openapi.ts перезаписывается `npm run generate:api` целиком, поэтому вручную
 * дописывать в него нельзя. Раньше эти алиасы жили прямо в нём — файл был
 * рукописной заглушкой и генерация фактически не работала (см. историю
 * scripts/generate-api.mjs). Теперь генерация настоящая, а алиасы — здесь.
 *
 * Добавляя новый алиас, берите имя схемы ровно как в medix-core/openapi.json.
 */
import type { components } from "./openapi";

export type { components, paths, operations } from "./openapi";

type Schemas = components["schemas"];

export type TokenResponse = Schemas["TokenResponse"];
export type SendOtpResponse = Schemas["SendOtpResponse"];
export type CategoryOut = Schemas["CategoryOut"];
export type BannerOut = Schemas["BannerOut"];
export type ProductListOut = Schemas["ProductListOut"];
export type ProductDetailOut = Schemas["ProductDetailOut"];
export type ProductOptionOut = Schemas["ProductOptionOut"];
export type ProductImageOut = Schemas["ProductImageOut"];
export type OptionGroupOut = Schemas["OptionGroupOut"];
export type ProfileResponse = Schemas["ProfileResponse"];
export type UpdateProfileRequest = Schemas["UpdateProfileRequest"];
export type CartOut = Schemas["CartOut"];
export type CartItemOut = Schemas["CartItemOut"];
export type AddCartItemRequest = Schemas["AddCartItemRequest"];
export type PlaceOrderResponse = Schemas["PlaceOrderResponse"];

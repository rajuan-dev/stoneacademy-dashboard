import { apiRequest, createPath } from "./httpClient";

export const upsertAboutUs = (body) =>
  apiRequest("/cms/admin/about-us", { method: "PUT", body });

export const getAboutUs = () => apiRequest("/cms/about-us", { auth: false });

export const upsertPrivacyPolicy = (body) =>
  apiRequest("/cms/admin/privacy-policy", { method: "PUT", body });

export const getPrivacyPolicy = () =>
  apiRequest("/cms/privacy-policy", { auth: false });

export const upsertTermsAndConditions = (body) =>
  apiRequest("/cms/admin/terms-and-conditions", { method: "PUT", body });

export const getTermsAndConditions = () =>
  apiRequest("/cms/terms-and-conditions", { auth: false });

export const getPageBySlug = ({ slug }) =>
  apiRequest(createPath("/cms/pages/:slug", { slug }), { auth: false });

export const getTermsOfServicePage = () =>
  apiRequest("/cms/pages/terms-and-conditions", { auth: false });

export const getCmsPrivacyPolicyPage = () =>
  apiRequest("/cms/pages/privacy-policy", { auth: false });

export const getCmsAboutUsPage = () =>
  apiRequest("/cms/pages/about-us", { auth: false });

export const adminListPages = (query = {}) =>
  apiRequest("/cms/admin/pages", { query });

export const adminCreatePage = (body) =>
  apiRequest("/cms/admin/pages", { method: "POST", body });

export const adminUpdatePage = ({ slug, body }) =>
  apiRequest(createPath("/cms/admin/pages/:slug", { slug }), {
    method: "PATCH",
    body,
  });

export const adminDeletePage = ({ slug }) =>
  apiRequest(createPath("/cms/admin/pages/:slug", { slug }), {
    method: "DELETE",
  });

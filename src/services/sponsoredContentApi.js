import { apiRequest, apiRequestWithFallback, createPath } from "./httpClient";

export const listAds = (query = {}) =>
  apiRequestWithFallback(["/ads/admin", "/admin/ads"], { query });

export const createAd = (body) =>
  apiRequestWithFallback(["/ads/admin", "/admin/ads"], {
    method: "POST",
    body,
    contentType: body instanceof FormData ? null : "application/json",
  });

export const updateAd = ({ id, body }) =>
  apiRequestWithFallback(
    [createPath("/ads/admin/:id", { id }), createPath("/admin/ads/:id", { id })],
    {
      method: "PATCH",
      body,
      contentType: body instanceof FormData ? null : "application/json",
    }
  ).catch((error) => {
    if (error?.status === 404 || error?.status === 405) {
      return apiRequest(createPath("/ads/admin/:id", { id }), {
        method: "PUT",
        body,
        contentType: body instanceof FormData ? null : "application/json",
      });
    }
    throw error;
  });

export const deleteAd = ({ id }) =>
  apiRequestWithFallback(
    [createPath("/ads/admin/:id", { id }), createPath("/admin/ads/:id", { id })],
    { method: "DELETE" }
  );

export const updateAdStatus = ({ id, body }) =>
  updateAd({
    id,
    body: {
      status: body?.status,
    },
  });

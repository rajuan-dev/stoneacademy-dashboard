import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, Plus, Search, SlidersHorizontal } from "lucide-react";
import { MdDelete } from "react-icons/md";
import { CiPower } from "react-icons/ci";
import {
  createAd,
  deleteAd,
  listAds,
  updateAd,
  updateAdStatus,
} from "../../services/sponsoredContentApi";

const AD_IMAGE_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <rect width="640" height="360" fill="#eef4fb"/>
    <rect x="72" y="72" width="496" height="216" rx="24" fill="#dbe8f6" stroke="#b9d1eb" stroke-width="4"/>
    <circle cx="220" cy="154" r="26" fill="#8fb5de"/>
    <path d="M140 246l96-92 74 70 54-48 136 70H140z" fill="#71ABE0"/>
    <text x="320" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#4f6f91">Ad Preview</text>
  </svg>`,
)}`;

const createBlankAdForm = () => ({
  id: null,
  name: "",
  category: "",
  description: "",
  price: "",
  imageUrl: "",
  imageFile: null,
  linkUrl: "",
  country: "",
  state: "",
  city: "",
  status: "active",
});

const normalizeAds = (payload) => {
  const items = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.data?.items)
      ? payload.data.items
      : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
          ? payload
          : [];

  return items.map((item) => ({
    id: String(item?._id || item?.id || ""),
    name: item?.name || "",
    category: item?.category || "",
    description: item?.description || "",
    price: item?.price ?? 0,
    imageUrl: item?.imageUrl || "",
    linkUrl: item?.linkUrl || "",
    country: item?.country || "",
    state: item?.state || "",
    city: item?.city || "",
    status: item?.status || "active",
    isActive: item?.status === "active",
    createdAt: item?.createdAt || null,
  }));
};

const createPayload = (formData) => ({
  name: formData.name.trim(),
  category: formData.category.trim() || undefined,
  description: formData.description.trim() || undefined,
  price: formData.price === "" ? 0 : Number.parseFloat(formData.price) || 0,
  linkUrl: formData.linkUrl.trim(),
  country: formData.country.trim(),
  state: formData.state.trim() || undefined,
  city: formData.city.trim() || undefined,
  status: formData.status,
});

const createMultipartPayload = (formData) => {
  const payload = createPayload(formData);
  const multipart = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    multipart.append(key, String(value));
  });

  if (formData.imageFile) {
    multipart.append("image", formData.imageFile);
  }

  return multipart;
};

const normalizeUrlInput = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    return parsed.toString();
  } catch {
    return "";
  }
};

const AdsSetup = () => {
  const [ads, setAds] = useState([]);
  const [editingAd, setEditingAd] = useState(null);
  const [deletingAd, setDeletingAd] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState(createBlankAdForm());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  const loadAds = useCallback(async () => {
    try {
      setIsLoading(true);
      const payload = await listAds({
        page: 1,
        limit: 100,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setAds(normalizeAds(payload));
    } catch {
      setAds([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const stats = useMemo(() => {
    const activeCount = ads.filter((ad) => ad.isActive).length;
    const countriesLive = new Set(ads.map((ad) => ad.country).filter(Boolean)).size;
    const citiesLive = new Set(
      ads.map((ad) => `${ad.country}-${ad.state}-${ad.city}`).filter(Boolean),
    ).size;

    return {
      activeCount,
      countriesLive,
      citiesLive,
    };
  }, [ads]);

  const displayAds = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const filtered = keyword
      ? ads.filter((ad) =>
          [
            ad.name,
            ad.category,
            ad.description,
            ad.linkUrl,
            ad.country,
            ad.state,
            ad.city,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword)),
        )
      : ads;

    return [...filtered].sort((a, b) => {
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      }
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [ads, searchTerm, sortBy]);

  const handleInputChange = (field, value) => {
    if (field === "imageUrl") {
      setPreviewFailed(false);
    }
    setFormData((prev) => ({
      ...prev,
      imageFile: field === "imageUrl" ? null : prev.imageFile,
      [field]: value,
    }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewFailed(false);
      setFormData((prev) => ({
        ...prev,
        imageUrl: reader.result ?? "",
        imageFile: file,
      }));
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => setFormData(createBlankAdForm());

  const handleCreate = () => {
    setPreviewFailed(false);
    resetForm();
    setEditingAd(null);
    setIsCreating(true);
  };

  const handleEdit = (ad) => {
    setPreviewFailed(false);
    setIsCreating(false);
    setEditingAd(ad);
    setFormData({
      id: ad.id,
      name: ad.name,
      category: ad.category,
      description: ad.description,
      price: ad.price === 0 ? "" : String(ad.price),
      imageUrl: ad.imageUrl,
      imageFile: null,
      linkUrl: ad.linkUrl,
      country: ad.country,
      state: ad.state,
      city: ad.city,
      status: ad.status || "active",
    });
  };

  const closeModal = () => {
    setPreviewFailed(false);
    setEditingAd(null);
    setIsCreating(false);
    resetForm();
  };

  const handleDelete = (ad) => setDeletingAd(ad);
  const closeDeleteModal = () => setDeletingAd(null);

  const handleInlineStatusToggle = async (ad) => {
    try {
      await updateAdStatus({
        id: ad.id,
        body: { status: ad.isActive ? "expired" : "active" },
      });
      await loadAds();
    } catch {
      alert("Failed to update status");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAd) return;
    try {
      setIsDeleting(true);
      await deleteAd({ id: deletingAd.id });
      setDeletingAd(null);
      await loadAds();
    } catch {
      alert("Failed to delete ad");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Product name is required");
      return;
    }
    if (!formData.category.trim()) {
      alert("Category is required");
      return;
    }
    if (formData.price === "" || Number.parseFloat(formData.price) < 0) {
      alert("Price is required");
      return;
    }
    if (!formData.linkUrl.trim()) {
      alert("URL is required");
      return;
    }
    if (!formData.country.trim()) {
      alert("Country is required");
      return;
    }
    if (!formData.imageFile && !formData.imageUrl.trim()) {
      alert("Ad image is required");
      return;
    }

    const normalizedUrl = normalizeUrlInput(formData.linkUrl);
    if (!normalizedUrl) {
      alert("Please enter a valid destination URL");
      return;
    }

    try {
      setIsSaving(true);
      const nextFormState = {
        ...formData,
        linkUrl: normalizedUrl,
      };
      const payload = formData.imageFile
        ? createMultipartPayload(nextFormState)
        : createPayload(nextFormState);

      if (editingAd) {
        await updateAd({ id: editingAd.id, body: payload });
      } else {
        await createAd(payload);
      }

      closeModal();
      await loadAds();
    } catch (error) {
      alert(error?.message || "Failed to save ad");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full p-4 space-y-6 bg-gray-50">
      <section className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-[#71ABE0] uppercase">
              Campaign Control
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-gray-900">
              Ads Setup Workspace
            </h1>
            <p className="text-sm text-gray-500">
              Manage sponsored ads with country, state, and city targeting.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white rounded-xl bg-[#71ABE0] hover:bg-[#5a94c9] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create New Ad
          </button>
        </div>

        <div className="grid gap-4 mt-8 md:grid-cols-2 xl:grid-cols-4">
          <div className="p-4 bg-[#F4F8FC] rounded-xl">
            <p className="text-xs font-medium text-gray-500 uppercase">Active Ads</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.activeCount}</p>
            <p className="text-sm text-gray-500">{stats.activeCount} of {ads.length} live</p>
          </div>
          <div className="p-4 bg-[#F4F8FC] rounded-xl">
            <p className="text-xs font-medium text-gray-500 uppercase">Countries Live</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.countriesLive}</p>
            <p className="text-sm text-gray-500">Geographies with active catalog coverage</p>
          </div>
          <div className="p-4 bg-[#F4F8FC] rounded-xl">
            <p className="text-xs font-medium text-gray-500 uppercase">City Targets</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.citiesLive}</p>
            <p className="text-sm text-gray-500">Unique country/state/city combinations</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="sticky top-0 z-20 p-6 space-y-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <SlidersHorizontal className="w-4 h-4 text-[#71ABE0]" />
            <span>Showing {displayAds.length} ads</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Keyword Search
              </label>
              <div className="relative">
                <Search className="absolute w-4 h-4 text-gray-400 left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, URL, or location"
                  className="w-full py-3 pl-11 pr-4 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#71ABE0]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#71ABE0]"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#71ABE0]"
              >
                <option value="recent">Newest first</option>
                <option value="name-asc">Alphabetical</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
          {isLoading ? (
            <div className="py-12 text-center">
              <p className="text-lg font-semibold text-gray-900">Loading ads...</p>
            </div>
          ) : displayAds.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-lg font-semibold text-gray-900">
                No ads match the current filters
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs font-semibold tracking-wide text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Ad</th>
                    <th className="px-6 py-4">Targeting</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayAds.map((ad, index) => (
                    <tr key={ad.id || `${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {String(index + 1).padStart(2, "0")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={ad.imageUrl || AD_IMAGE_PLACEHOLDER}
                            alt={ad.name || "Ad creative"}
                            className="object-cover rounded-lg w-12 h-12"
                          />
                          <div>
                            <p className="font-semibold text-gray-900">
                              {ad.name || "Untitled"}
                            </p>
                            <p className="text-xs text-gray-500 max-w-[240px] truncate">
                              {ad.category || "No category"}
                            </p>
                            <p className="text-xs text-gray-500 max-w-[240px] truncate">
                              {ad.linkUrl || "No URL"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-800">{ad.country || "No country"}</p>
                        <p className="text-xs text-gray-500">
                          {[ad.state, ad.city].filter(Boolean).join(" / ") || "All subregions"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={ad.isActive}
                              onChange={() => handleInlineStatusToggle(ad)}
                            />
                            <span className="w-11 h-6 bg-gray-300 rounded-full peer peer-focus:outline-none peer-checked:bg-[#71ABE0] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:h-5 after:w-5 after:rounded-full after:transition-all peer-checked:after:translate-x-full"></span>
                          </label>
                          <span
                            className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                              ad.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {ad.isActive ? "Active" : "Expired"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(ad)}
                            className="p-2 transition-colors bg-blue-50 rounded-full hover:bg-blue-100"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ad)}
                            className="p-2 transition-colors bg-red-50 rounded-full hover:bg-red-100"
                            title="Delete"
                          >
                            <MdDelete className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {(isCreating || editingAd) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black bg-opacity-40"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-semibold text-[#71ABE0] sm:text-3xl">
                  {isCreating ? "Create New Sponsored Ad" : "Edit Sponsored Ad"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure creative, destination, schedule, and location targeting in one place.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
              <div className="space-y-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#71ABE0]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => handleInputChange("category", e.target.value)}
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#71ABE0]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#71ABE0]"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Price
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => handleInputChange("price", e.target.value)}
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#71ABE0]"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      URL
                    </label>
                    <input
                      type="url"
                      value={formData.linkUrl}
                      onChange={(e) => handleInputChange("linkUrl", e.target.value)}
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#71ABE0]"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleInputChange("country", e.target.value)}
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#71ABE0]"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      State / Division
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange("state", e.target.value)}
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#71ABE0]"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#71ABE0]"
                    />
                  </div>

                </div>
              </div>

              <div className="space-y-6">
                <div className="p-5 border border-blue-100 rounded-2xl bg-gradient-to-br from-blue-50 to-white">
                  <label className="block mb-3 text-sm font-medium text-gray-700">
                    Upload Creative
                  </label>
                  <div className="flex flex-col gap-4">
                    <label
                      htmlFor="ad-image-upload"
                      className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white rounded-xl cursor-pointer bg-[#71ABE0] hover:bg-[#5a94c9]"
                    >
                      Upload image
                    </label>
                    <input
                      id="ad-image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <div className="overflow-hidden border border-gray-200 rounded-2xl bg-white">
                      <img
                        src={!previewFailed && formData.imageUrl ? formData.imageUrl : AD_IMAGE_PLACEHOLDER}
                        alt="Ad preview"
                        className="object-cover w-full aspect-[16/10]"
                        onError={() => setPreviewFailed(true)}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-gray-50">
                  <label className="block mb-3 text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-gray-50 rounded-full">
                        <CiPower />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Activate Now?</p>
                        <p className="text-xs text-gray-500">Only active ads can appear in the feed</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.status === "active"}
                        onChange={(e) =>
                          handleInputChange("status", e.target.checked ? "active" : "expired")
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-[#71ABE0] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 transition-colors bg-white border border-[#71ABE0] rounded-xl hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 text-sm font-medium text-white bg-[#71ABE0] rounded-xl hover:bg-[#5a94c9] transition-colors disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : isCreating ? "Save Ad" : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletingAd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black bg-opacity-40"
          onClick={closeDeleteModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm p-6 bg-white rounded-lg shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-4 text-2xl font-bold text-center">
              Do you want to delete this Ad?
            </h3>
            <p className="mb-6 text-sm text-center text-gray-500">
              {deletingAd.name || "Unnamed ad"} will be removed.
            </p>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="px-4 py-2 text-sm transition-colors bg-white border border-[#71ABE0] text-[#71ABE0] rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm text-white transition-colors bg-red-600 rounded hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdsSetup;

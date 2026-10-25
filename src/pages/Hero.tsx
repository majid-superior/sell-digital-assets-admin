import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Icons } from "@/lib/icons/index.ts";
import {
  Card,
  CardContent,
  Badge,
  Button,
  Input,
  EmptyState,
  Modal,
} from "@/components/ui/index.ts";
import { ImageCropModal } from "@/components/ImageCropModal.tsx";
import { heroService, type HeroImage } from "@/services/heroService.ts";

const MAX_HERO_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB strict limit
const TARGET_ASPECT_RATIO = 3 / 4; // 0.75

export const Hero: React.FC = () => {
  const [heroImages, setHeroImages] = useState<HeroImage[]>(
    () => heroService.getCachedHeroImages() || [],
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !heroService.getCachedHeroImages(),
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detectedDimensions, setDetectedDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cropper Modal state
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  const [pendingCropSrc, setPendingCropSrc] = useState<string | null>(null);

  // Mutation tracking
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmImage, setDeleteConfirmImage] = useState<HeroImage | null>(null);

  // Load hero images on mount
  useEffect(() => {
    let isMounted = true;
    const hasCached = !!heroService.getCachedHeroImages();
    heroService
      .getHeroImages({ silent: hasCached })
      .then((data) => {
        if (!isMounted) return;
        setHeroImages(data);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setIsLoading(false);
        const message = err instanceof Error ? err.message : "Failed to load hero images";
        toast.error("Hero Data Unavailable", { description: message });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Manual refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await heroService.getHeroImages({ silent: true });
      setHeroImages(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load hero images";
      toast.error("Hero Data Unavailable", { description: message });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle file selection with 2MB limit and 3:4 aspect ratio detection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid File Type", {
        description: "Please select an image file (JPEG, PNG, or WebP).",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Strict 2 MB Max File Size Check
    if (file.size > MAX_HERO_IMAGE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      toast.error("File Exceeds 2 MB Limit", {
        description: `Selected file is ${sizeMb} MB. Maximum allowed upload size is 2 MB. Please compress or select a smaller image.`,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Analyze Resolution & Aspect Ratio
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const ratio = width / height;
      const isExactAspect = Math.abs(ratio - TARGET_ASPECT_RATIO) < 0.02;

      setDetectedDimensions({ width, height });

      if (!isExactAspect) {
        // Different aspect ratio / resolution detected -> Launch Cropper Modal
        setPendingCropFile(file);
        setPendingCropSrc(objectUrl);
        setIsCropModalOpen(true);
        toast.info("Aspect Ratio Adjustment Needed", {
          description: `Image is ${width} × ${height} px. Adjust the 3:4 crop frame to compose your hero slide.`,
        });
      } else {
        // Matches 3:4 aspect ratio directly
        setUploadFile(file);
        setPreviewUrl(objectUrl);
        toast.success("Image Meets 3:4 Aspect Ratio", {
          description: `Resolution: ${width} × ${height} px`,
        });
        if (!title) {
          const derivedTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
          setTitle(derivedTitle.charAt(0).toUpperCase() + derivedTitle.slice(1));
        }
      }
    };
    img.src = objectUrl;
  };

  // Callback when user completes crop in ImageCropModal
  const handleCropComplete = (croppedFile: File, croppedPreviewUrl: string) => {
    setUploadFile(croppedFile);
    setPreviewUrl(croppedPreviewUrl);

    // Read cropped dimensions
    const img = new Image();
    img.onload = () => {
      setDetectedDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = croppedPreviewUrl;

    if (!title && pendingCropFile) {
      const derivedTitle = pendingCropFile.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setTitle(derivedTitle.charAt(0).toUpperCase() + derivedTitle.slice(1));
    }

    toast.success("Image Cropped to 3:4 Ratio", {
      description: "Cropped preview saved and ready for hero showcase.",
    });
  };

  // Re-open cropper modal on existing image
  const handleReCrop = () => {
    if (previewUrl && uploadFile) {
      setPendingCropFile(uploadFile);
      setPendingCropSrc(previewUrl);
      setIsCropModalOpen(true);
    }
  };

  // Submit upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error("Image Required", {
        description: "Please choose or crop an image file before saving.",
      });
      return;
    }

    if (uploadFile.size > MAX_HERO_IMAGE_SIZE_BYTES) {
      toast.error("File Exceeds 2 MB Limit", {
        description: "File size exceeds the 2 MB threshold.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("image", uploadFile);
      formData.append("title", title.trim() || "Hero Slide");
      if (subtitle.trim()) formData.append("subtitle", subtitle.trim());
      formData.append("sort_order", String(sortOrder));
      formData.append("is_active", String(isActive));

      const created = await heroService.uploadHeroImage(formData);
      setHeroImages((prev) => [created, ...prev]);

      toast.success("Hero Image Uploaded", {
        description: `"${created.title}" is now saved and ready in the showcase.`,
      });

      // Reset and close
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setPreviewUrl(null);
      setDetectedDimensions(null);
      setTitle("");
      setSubtitle("");
      setSortOrder(0);
      setIsActive(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload hero image";
      toast.error("Upload Failed", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active / deactive
  const handleToggleStatus = async (img: HeroImage) => {
    setTogglingId(img.id);
    const newStatus = !img.isActive;
    try {
      const updated = await heroService.toggleHeroStatus(img.id, newStatus);
      setHeroImages((prev) =>
        prev.map((item) => (item.id === img.id ? updated : item)),
      );
      toast.success(
        newStatus ? "Hero Image Activated" : "Hero Image Deactivated",
        {
          description: `"${img.title}" is now ${newStatus ? "visible in" : "hidden from"} the website hero.`,
        },
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Status update failed";
      toast.error("Status Update Failed", { description: message });
    } finally {
      setTogglingId(null);
    }
  };

  // Confirm delete
  const handleDelete = async () => {
    if (!deleteConfirmImage) return;
    const targetId = deleteConfirmImage.id;
    setDeletingId(targetId);

    try {
      await heroService.deleteHeroImage(targetId);
      setHeroImages((prev) => prev.filter((img) => img.id !== targetId));
      toast.success("Hero Image Deleted", {
        description: `"${deleteConfirmImage.title}" has been removed from database.`,
      });
      setDeleteConfirmImage(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error("Deletion Failed", { description: message });
    } finally {
      setDeletingId(null);
    }
  };

  const activeCount = Array.isArray(heroImages)
    ? heroImages.filter((img) => img?.isActive).length
    : 0;
  const inactiveCount = Array.isArray(heroImages)
    ? heroImages.length - activeCount
    : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">
              Hero Section Images
            </h1>
            {isRefreshing && (
              <span className="inline-flex items-center gap-1 text-xs text-primary animate-pulse">
                <Icons.RotateCcw size={12} className="animate-spin" />
                Syncing...
              </span>
            )}
          </div>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Configure the 15-image animated sliding showcase loaded on the website landing page.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleManualRefresh()}
            disabled={isRefreshing || isLoading}
            leftIcon={<Icons.RotateCcw size={14} className={isRefreshing ? "animate-spin" : ""} />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            leftIcon={<Icons.Plus size={16} />}
          >
            Upload Image
          </Button>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface shadow-xs transition-colors duration-150">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Total Configured
              </p>
              <h2 className="text-2xl font-bold text-on-surface mt-1">
                {heroImages.length}
              </h2>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Icons.Image size={22} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface shadow-xs transition-colors duration-150">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Active in Showcase
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h2 className="text-2xl font-bold text-emerald-500">
                  {activeCount}
                </h2>
                <span className="text-xs text-on-surface-variant">/ 15 slots</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Icons.Success size={22} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface shadow-xs transition-colors duration-150">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Deactivated / Hidden
              </p>
              <h2 className="text-2xl font-bold text-on-surface-variant mt-1">
                {inactiveCount}
              </h2>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-high text-on-surface-variant">
              <Icons.EyeOff size={22} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid View */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-64 rounded-2xl bg-surface-container-low animate-pulse border border-outline-variant/20"
            />
          ))}
        </div>
      ) : heroImages.length === 0 ? (
        <Card className="rounded-2xl border border-outline-variant/30 bg-surface-container-low text-on-surface p-8">
          <EmptyState
            icon={<Icons.Image size={36} />}
            title="No Hero Images Configured"
            description="The website landing page is currently rendering modern empty placeholder cards across all 15 slots. Upload images here to bring the sliding showcase to life."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsUploadModalOpen(true)}
                leftIcon={<Icons.Plus size={16} />}
              >
                Upload First Hero Image
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {heroImages
            .filter((img): img is HeroImage => Boolean(img && img.id))
            .map((img) => {
              const isToggling = togglingId === img.id;
            return (
              <Card
                key={img.id}
                className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 ${
                  img.isActive
                    ? "border-outline-variant/40 bg-surface-container hover:shadow-md"
                    : "border-outline-variant/20 bg-surface-container-low opacity-60 hover:opacity-100"
                }`}
              >
                {/* Image Frame with 3:4 Aspect Ratio */}
                <div className="relative aspect-3/4 w-full overflow-hidden bg-black/40">
                  <img
                    src={img.imageUrl}
                    alt={img.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Gradient shade */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    <Badge
                      variant={img.isActive ? "success" : "default"}
                      size="sm"
                      className="backdrop-blur-md shadow-xs pointer-events-auto"
                    >
                      {img.isActive ? "Active" : "Deactive"}
                    </Badge>

                    {img.subtitle && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-md text-white border border-white/20">
                        {img.subtitle}
                      </span>
                    )}
                  </div>

                  {/* Bottom Text Over Image */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 space-y-0.5 pointer-events-none text-white">
                    <h3 className="text-xs font-bold truncate drop-shadow-sm">
                      {img.title}
                    </h3>
                    <p className="text-[10px] text-white/70">
                      Sort #{img.sortOrder}
                    </p>
                  </div>
                </div>

                {/* Card Controls */}
                <CardContent className="p-3 flex items-center justify-between gap-2 border-t border-outline-variant/20">
                  <Button
                    variant={img.isActive ? "outline" : "primary"}
                    size="sm"
                    onClick={() => void handleToggleStatus(img)}
                    disabled={isToggling}
                    className="flex-1"
                  >
                    {isToggling ? "Updating..." : img.isActive ? "Deactivate" : "Activate"}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmImage(img)}
                    title="Delete image"
                    aria-label={`Delete ${img.title}`}
                    className="p-1.5 rounded-lg text-error hover:bg-error/10 transition-colors cursor-pointer"
                  >
                    <Icons.Trash size={14} />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsUploadModalOpen(false);
            setUploadFile(null);
            setPreviewUrl(null);
            setDetectedDimensions(null);
          }
        }}
        title="Upload Hero Showcase Image"
        description="Select an image to add to the landing page sliding hero grid. Images are stored and loaded dynamically."
        size="md"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {/* Informational Callout: Resolution, Aspect Ratio, 2MB limit */}
          <div className="p-3.5 rounded-xl bg-surface-container-high border border-outline-variant/30 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Icons.Sparkles size={14} />
              <span>Hero Image Guidelines &amp; Specifications</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-outline-variant/20">
              <div className="space-y-0.5">
                <span className="text-on-surface-variant block text-[10px]">Aspect Ratio</span>
                <span className="font-bold text-on-surface">3:4 (Portrait)</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-on-surface-variant block text-[10px]">Resolution</span>
                <span className="font-bold text-on-surface">600×800 px</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-on-surface-variant block text-[10px]">Max Size</span>
                <span className="font-bold text-emerald-500">2 MB limit</span>
              </div>
            </div>

            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Files must be <strong>2 MB or smaller</strong>. If you select an image with a different aspect ratio, a <strong>3:4 cropping tool</strong> will automatically open so you can crop and position it.
            </p>
          </div>

          {/* File Selector Dropzone / Preview */}
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5">
              Image File (JPEG, PNG, WebP — max 2 MB) *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative aspect-3/4 max-w-xs mx-auto rounded-2xl overflow-hidden border border-outline-variant/40 bg-black/40 group shadow-md">
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  className="w-full h-full object-cover"
                />

                {/* Overlaid Resolution Tag */}
                {detectedDimensions && (
                  <div className="absolute top-2 left-2 pointer-events-none">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 backdrop-blur-md text-white border border-white/20">
                      {detectedDimensions.width} × {detectedDimensions.height} px (3:4)
                    </span>
                  </div>
                )}

                {/* Hover Action Buttons */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity p-4">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleReCrop}
                    leftIcon={<Icons.Pencil size={14} />}
                  >
                    Adjust 3:4 Crop
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose Different File
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-outline-variant/50 hover:border-primary/60 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer bg-surface-container-low transition-colors"
              >
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <Icons.Image size={24} />
                </div>
                <div className="text-center px-4">
                  <p className="text-xs font-semibold text-on-surface">
                    Click to select an image from your device
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Portrait 3:4 or any image (automatic 3:4 cropper will open)
                  </p>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Max 2 MB
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Title / Label *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Neon Cyberpunk Metropolis"
              required
            />
          </div>

          {/* Subtitle / Tag Badge */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Badge / Tag (Optional)
              </label>
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Photo 4K, 3D Render"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Sort Order
              </label>
              <Input
                type="number"
                min={0}
                max={999}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Active Status Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="hero-is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded-sm border-outline-variant text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="hero-is-active" className="text-xs font-medium text-on-surface cursor-pointer">
              Set active immediately upon upload
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsUploadModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !uploadFile}
              leftIcon={isSubmitting ? <Icons.RotateCcw size={14} className="animate-spin" /> : <Icons.Plus size={14} />}
            >
              {isSubmitting ? "Uploading..." : "Save Image"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Interactive 3:4 Crop Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={pendingCropSrc}
        originalFile={pendingCropFile}
        onClose={() => {
          setIsCropModalOpen(false);
          setPendingCropFile(null);
          setPendingCropSrc(null);
        }}
        onCropComplete={handleCropComplete}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteConfirmImage)}
        onClose={() => setDeleteConfirmImage(null)}
        title="Confirm Deletion"
        description="Are you sure you want to permanently delete this hero image? It will be removed from the database and storage."
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-on-surface-variant">
            Deleting <span className="font-bold text-on-surface">{deleteConfirmImage?.title}</span> will immediately remove it from the hero slider.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmImage(null)}
              disabled={Boolean(deletingId)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => void handleDelete()}
              disabled={Boolean(deletingId)}
            >
              {deletingId ? "Deleting..." : "Delete Permanently"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Hero;

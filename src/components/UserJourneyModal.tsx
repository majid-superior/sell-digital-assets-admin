import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Icons } from "@/lib/icons/index.ts";
import { Badge, Button, Modal } from "@/components/ui/index.ts";
import {
  analyticsService,
  type UserJourneyData,
  type ManagedUser,
} from "@/services/index.ts";

export interface UserJourneyModalProps {
  user: ManagedUser | null;
  isOpen: boolean;
  onClose: () => void;
}

const getInitials = (name: string): string => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

export const UserJourneyModal: React.FC<UserJourneyModalProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  const [journeyData, setJourneyData] = useState<UserJourneyData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const handleClose = () => {
    setJourneyData(null);
    setIsLoading(true);
    onClose();
  };

  useEffect(() => {
    if (!isOpen || !user?.id) {
      return;
    }

    let isMounted = true;

    analyticsService
      .getUserJourney(user.id)
      .then((data) => {
        if (isMounted) {
          setJourneyData(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const message =
            err instanceof Error
              ? err.message
              : "Unable to load user behavior journey stream.";
          toast.error("User Activity Fetch Failed", {
            description: message,
          });
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.id]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="User Behavior Journey"
      description="Chronological active attention, searches, and marketplace interactions."
      size="xl"
      footer={
        <Button type="button" variant="outline" size="sm" onClick={handleClose}>
          Close
        </Button>
      }
    >
      {user && (
        <div className="space-y-5">
          {/* User Profile Summary */}
          <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20 shrink-0 select-none shadow-xs">
                {getInitials(user.name)}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-base text-on-surface truncate">
                  {user.name}
                </h4>
                <p className="text-xs text-on-surface-variant truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" size="sm" className="capitalize">
                {user.role}
              </Badge>
              <Badge
                variant={user.status.toLowerCase() === "deactive" ? "error" : "success"}
                size="sm"
                className="capitalize"
              >
                {user.status}
              </Badge>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/70 block">
                Total Focus Dwell
              </span>
              <span className="text-lg font-extrabold text-primary">
                {isLoading ? (
                  <span className="inline-block h-6 w-16 bg-surface-container-high animate-pulse rounded" />
                ) : (
                  `${journeyData?.totalDwellMinutes ?? 0}m`
                )}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/70 block">
                Member Since
              </span>
              <span className="text-xs font-mono font-medium text-on-surface block mt-1">
                {user.createdAt}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/70 block">
                Actions Logged
              </span>
              <span className="text-lg font-extrabold text-on-surface">
                {isLoading ? (
                  <span className="inline-block h-6 w-10 bg-surface-container-high animate-pulse rounded" />
                ) : (
                  journeyData?.timeline.length ?? 0
                )}
              </span>
            </div>
          </div>

          {/* Top Category Interests */}
          <div>
            <h5 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-2">
              Primary Category Interests
            </h5>
            {isLoading ? (
              <div className="flex gap-2">
                <span className="h-6 w-20 bg-surface-container-high animate-pulse rounded-full" />
                <span className="h-6 w-24 bg-surface-container-high animate-pulse rounded-full" />
              </div>
            ) : !journeyData?.primaryInterests || journeyData.primaryInterests.length === 0 ? (
              <p className="text-xs text-on-surface-variant">
                No category interest affinities calculated yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {journeyData.primaryInterests.map((interest, idx) => (
                  <Badge key={idx} variant="primary" size="sm">
                    {interest.category_name} ({interest.affinity_score} pts)
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Chronological Behavioral Timeline */}
          <div>
            <h5 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-2">
              Behavioral Activity Stream
            </h5>

            {isLoading ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 bg-surface-container-high animate-pulse rounded-lg"
                  />
                ))}
              </div>
            ) : !journeyData?.timeline || journeyData.timeline.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-surface-container-low border border-outline-variant/20">
                <Icons.Eye size={24} className="mx-auto text-on-surface-variant/40 mb-1" />
                <p className="text-xs font-semibold text-on-surface">No Activity Logged</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  User hasn't triggered page dwells, search queries, or cart events yet.
                </p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 overscroll-contain">
                {journeyData.timeline.map((event) => {
                  const isDwell = event.event_type === "dwell";
                  const isSearch = event.event_type === "search";
                  const isStore = event.event_type.includes("store");
                  const isCart = event.event_type.includes("cart");

                  return (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg border border-outline-variant/20 bg-surface-container-low flex items-start gap-3"
                    >
                      <div className="p-1.5 rounded-md bg-surface-container text-on-surface-variant shrink-0 mt-0.5">
                        {isDwell ? (
                          <Icons.Clock size={14} className="text-primary" />
                        ) : isSearch ? (
                          <Icons.Search size={14} className="text-secondary" />
                        ) : isCart ? (
                          <Icons.Cart size={14} className="text-success" />
                        ) : isStore ? (
                          <Icons.Store size={14} className="text-warning" />
                        ) : (
                          <Icons.Eye size={14} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-on-surface truncate">
                            {event.summary}
                          </p>
                          <span className="text-[10px] text-on-surface-variant/70 shrink-0 font-mono">
                            {new Date(event.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-on-surface-variant">
                          <span className="font-mono text-[10px] text-on-surface-variant/80">
                            {event.path}
                          </span>
                          {event.dwell_seconds > 0 && (
                            <span className="font-semibold text-primary">
                              {event.dwell_seconds}s active focus
                            </span>
                          )}
                          {event.metadata && typeof event.metadata === "object" && (
                            <span>
                              {Object.entries(event.metadata)
                                .filter(([, v]) => v !== null && v !== undefined)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(" • ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};


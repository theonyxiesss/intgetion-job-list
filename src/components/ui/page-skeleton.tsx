import type { ReactNode } from "react";
import { Container } from "./container";
import { Skeleton } from "./feedback";
import { LoadingStatus } from "./loading-status";

/**
 * Route `loading.tsx` placeholders (D595). Next shows them the moment a link
 * is clicked, while the server renders the page, so a click never looks dead.
 * Shapes follow the real pages; no data, no hooks, no inline style.
 */
function SkeletonMain({
  children,
  narrow = false,
}: {
  children: ReactNode;
  narrow?: boolean;
}) {
  return (
    <main aria-busy="true" className="py-10 md:py-16">
      <LoadingStatus />
      <Container narrow={narrow} className="flex flex-col gap-8">
        {children}
      </Container>
    </main>
  );
}

/** The PageHeader block: title and intro over a hairline. */
function HeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4 border-b border-line pb-8">
      <Skeleton className="h-10 w-2/3 max-w-[560px] md:h-14" />
      <Skeleton className="h-5 w-full max-w-[640px]" />
    </div>
  );
}

function RowsSkeleton({ rows }: { rows: number }) {
  return (
    <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex flex-col gap-3 p-4 md:p-6">
          <span className="flex items-center gap-3">
            <Skeleton className="size-10 shrink-0" />
            <Skeleton className="h-6 w-1/2" />
          </span>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/3" />
        </li>
      ))}
    </ul>
  );
}

/** A list page: jobs, freelance, tasks, events, UGC. */
export function CatalogSkeleton({
  filters = false,
  rows = 5,
}: {
  /** A filter column on the left from `lg`, as on freelance and events. */
  filters?: boolean;
  rows?: number;
}) {
  return (
    <SkeletonMain>
      <HeaderSkeleton />
      {filters ? (
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="hidden h-11 w-full lg:block" />
            <Skeleton className="hidden h-11 w-full lg:block" />
          </div>
          <RowsSkeleton rows={rows} />
        </div>
      ) : (
        <>
          <span className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-24" radius="full" />
            <Skeleton className="h-8 w-28" radius="full" />
            <Skeleton className="h-8 w-20" radius="full" />
          </span>
          <Skeleton className="h-11 w-full" />
          <RowsSkeleton rows={rows} />
        </>
      )}
    </SkeletonMain>
  );
}

/** One job, task or listing: back link, badges, title, company, text. */
export function DetailSkeleton() {
  return (
    <SkeletonMain>
      <Skeleton className="h-4 w-28" />
      <div className="flex flex-col gap-4">
        <span className="flex gap-2">
          <Skeleton className="h-6 w-24" radius="full" />
          <Skeleton className="h-6 w-20" radius="full" />
        </span>
        <Skeleton className="h-10 w-3/4 md:h-14" />
        <span className="flex items-center gap-3">
          <Skeleton className="size-12 shrink-0" />
          <Skeleton className="h-5 w-40" />
        </span>
      </div>
      <Skeleton className="h-11 w-36" radius="full" />
      <div className="flex max-w-[68ch] flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </SkeletonMain>
  );
}

/** A narrow page of bordered sections: account, services. */
export function SectionsSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <SkeletonMain narrow>
      <HeaderSkeleton />
      {Array.from({ length: sections }, (_, index) => (
        <div
          key={index}
          className="flex flex-col gap-4 rounded-lg border border-line p-4 md:p-6"
        >
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
    </SkeletonMain>
  );
}

/** The chat page: a few messages and the field at the bottom. */
export function ChatSkeleton() {
  return (
    <main aria-busy="true" className="flex min-h-0 flex-1 flex-col">
      <LoadingStatus />
      <Container narrow className="flex flex-1 flex-col justify-end gap-4 py-6">
        <Skeleton className="h-16 w-2/3" radius="lg" />
        <Skeleton className="h-10 w-1/2 self-end" radius="lg" />
        <Skeleton className="h-24 w-3/4" radius="lg" />
        <Skeleton className="h-12 w-full" radius="lg" />
      </Container>
    </main>
  );
}

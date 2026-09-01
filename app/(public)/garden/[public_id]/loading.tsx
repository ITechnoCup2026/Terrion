import { ListSkeleton } from '@/components/ui/Skeleton'

/**
 * Without this the garden fell back to the group's own loading.tsx, which is a
 * 3xl document column — twice the width of the page that then arrived. The
 * public garden is one narrow column of plot diagrams on a phone.
 */
export default function Loading() {
  return <ListSkeleton width="form" rows={2} />
}

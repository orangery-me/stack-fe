import { computed, type MaybeRefOrGetter, toValue } from "vue";
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryReturnType,
} from "@tanstack/vue-query";
import canvasService from "@/services/canvas.service";
import type { Canvas } from "../types";

export interface UseCanvasQueryParams {
  workspaceId?: MaybeRefOrGetter<string | undefined>;
  channelId?: MaybeRefOrGetter<string | undefined>;
  canvasId?: MaybeRefOrGetter<string | null | undefined>;
  staleTime?: number;
  enabled?: boolean;
}

/**
 * Server-side cache for a single canvas.
 * Nhận ref/computed để query reactive theo tab (selectedCanvasId).
 */
export function requestCanvas({
  canvasId,
  staleTime = 0,
}: UseCanvasQueryParams): UseQueryReturnType<Canvas, Error> {
  return useQuery({
    queryKey: computed(() => ["canvas", toValue(canvasId)]),
    queryFn: () => canvasService.getCanvas(toValue(canvasId) as string),
    staleTime,
    enabled: computed(() => !!toValue(canvasId)),
  });
}

// export async function handleReloadCanvas({ canvasId }: { canvasId: string }) {
//   queryClient.invalidateQueries({ queryKey: ["canvas", canvasId] });
// }

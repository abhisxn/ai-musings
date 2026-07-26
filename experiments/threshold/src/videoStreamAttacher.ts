/**
 * Pure attach-tracking logic for wiring a live MediaStream to whichever
 * <video> DOM node is currently mounted. Framework-agnostic (generic over
 * `Stream`/`Node`, no DOM types) so it can be exercised in this repo's
 * node-environment test runner (see useGestureControlsHook.test.ts for the
 * same pure-extraction pattern).
 *
 * ThresholdView conditionally unmounts/remounts its <video> element across
 * the init-screen / onboarding / main branches. The previous webcam setup
 * attached the stream to whichever node happened to be mounted the one time
 * the async `getUserMedia` setup resolved — any later remount (e.g.
 * dismissing onboarding) left the new node, and the store's `videoElement`,
 * silently disconnected from the live stream. This tracker re-attaches on
 * every node change, not just the first.
 */
export function createStreamAttacher<Stream, Node>(
  attach: (node: Node, stream: Stream | null) => void,
) {
  let currentStream: Stream | null = null
  let currentNode: Node | null = null
  let hasStream = false

  return {
    setStream(stream: Stream | null) {
      currentStream = stream
      hasStream = true
      if (currentNode) attach(currentNode, stream)
    },
    setNode(node: Node | null) {
      currentNode = node
      if (node && hasStream) attach(node, currentStream)
    },
  }
}

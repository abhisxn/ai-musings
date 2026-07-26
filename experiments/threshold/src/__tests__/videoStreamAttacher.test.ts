/// <reference types="vitest/globals" />
import { describe, it, expect, vi } from 'vitest'
import { createStreamAttacher } from '../videoStreamAttacher'

describe('createStreamAttacher', () => {
  it('does not attach before both a node and a stream are known', () => {
    const attach = vi.fn()
    const attacher = createStreamAttacher(attach)

    attacher.setNode('node-a')
    expect(attach).not.toHaveBeenCalled()
  })

  it('attaches once both node and stream have been set', () => {
    const attach = vi.fn()
    const attacher = createStreamAttacher(attach)

    attacher.setNode('node-a')
    attacher.setStream('stream-1')

    expect(attach).toHaveBeenCalledTimes(1)
    expect(attach).toHaveBeenCalledWith('node-a', 'stream-1')
  })

  it('re-attaches the already-known stream when the node remounts (the onboarding-dismiss bug)', () => {
    const attach = vi.fn()
    const attacher = createStreamAttacher(attach)

    attacher.setNode('node-a')
    attacher.setStream('stream-1')
    attach.mockClear()

    // Branch switch (e.g. showOnboarding flips): old node unmounts...
    attacher.setNode(null)
    expect(attach).not.toHaveBeenCalled()

    // ...and a brand-new <video> node mounts in its place.
    attacher.setNode('node-b')

    expect(attach).toHaveBeenCalledTimes(1)
    expect(attach).toHaveBeenCalledWith('node-b', 'stream-1')
  })

  it('attaches to the current node if the stream resolves after the node is already mounted', () => {
    const attach = vi.fn()
    const attacher = createStreamAttacher(attach)

    attacher.setNode('node-a')
    attacher.setStream('stream-1')

    expect(attach).toHaveBeenCalledTimes(1)
    expect(attach).toHaveBeenCalledWith('node-a', 'stream-1')
  })

  it('clears the stream when setStream(null) is called', () => {
    const attach = vi.fn()
    const attacher = createStreamAttacher(attach)

    attacher.setNode('node-a')
    attacher.setStream('stream-1')
    attach.mockClear()

    attacher.setStream(null)
    expect(attach).toHaveBeenCalledTimes(1)
    expect(attach).toHaveBeenCalledWith('node-a', null)
  })

  it('attaches a newer stream to whichever node is currently mounted', () => {
    const attach = vi.fn()
    const attacher = createStreamAttacher(attach)

    attacher.setNode('node-a')
    attacher.setStream('stream-1')
    attach.mockClear()

    attacher.setStream('stream-2')

    expect(attach).toHaveBeenCalledTimes(1)
    expect(attach).toHaveBeenCalledWith('node-a', 'stream-2')
  })
})

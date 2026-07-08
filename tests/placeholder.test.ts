import { describe, expect, it } from 'vitest'

import { ActionType } from '../src/engine/actionTypes.ts'

describe('vitest setup', () => {
  it('loads project source files successfully', () => {
    expect(ActionType.StartGame).toBe('START_GAME')
  })
})

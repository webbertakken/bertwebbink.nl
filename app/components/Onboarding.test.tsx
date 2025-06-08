import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageOnboarding } from './Onboarding'

describe('Onboarding', () => {
  render(<PageOnboarding />)

  it('renders a title', () => {
    expect(
      screen.getByRole('heading', { level: 3, name: 'About Page (/about) does not exist yet' }),
    ).toBeDefined()
  })
})

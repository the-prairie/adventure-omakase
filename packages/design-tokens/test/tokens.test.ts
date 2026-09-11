import { describe, expect, it } from 'vitest';

import { tokens, tokensToCssVariables } from '../src/index.js';

describe('semantic design tokens', () => {
  it('encodes the approved paper, ink, brass, vermilion and moss semantics', () => {
    expect(tokens.color.background).toBe('#F7F2E8');
    expect(tokens.color.textPrimary).toBe('#1D1C19');
    expect(tokens.color.accent).toBe('#B58C4A');
    expect(tokens.color.danger).toBe('#C65D47');
    expect(tokens.color.success).toBe('#68755F');
    expect(tokens.size.minimumTouchTarget).toBeGreaterThanOrEqual(44);
  });

  it('creates stable CSS custom properties for Studio', () => {
    expect(tokensToCssVariables()).toMatchObject({
      '--ao-color-background': tokens.color.background,
      '--ao-color-action-primary': tokens.color.actionPrimary,
      '--ao-color-accent': tokens.color.accent,
      '--ao-space-4': `${tokens.space[4]}px`,
      '--ao-radius-round': `${tokens.radius.round}px`,
      '--ao-type-size-display': `${tokens.type.size.display}px`,
      '--ao-type-line-height-display': `${tokens.type.lineHeight.display}px`,
      '--ao-type-weight-bold': tokens.type.weight.bold,
      '--ao-size-minimum-touch-target': `${tokens.size.minimumTouchTarget}px`,
      '--ao-size-primary-button-height': `${tokens.size.primaryButtonHeight}px`,
      '--ao-shadow-elevated': `0 ${tokens.shadow.elevated.offsetY}px ${tokens.shadow.elevated.radius}px color-mix(in srgb, ${tokens.shadow.elevated.color} ${tokens.shadow.elevated.opacity * 100}%, transparent)`,
      '--ao-motion-standard': `${tokens.motion.standard}ms`,
    });
  });
});

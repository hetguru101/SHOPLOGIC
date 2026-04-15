import { describe, expect, it } from 'vitest';
import { mergeConfig } from '@/modules/settings/mergeConfig';

describe('mergeConfig', () => {
  it('merges nested sequence objects without clobbering siblings', () => {
    const base = {
      default_labor_rate: 75,
      work_order_sequence: { format: 'WO-{SEQUENCE}', next_number: 10, reset_yearly: true },
      tech_id_sequence: { format: 'T-{SEQUENCE}', next_number: 2, reset_yearly: false },
    };
    const next = mergeConfig(base, {
      work_order_sequence: { next_number: 11 },
    });
    expect(next.default_labor_rate).toBe(75);
    expect(next.work_order_sequence.format).toBe('WO-{SEQUENCE}');
    expect(next.work_order_sequence.next_number).toBe(11);
    expect(next.tech_id_sequence.next_number).toBe(2);
  });
});

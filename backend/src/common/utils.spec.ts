import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { buildDateRange } from './utils';

describe('buildDateRange', () => {
  it('trả về undefined khi không có from/to', () => {
    assert.equal(buildDateRange(), undefined);
  });

  it('chỉ ngày: gte đầu ngày from, lt đầu ngày sau to theo +07:00', () => {
    const r = buildDateRange('2026-11-01', '2026-11-30');
    assert.equal(r?.gte?.toISOString(), '2026-10-31T17:00:00.000Z');
    assert.equal(r?.lt?.toISOString(), '2026-11-30T17:00:00.000Z');
    assert.equal(r?.lte, undefined);
  });

  it('ISO đầy đủ: parse trực tiếp, to dùng lte', () => {
    const r = buildDateRange('2026-11-01T08:00:00+07:00', '2026-11-30T10:30:00.000Z');
    assert.equal(r?.gte?.toISOString(), '2026-11-01T01:00:00.000Z');
    assert.equal(r?.lte?.toISOString(), '2026-11-30T10:30:00.000Z');
    assert.equal(r?.lt, undefined);
    assert.ok(!Number.isNaN(r!.lte!.getTime()));
  });

  it('chỉ from', () => {
    const r = buildDateRange('2026-11-01');
    assert.deepEqual(r, { gte: new Date('2026-10-31T17:00:00.000Z') });
  });

  it('chỉ to (qua ranh giới tháng)', () => {
    const r = buildDateRange(undefined, '2026-11-30');
    assert.deepEqual(r, { lt: new Date('2026-11-30T17:00:00.000Z') });
  });
});

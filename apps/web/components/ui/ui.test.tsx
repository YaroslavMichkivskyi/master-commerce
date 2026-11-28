import { describe, expect, it } from 'vitest';
import { render } from '../../test/gateway-stub';
import { CountBadge, StockBadge } from './badge';
import { Button, ButtonLink } from './button';
import { CheckBox, Selected } from './check-box';
import { SearchIcon } from './icons';
import { Input, NumberInput, RangeFields } from './input';
import { ImagePlaceholder } from './placeholder';
import { Price } from './price';

// The primitives render the roles, names and states assistive technology relies on
// (FR-003, FR-020); how they look is checked by the visual cases (phase 7).

describe('Button', () => {
  it('is a plain button unless told otherwise, so it never submits a form by accident', () => {
    expect(render(<Button>Go</Button>)).toMatch(/^<button type="button"/);
    expect(render(<Button type="submit">Go</Button>)).toContain('type="submit"');
  });

  it('can be disabled and takes the variant classes', () => {
    const html = render(
      <Button variant="secondary" size="sm" disabled>
        Go
      </Button>,
    );
    expect(html).toContain('disabled=""');
    expect(html).toContain('border-border-strong');
    expect(html).toContain('h-8');
  });

  it('as a link keeps the address and the look', () => {
    const html = render(<ButtonLink href="/c/cpus">CPUs</ButtonLink>);
    expect(html).toMatch(/^<a class="[^"]*bg-accent[^"]*" href="\/c\/cpus">CPUs<\/a>$/);
  });
});

describe('fields', () => {
  it('a field with `label` is wrapped in its label', () => {
    expect(render(<Input label="Email" name="email" />)).toMatch(
      /^<label[^>]*>Email<input[^>]*name="email"[^>]*\/><\/label>$/,
    );
  });

  it('a field without one keeps its aria-label', () => {
    expect(render(<Input type="search" aria-label="Search products" />)).toContain(
      'aria-label="Search products"',
    );
  });

  it('a number field takes any decimal and shows the decimal keypad', () => {
    const html = render(<NumberInput aria-label="Price" />);
    expect(html).toContain('type="number"');
    expect(html).toContain('step="any"');
    expect(html).toContain('inputMode="decimal"');
  });

  it('a range gives labelled from / to fields with the TASK-6 address keys', () => {
    const html = render(<RangeFields code="price" unit="€" min="100" placeholderMax="900" />);
    expect(html).toContain('From (€)');
    expect(html).toContain('To (€)');
    expect(html).toMatch(/name="price\.min" value="100"/);
    expect(html).toMatch(
      /placeholder="900"[^>]*name="price\.max"|name="price\.max"[^>]*placeholder="900"/,
    );
  });
});

describe('badges', () => {
  it('stock is told in words, with an icon hidden from screen readers', () => {
    const yes = render(<StockBadge inStock />);
    const no = render(<StockBadge inStock={false} />);
    expect(yes).toContain('In stock');
    expect(no).toContain('Out of stock');
    expect(yes).toContain('aria-hidden="true"');
    expect(yes).toContain('text-success');
    expect(no).toContain('text-danger');
  });

  it('a count says what it counts to screen readers', () => {
    expect(render(<CountBadge count={3} label="filters applied" />)).toMatch(
      /3<span class="sr-only"> filters applied<\/span>/,
    );
  });
});

describe('price', () => {
  it('in euros with figures of one width, the VAT note when asked', () => {
    expect(render(<Price cents={129999} />)).toContain('€1,299.99');
    expect(render(<Price cents={129999} />)).toContain('figures');
    expect(render(<Price cents={129999} />)).not.toContain('VAT');
    expect(render(<Price cents={129999} vatNote />)).toContain('incl. VAT');
  });
});

describe('filter box', () => {
  it('shows the state and says "selected" to screen readers only when selected', () => {
    expect(render(<CheckBox checked />)).toContain('aria-hidden="true"');
    expect(render(<CheckBox checked />)).toContain('<svg');
    expect(render(<CheckBox checked={false} />)).not.toContain('<svg');
    expect(render(<Selected checked />)).toBe('<span class="sr-only"> (selected)</span>');
    expect(render(<Selected checked={false} />)).toBe('');
  });
});

describe('placeholders and icons', () => {
  it('keep a fixed ratio and stay out of the accessibility tree', () => {
    expect(render(<ImagePlaceholder />)).toContain('aspect-4/3');
    expect(render(<ImagePlaceholder ratio="1/1" />)).toContain('aspect-square');
    expect(render(<ImagePlaceholder />)).toMatch(/^<div aria-hidden="true"/);
  });

  it('an icon is decorative unless it has a title, then it is a named image', () => {
    expect(render(<SearchIcon />)).toContain('aria-hidden="true"');
    const named = render(<SearchIcon title="Search" />);
    expect(named).toContain('role="img"');
    expect(named).toContain('aria-label="Search"');
    expect(named).toContain('<title>Search</title>');
  });
});

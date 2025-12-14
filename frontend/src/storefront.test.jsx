import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import Storefront from './storefront';

const mockProducts = [
  { id: 'p1', name: 'Prod A', price: 5, description: 'd1', license: true },
  { id: 'p2', name: 'Prod B', price: 10, description: 'd2', license: false },
];

describe('Storefront', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (url) => {
      if (url === '/products')
        return { ok: true, json: async () => mockProducts };
      return { ok: false, json: async () => ({}) };
    });
  });

  test('renders products list', async () => {
    render(<Storefront />);
    expect(screen.getByText(/Loading products/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/Loading products/i)).toBeNull());
    expect(screen.getByText('Prod A')).toBeInTheDocument();
    // price formatted as currency
    expect(screen.getByText(/\$5|5\.00|USD/)).toBeDefined();
    expect(screen.getAllByText(/Buy|Creating/).length).toBeGreaterThanOrEqual(2);
  });
});

import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LcarsButton from '../../components/ui/LcarsButton';

describe('LcarsButton', () => {
  test('renders button with text', () => {
    render(<LcarsButton>Test Button</LcarsButton>);
    
    const button = screen.getByRole('button', { name: /test button/i });
    expect(button).toBeInTheDocument();
  });

  test('handles click events', () => {
    const handleClick = vi.fn();
    render(<LcarsButton onClick={handleClick}>Click Me</LcarsButton>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('applies variant classes correctly', () => {
    const { rerender } = render(<LcarsButton variant="primary">Primary</LcarsButton>);
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('bg-[var(--lcars-orange)]');
    
    rerender(<LcarsButton variant="secondary">Secondary</LcarsButton>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-[var(--lcars-blue)]');
    
    rerender(<LcarsButton variant="danger">Danger</LcarsButton>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-[var(--lcars-red)]');
  });

  test('applies size classes correctly', () => {
    const { rerender } = render(<LcarsButton size="sm">Small</LcarsButton>);
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('px-4', 'py-2', 'text-sm');
    
    rerender(<LcarsButton size="lg">Large</LcarsButton>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('px-8', 'py-4', 'text-lg');
  });

  test('handles disabled state', () => {
    render(<LcarsButton disabled>Disabled Button</LcarsButton>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  test('shows loading state', () => {
    render(<LcarsButton loading>Loading Button</LcarsButton>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Processing...');
  });

  test('applies custom className', () => {
    render(<LcarsButton className="custom-class">Custom</LcarsButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });
});


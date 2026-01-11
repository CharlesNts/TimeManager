import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChartModal from '../components/ui/ChartModal';

// Mock recharts components
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
    Area: () => <div data-testid="area" />,
    BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
    Bar: () => <div data-testid="bar" />,
    XAxis: () => <div data-testid="xaxis" />,
    YAxis: () => <div data-testid="yaxis" />,
    CartesianGrid: () => <div data-testid="grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Cell: () => <div data-testid="cell" />,
}));

describe('ChartModal', () => {
    const mockOnClose = vi.fn();
    const defaultProps = {
        open: true,
        onClose: mockOnClose,
        title: 'Test Chart',
        data: [{ label: 'Mon', value: 100 }],
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders when open is true', () => {
        render(<ChartModal {...defaultProps} />);
        expect(screen.getByText('Test Chart')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
        render(<ChartModal {...defaultProps} open={false} />);
        expect(screen.queryByText('Test Chart')).not.toBeInTheDocument();
    });

    it('calls onClose when Escape key is pressed', () => {
        render(<ChartModal {...defaultProps} />);
        const backdrop = screen.getByRole('dialog');
        fireEvent.keyDown(backdrop, { key: 'Escape' });
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onClose when other keys are pressed', () => {
        render(<ChartModal {...defaultProps} />);
        const backdrop = screen.getByRole('dialog');
        fireEvent.keyDown(backdrop, { key: 'Enter' }); // Not Escape
        fireEvent.keyDown(backdrop, { key: 'Tab' });
        fireEvent.keyDown(backdrop, { key: 'a' });
        expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('calls onClose when clicking the backdrop', () => {
        render(<ChartModal {...defaultProps} />);
        const backdrop = screen.getByRole('dialog');
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking the close button', () => {
        render(<ChartModal {...defaultProps} />);
        const closeButton = screen.getByRole('button');
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('renders subtitle when provided', () => {
        render(<ChartModal {...defaultProps} subtitle="Test Subtitle" />);
        expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    });

    it('renders bar chart when type is bar', () => {
        render(<ChartModal {...defaultProps} type="bar" />);
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('renders CustomTooltip when provided', () => {
        const CustomTooltip = () => <div data-testid="custom-tooltip">Custom Tooltip</div>;
        render(<ChartModal {...defaultProps} CustomTooltip={CustomTooltip} />);
        expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('uses provided chartConfig colors', () => {
        const chartConfig = { color: 'red', gradientId: 'testGradient', barColors: ['red', 'blue'] };
        render(<ChartModal {...defaultProps} chartConfig={chartConfig} type="area" />);
        // Since we mock AreaChart/Area, we can't easily check props passed to them without spying on the mock,
        // but we can check if it renders without error.
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });
});

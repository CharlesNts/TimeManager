// src/components/ui/ChartModal.jsx
import React from 'react';
import { X } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

/**
 * ChartModal - Modal pour afficher un graphique en plein écran
 * 
 * Props:
 * - open: boolean - si le modal est ouvert
 * - onClose: () => void - callback pour fermer le modal
 * - title: string - titre du graphique
 * - subtitle: string - sous-titre optionnel
 * - data: array - données du graphique
 * - type: 'area' | 'bar' - type de graphique
 * - chartConfig: object - configuration du graphique (color, gradientId, tooltipType)
 * - CustomTooltip: component - composant tooltip personnalisé
 */
const ChartModal = ({
    open,
    onClose,
    title,
    subtitle,
    data = [],
    type = 'area',
    chartConfig = {},
    CustomTooltip
}) => {
    if (!open) return null;

    const {
        color = 'var(--color-desktop)',
        gradientId = 'modalFill',
        tooltipType = 'hours',
        barColors = ['#2563eb', '#94a3b8']
    } = chartConfig;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropClick}
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="chart-modal-title"
        >
            <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-5xl max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 id="chart-modal-title" className="text-xl font-semibold text-gray-900">{title}</h2>
                        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Chart */}
                <div className="p-6">
                    <div className="h-[50vh]">
                        <ResponsiveContainer width="100%" height="100%">
                            {type === 'area' ? (
                                <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                                    <defs>
                                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="6%" stopColor={color} stopOpacity={0.2} />
                                            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                                    <XAxis
                                        dataKey="label"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#6b7280' }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#6b7280' }}
                                        dx={-10}
                                    />
                                    <RechartsTooltip content={CustomTooltip ? <CustomTooltip type={tooltipType} /> : undefined} />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={color}
                                        fill={`url(#${gradientId})`}
                                        strokeWidth={2.5}
                                        dot={{ fill: color, strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6, strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            ) : (
                                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#6b7280' }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#6b7280' }}
                                        dx={-10}
                                    />
                                    <RechartsTooltip content={CustomTooltip ? <CustomTooltip type={tooltipType} /> : undefined} />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={barColors[Math.min(index, barColors.length - 1)]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <p className="text-xs text-gray-500 text-center">
                        Cliquez en dehors ou sur × pour fermer
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ChartModal;

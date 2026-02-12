import Chart from "chart.js/auto";
import "chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm";
import React, { useEffect, useRef } from "react";

type PredictionPoint = {
    timestamp: number;
    predictedPlayers: number;
};

type PredictionTheme = {
    grid: string;
    axis: string;
    tooltipBg: string;
    tooltipBorder: string;
    tooltipText: string;
};

export function PredictionChart({
    points,
    lineColor,
    theme,
}: {
    points: PredictionPoint[];
    lineColor: string;
    theme: PredictionTheme;
}) {
    const chartRef = useRef<Chart | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const pluginRegisteredRef = useRef(false);
    const hasManualViewportRef = useRef(false);

    useEffect(() => {
        if (pluginRegisteredRef.current || typeof window === "undefined") return;
        Chart.register(require("chartjs-plugin-zoom").default);
        pluginRegisteredRef.current = true;
    }, []);

    useEffect(() => {
        if (!points || points.length === 0) return;

        const dataPoints = points
            .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.predictedPlayers))
            .map((point) => ({ x: point.timestamp, y: point.predictedPlayers }));

        if (dataPoints.length === 0) return;

        const minX = Math.min(...dataPoints.map((point) => point.x));
        const maxX = Math.max(...dataPoints.map((point) => point.x));

        const maxYValue = Math.max(...dataPoints.map((point) => point.y), 1);
        const stepSize = Math.pow(10, Math.floor(Math.log10(Math.max(1, maxYValue))));

        if (chartRef.current) {
            const chart = chartRef.current;
            chart.data.datasets = [
                {
                    label: "Predicted players",
                    data: dataPoints,
                    borderColor: lineColor,
                    backgroundColor: lineColor,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.3,
                },
            ];

            if (chart.options?.scales?.x && !hasManualViewportRef.current) {
                const xScale = chart.options.scales.x as any;
                xScale.min = minX;
                xScale.max = maxX;
            }

            if (chart.options?.scales?.y) {
                const yScale = chart.options.scales.y as any;
                yScale.ticks.stepSize = stepSize;
            }

            chart.update("none");
            return;
        }

        if (!canvasRef.current) return;

        chartRef.current = new Chart(canvasRef.current, {
            type: "line",
            data: {
                datasets: [
                    {
                        label: "Predicted players",
                        data: dataPoints,
                        borderColor: lineColor,
                        backgroundColor: lineColor,
                        borderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        tension: 0.3,
                    },
                ],
            },
            options: {
                animation: false,
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        borderColor: theme.tooltipBorder,
                        borderWidth: 1,
                        titleColor: theme.tooltipText,
                        bodyColor: theme.tooltipText,
                        callbacks: {
                            title: (items: any[]) => {
                                const first = items?.[0];
                                if (!first) return "";
                                const timestamp = first.parsed?.x;
                                if (!timestamp) return "";
                                return new Date(timestamp).toLocaleString();
                            },
                            label: (item: any) => `Predicted players: ${item.parsed?.y ?? 0}`,
                        },
                    },
                    zoom: {
                        zoom: {
                            drag: {
                                enabled: true,
                                threshold: 8,
                            },
                            mode: "x",
                            onZoomComplete: () => {
                                hasManualViewportRef.current = true;
                            },
                        },
                    },
                },
                interaction: {
                    mode: "nearest",
                    intersect: false,
                },
                scales: {
                    y: {
                        ticks: {
                            color: theme.axis,
                            beginAtZero: true,
                            stepSize,
                            callback: (value: any) => (value < 0 ? 0 : value),
                        },
                        grid: {
                            borderDash: [3],
                            borderDashOffset: 3,
                            drawBorder: false,
                            color: theme.grid,
                        },
                    },
                    x: {
                        type: "time",
                        time: {
                            unit: "hour",
                            displayFormats: {
                                hour: "HH:mm",
                            },
                            tooltipFormat: "ll HH:mm",
                        },
                        min: minX,
                        max: maxX,
                        ticks: {
                            autoSkip: true,
                            color: theme.axis,
                            callback: (value: any) => {
                                const date = new Date(value);
                                return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                            },
                        },
                        grid: {
                            display: false,
                        },
                    },
                },
            },
        } as any);
    }, [points, lineColor, theme]);

    useEffect(() => {
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, []);

    const handleResetZoom = () => {
        const chart = chartRef.current;
        if (!chart) return;
        const dataset = chart.data.datasets?.[0] as any;
        const data = Array.isArray(dataset?.data) ? dataset.data : [];
        if (data.length === 0) return;
        const minX = Math.min(...data.map((point: any) => point.x));
        const maxX = Math.max(...data.map((point: any) => point.x));
        hasManualViewportRef.current = false;
        if (chart.options?.scales?.x) {
            const xScale = chart.options.scales.x as any;
            xScale.min = minX;
            xScale.max = maxX;
        }
        if (chart.options?.scales?.y) {
            const yScale = chart.options.scales.y as any;
            yScale.min = undefined;
            yScale.max = undefined;
        }
        chart.update();
    };

    return (
        <canvas
            ref={canvasRef}
            className="block h-full w-full p-2"
            onDoubleClick={handleResetZoom}
        />
    );
}

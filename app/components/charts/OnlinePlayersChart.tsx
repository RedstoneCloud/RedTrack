import Chart from "chart.js/auto";
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
import React, { useEffect, useRef } from "react";

export function OnlinePlayersChart({ data, preserveViewport = false }: { data: any; preserveViewport?: boolean }) {
    const chartRef = useRef<Chart | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const pluginRegisteredRef = useRef(false);

    useEffect(() => {
        if (pluginRegisteredRef.current || typeof window === "undefined") return;
        Chart.register(require("chartjs-plugin-zoom").default);
        pluginRegisteredRef.current = true;
    }, []);

    useEffect(() => {
        if (!data || !data.data) return;

        const hiddenMap = new Map<string, boolean>();
        if (chartRef.current) {
            chartRef.current.data.datasets.forEach((dataset: any, index: number) => {
                const meta = chartRef.current?.getDatasetMeta(index);
                hiddenMap.set(String(dataset.label), Boolean(dataset.hidden || meta?.hidden));
            });
        }

        const datasets: any[] = [];
        for (const server in data.data) {
            const serverData = data.data[server];
            const label = serverData.name || server;

            datasets.push({
                label,
                data: serverData.pings.map((point: any) => ({
                    x: point.timestamp,
                    y: point.count
                })),
                fill: false,
                pointRadius: 0,
                pointHoverRadius: 0,
                backgroundColor: serverData.color,
                borderColor: serverData.color,
                hidden: hiddenMap.get(String(label)) || false,
            });
        }

        const maxYValue = datasets.length
            ? Math.max(...datasets.map((dataset: any) => Math.max(...dataset.data.map((point: any) => point.y))))
            : 1;
        const stepSize = Math.pow(10, Math.floor(Math.log10(Math.max(1, maxYValue))));

        if (chartRef.current) {
            chartRef.current.data.datasets = datasets;

            if (chartRef.current.options?.scales && 'x' in chartRef.current.options.scales) {
                const xScale = chartRef.current.options.scales.x as any;
                if (xScale?.time) {
                    xScale.time.unit = data.type;
                }
                if (!preserveViewport) {
                    xScale.min = data.from;
                    xScale.max = data.to;
                }
            }

            if (chartRef.current.options?.scales && 'y' in chartRef.current.options.scales) {
                const yScale = chartRef.current.options.scales.y as any;
                if (yScale?.ticks) {
                    yScale.ticks.stepSize = stepSize;
                }
            }

            chartRef.current.update('none');
            return;
        }

        if (!canvasRef.current) return;

        chartRef.current = new Chart(canvasRef.current, {
            type: 'line',
            data: { datasets },
            options: {
                animation: false,
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                    title: {
                        display: false,
                        text: "Players online",
                        color: "white",
                    },
                    legend: {
                        labels: {
                            color: "white",
                        },
                        align: "end",
                        position: "bottom",
                    },
                    tooltip: {
                        position: 'nearest',
                        mode: 'index',
                        intersect: false,
                        backgroundColor: "rgba(0,0,0,0.8)",
                        titleColor: "white",
                        bodyColor: "white",
                        footerColor: "white",
                        itemSort: (a: any, b: any) => b.parsed.y - a.parsed.y,
                    },
                    zoom: {
                        zoom: {
                            drag: {
                                enabled: true,
                                threshold: 10
                            },
                            pan: {
                                enabled: true
                            },
                            mode: 'x',
                        },
                    }
                },
                interaction: {
                    mode: "index",
                    intersect: false,
                },
                hover: {
                    mode: "nearest",
                    intersect: true,
                },
                scales: {
                    y: {
                        ticks: {
                            color: "rgba(255,255,255,.7)",
                            beginAtZero: true,
                            stepSize,
                            callback: (value: any) => value < 0 ? 0 : value,
                        },
                        grid: {
                            borderDash: [3],
                            borderDashOffset: 3,
                            drawBorder: false,
                            color: "rgba(255, 255, 255, 0.15)",
                        },
                    },
                    x: {
                        type: 'time',
                        time: {
                            tooltipFormat: 'll hh:mm:ss',
                            displayFormats: {
                                minute: 'll',
                                hour: 'll HH:mm',
                                day: 'll HH:mm',
                                month: 'll HH:mm',
                                year: 'll HH:mm',
                            },
                            unit: data.type,
                        },
                        min: data.from,
                        max: data.to,
                        ticks: {
                            autoSkip: true,
                            color: "white",
                            callback: (val: any) => {
                                const date = new Date(val);
                                return [date.toLocaleDateString(), date.toLocaleTimeString()];
                            }
                        },
                        grid: {
                            display: false,
                        },
                    },
                },
            }
        } as any);
    }, [data, preserveViewport]);

    useEffect(() => {
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="p-2"
            onDoubleClick={() => {
                const chart = chartRef.current;
                if (!chart) return;
                // @ts-ignore
                chart.options.scales.x.min = undefined;
                // @ts-ignore
                chart.options.scales.x.max = undefined;
                // @ts-ignore
                chart.options.scales.y.min = undefined;
                // @ts-ignore
                chart.options.scales.y.max = undefined;
                chart.update();
            }}
        ></canvas>
    );
}

import Chart from "chart.js/auto";
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

export interface OnlinePlayersChartHandle {
    resetZoom: () => void;
}

export const OnlinePlayersChart = forwardRef<OnlinePlayersChartHandle, { data: any; preserveViewport?: boolean; hiddenServers?: Set<string> }>(
    function OnlinePlayersChart({ data, preserveViewport = false, hiddenServers }, ref) {
        const chartRef = useRef<Chart | null>(null);
        const canvasRef = useRef<HTMLCanvasElement | null>(null);
        const pluginRegisteredRef = useRef(false);
        const hasManualViewportRef = useRef(false);

        useImperativeHandle(ref, () => ({
            resetZoom() {
                const chart = chartRef.current;
                if (!chart) return;
                hasManualViewportRef.current = false;
                // @ts-ignore
                chart.options.scales.x.min = Math.min(data?.from ?? Date.now() - 1, Date.now() - 1);
                // @ts-ignore
                chart.options.scales.x.max = Math.min(data?.to ?? Date.now(), Date.now());
                // @ts-ignore
                chart.options.scales.y.min = undefined;
                // @ts-ignore
                chart.options.scales.y.max = undefined;
                chart.update();
            }
        }), [data]);

        useEffect(() => {
            if (pluginRegisteredRef.current || typeof window === "undefined") return;
            Chart.register(require("chartjs-plugin-zoom").default);
            pluginRegisteredRef.current = true;
        }, []);

        useEffect(() => {
            if (!data || !data.data) return;

            const datasets: any[] = [];
            const toQuarterMinuteAverages = (pings: any[]) => {
                const buckets = new Map<number, { sum: number; count: number }>();
                for (const point of pings) {
                    const timestamp = Number(point.timestamp);
                    const count = Number(point.count);
                    if (!Number.isFinite(timestamp) || !Number.isFinite(count)) continue;
                    const bucketKey = Math.floor(timestamp / 15000);
                    const bucket = buckets.get(bucketKey);
                    if (bucket) {
                        bucket.sum += count;
                        bucket.count += 1;
                    } else {
                        buckets.set(bucketKey, { sum: count, count: 1 });
                    }
                }
                return Array.from(buckets.entries())
                    .sort((a, b) => a[0] - b[0])
                    .map(([bucketKey, bucket]) => ({
                        x: bucketKey * 15000,
                        y: Math.round(bucket.sum / bucket.count),
                    }));
            };
            for (const server in data.data) {
                const serverData = data.data[server];
                const label = serverData.name || server;

                datasets.push({
                    label,
                    data: toQuarterMinuteAverages(serverData.pings || []),
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    backgroundColor: serverData.color,
                    borderColor: serverData.color,
                    borderWidth: 3,
                    tension: 0.3,
                    hidden: hiddenServers ? hiddenServers.has(label) : false,
                });
            }

            const maxYValue = datasets.length
                ? Math.max(...datasets.filter(d => !d.hidden).map((dataset: any) => Math.max(...dataset.data.map((point: any) => point.y), 0)), 1)
                : 1;
            const stepSize = Math.pow(10, Math.floor(Math.log10(Math.max(1, maxYValue))));

            if (chartRef.current) {
                chartRef.current.data.datasets = datasets;

                if (chartRef.current.options?.scales && 'x' in chartRef.current.options.scales) {
                    const xScale = chartRef.current.options.scales.x as any;
                    if (xScale?.time) {
                        xScale.time.unit = data.type;
                    }
                    if (!preserveViewport && !hasManualViewportRef.current) {
                        const nowTs = Date.now();
                        xScale.min = Math.min(data.from, nowTs - 1);
                        xScale.max = Math.min(data.to, nowTs);
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
                            display: false,
                        },
                        tooltip: {
                            position: 'nearest',
                            mode: 'index',
                            intersect: false,
                            backgroundColor: "rgba(0,0,0,0.8)",
                            titleColor: "white",
                            bodyColor: "white",
                            footerColor: "white",
                            titleFont: { weight: "700" },
                            bodyFont: { weight: "400" },
                            callbacks: {
                                title: (items: any[]) => {
                                    const first = items?.[0];
                                    if (!first) return "";
                                    const timestamp = first.parsed?.x;
                                    if (!timestamp) return "";
                                    const date = new Date(timestamp);
                                    return date.toLocaleString();
                                },
                                label: (item: any) => `${item.dataset?.label || "Server"}: ${item.parsed?.y ?? 0}`,
                                labelTextColor: (item: any) => {
                                    const chartTooltip = item?.chart?.tooltip;
                                    const caretY = chartTooltip?.caretY ?? null;
                                    if (caretY == null) return "rgba(255,255,255,0.75)";
                                    let nearest = item;
                                    let nearestDist = Number.POSITIVE_INFINITY;
                                    for (const candidate of chartTooltip?.dataPoints || []) {
                                        const y = candidate?.element?.y;
                                        if (!Number.isFinite(y)) continue;
                                        const dist = Math.abs(y - caretY);
                                        if (dist < nearestDist) {
                                            nearest = candidate;
                                            nearestDist = dist;
                                        }
                                    }
                                    return item.dataset?.label === nearest?.dataset?.label
                                        ? "#ffffff"
                                        : "rgba(255,255,255,0.75)";
                                },
                            },
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
                                onZoomComplete: () => {
                                    hasManualViewportRef.current = true;
                                },
                            },
                        }
                    },
                    interaction: {
                        mode: "index",
                        intersect: false,
                    },
                    hover: {
                        mode: "nearest",
                        intersect: false,
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
                                tooltipFormat: 'll HH:mm:ss',
                                displayFormats: {
                                    minute: 'll',
                                    hour: 'll HH:mm',
                                    day: 'll HH:mm',
                                    month: 'll HH:mm',
                                    year: 'll HH:mm',
                                },
                                unit: data.type,
                            },
                            min: Math.min(data.from, Date.now() - 1),
                            max: Math.min(data.to, Date.now()),
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
        }, [data, preserveViewport, hiddenServers]);

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
                className="block h-full w-full p-2"
                onDoubleClick={() => {
                    const chart = chartRef.current;
                    if (!chart) return;
                    hasManualViewportRef.current = false;
                    // @ts-ignore
                    chart.options.scales.x.min = Math.min(data?.from ?? Date.now() - 1, Date.now() - 1);
                    // @ts-ignore
                    chart.options.scales.x.max = Math.min(data?.to ?? Date.now(), Date.now());
                    // @ts-ignore
                    chart.options.scales.y.min = undefined;
                    // @ts-ignore
                    chart.options.scales.y.max = undefined;
                    chart.update();
                }}
            ></canvas>
        );
    }
);

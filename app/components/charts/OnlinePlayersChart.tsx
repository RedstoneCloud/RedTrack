import Chart from "chart.js/auto";
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
import React, { useEffect, useRef } from "react";


export function OnlinePlayersChart({ data }: { data: any }) {
    Chart.register(require("chartjs-plugin-zoom").default)
    const chartRef = useRef<Chart | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (!data || !data.data) return; // Ensure data is valid

        let datasets: any[] = [];
        for (let server in data.data) {
            let serverData = data.data[server];

            let serverDataset = {
                label: serverData.name || server,
                data: serverData.pings.map((point: any) => ({
                    x: point.timestamp,
                    y: point.count
                })),
                fill: false,
                pointRadius: 0,
                pointHoverRadius: 0,
                backgroundColor: serverData.color,
                borderColor: serverData.color,
            };

            datasets.push(serverDataset);
        }

        const maxYValue = datasets.length
            ? Math.max(
                ...datasets.map((dataset: any) =>
                    Math.max(...dataset.data.map((point: any) => point.y))
                )
            )
            : 1;
        const stepSize = Math.pow(10, Math.floor(Math.log10(Math.max(1, maxYValue))));

        const options = {
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
                            //stepsize: if there is one with more then 10, use 10 as stepsize, if there is one with over 100, use 100 as stepsize, and so on. default is 1. do NEVER use numbers like 300, 60, 9 etc. only starting with 1 followed by zeroes
                            stepSize,
                            callback: (value: any) => {
                                return value < 0 ? 0 : value; // Prevents negative values
                            },
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
                            //allow tooltip to be multiple next to each other

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
                                let date = new Date(val);
                                return [
                                    date.toLocaleDateString(),
                                    date.toLocaleTimeString()
                                ];
                            }
                        },
                        grid: {
                            display: false,
                        },
                    },
                },
            }
        };

        // Destroy previous chart instance before creating a new one
        if (chartRef.current) {
            chartRef.current.data.datasets = datasets;
            if (chartRef.current.options?.scales && 'x' in chartRef.current.options.scales) {
                const xScale = chartRef.current.options.scales.x as any;
                if (xScale?.time) {
                    xScale.time.unit = data.type;
                }
                xScale.min = data.from;
                xScale.max = data.to;
            }
            chartRef.current.update('none');
        } else if (canvasRef.current) {
            chartRef.current = new Chart(canvasRef.current, options as any);
        }

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, [data]);

    return (
        <canvas ref={canvasRef} className="p-2"
            onDoubleClick={() => {
                let chart = chartRef.current;
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

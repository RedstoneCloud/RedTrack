import Chart from "chart.js/auto";
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
import React, { useEffect, useRef } from "react";

export function OnlinePlayersChart({ data }: { data: any }) {
    const chartRef = useRef<Chart | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (!data || !data.data) return; // Ensure data is valid

        let datasets = [];
        for (let server in data.data) {
            let serverData = data.data[server];

            let color = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
            let serverDataset = {
                label: server,
                data: serverData.map((point: any) => ({
                    x: point.timestamp,
                    y: point.count
                })),
                fill: false,
                pointRadius: 0,
                pointHoverRadius: 0,
                backgroundColor: color,
                borderColor: color,
            };

            datasets.push(serverDataset);
        }

        const options = {
            type: 'line',
            data: { datasets },
            options: {
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
                            stepSize: 1,
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
                            tooltipFormat: 'mm:ss',
                            displayFormats: {
                                minute: 'll',
                                hour: 'll HH:mm',
                                day: 'll',
                                week: 'll',
                                month: 'll',
                                year: 'll',
                            },
                            unit: data.type,
                        },
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
            },
        };

        // Destroy previous chart instance before creating a new one
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        // Create new chart
        if (canvasRef.current) {
            // @ts-ignore
            chartRef.current = new Chart(canvasRef.current, options);
        }

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [data]);

    return (
        <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-blueGray-700">
            <div className="p-4 flex-auto">
                {/* Chart */}
                <div className="relative h-350-px">
                    <canvas ref={canvasRef}></canvas>
                </div>
            </div>
        </div>
    );
}

import Chart from "chart.js";
import React from "react";

export function ServersChart({data} : {data: any}) {
    React.useEffect(() => {
        let datasets = [];

        for (let server in data.data) {
            let serverData = data.data[server];
            let serverDataset = {
                label: server,
                data: [] as any,
                fill: false,
                pointRadius: 0,
                pointHoverRadius: 0,
                backgroundColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
                borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
            };

            // Map server data to correct x positions
            for (let point of serverData) {
                serverDataset.data.push({
                    x: point.timestamp,
                    y: point.count
                });
            }

            datasets.push(serverDataset);
        }

        const ctx = (document.getElementById('serverstats') as HTMLCanvasElement).getContext('2d');

        new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                title: {
                    display: false,
                    text: "Players online",
                    fontColor: "white",
                },
                legend: {
                    labels: {
                        fontColor: "white",
                    },
                    align: "end",
                    position: "bottom",
                },
                tooltips: {
                    mode: "index",
                    intersect: false,
                },
                hover: {
                    mode: "nearest",
                    intersect: true,
                },
                scales: {
                    yAxes: [
                        {
                            ticks: {
                                fontColor: "rgba(255,255,255,.7)",
                                beginAtZero: true,
                                callback: function(value:number) {
                                    return value < 0 ? 0 : value; // Prevents negative values from being displayed
                                },
                                stepSize: 1,
                            },
                            display: true,
                            gridLines: {
                                borderDash: [3],
                                borderDashOffset: [3],
                                drawBorder: false,
                                color: "rgba(255, 255, 255, 0.15)",
                                zeroLineColor: "rgba(33, 37, 41, 0)",
                                zeroLineBorderDash: [2],
                                zeroLineBorderDashOffset: [2],
                            },
                        },
                    ],
                    xAxes: [
                        {
                            type: 'time',
                            time: {
                                tooltipFormat: 'YYYY-MM-DD HH:mm:ss',
                                displayFormats: {
                                    minute: 'll', // Display the date as 'Month Day, Year'
                                    hour: 'll HH:mm', // Display both date and hour: 'Month Day, Year HH:mm'
                                    day: 'll', // Display the date as 'Month Day, Year'
                                    week: 'll', // Display the date as 'Month Day, Year'
                                    month: 'll', // Display the date as 'Month Day, Year'
                                    year: 'll', // Display the date as 'Month Day, Year'
                                },
                                unit: data.type,
                            },
                            ticks: {
                                autoSkip: true, // Prevents automatic skipping
                                callback: (val : any) => {
                                    //split val by last space
                                    let split = val.split(" ");
                                    //return everything before last space and after lsat space in array
                                    return [
                                        split.slice(0, split.length - 1).join(" "),
                                        split[split.length - 1]
                                    ]
                                }
                            },
                            display: true,
                            scaleLabel: {
                                display: false,
                                labelString: "Month",
                                fontColor: "white",
                            },
                            gridLines: {
                                display: false,
                                borderDash: [2],
                                borderDashOffset: [2],
                                color: "rgba(33, 37, 41, 0.3)",
                                zeroLineColor: "rgba(0, 0, 0, 0)",
                                zeroLineBorderDash: [2],
                                zeroLineBorderDashOffset: [2],
                            },
                        },
                    ],
                }
            }
        });
    }, [data]);
    return (
        <>
            <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-blueGray-700">
                <div className="rounded-t mb-0 px-4 py-3 bg-transparent">
                    <div className="flex flex-wrap items-center">
                        <div className="relative w-full max-w-full flex-grow flex-1">
                            <h6 className="uppercase text-blueGray-100 mb-1 text-xs font-semibold">
                                Overview
                            </h6>
                            <h2 className="text-white text-xl font-semibold">Sales value</h2>
                        </div>
                    </div>
                </div>
                <div className="p-4 flex-auto">
                    {/* Chart */}
                    <div className="relative h-350-px">
                        <canvas id="serverstats"></canvas>
                    </div>
                </div>
            </div>
        </>
    );

}
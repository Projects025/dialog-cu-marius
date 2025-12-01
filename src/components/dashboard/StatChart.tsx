
"use client"

import * as React from "react"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

interface StatChartProps {
    title: string;
    description: string;
    type: 'bar' | 'line';
    data: any[];
    dataKey?: string;
    categories?: string[];
}

const chartConfig = {
    'Luna curentă': {
      label: "Luna curentă",
      color: "hsl(var(--chart-1))",
    },
    'Luna trecută': {
        label: "Luna trecută",
        color: "hsl(var(--muted))",
    },
    count: {
        label: "Număr",
        color: "hsl(var(--primary))",
    }
} satisfies ChartConfig;


export default function StatChart({ title, description, type, data, dataKey, categories }: StatChartProps) {
    
    const renderChart = () => {
        if (type === 'bar' && categories) {
             return (
                <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/>
                    <ChartTooltip
                        cursor={{ fill: 'hsla(var(--muted))' }}
                        content={<ChartTooltipContent />} 
                    />
                    <Legend content={({ payload }) => (
                        <div className="flex gap-4 justify-center mt-2">
                        {payload?.map((entry, index) => (
                            <div key={`item-${index}`} className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-xs text-muted-foreground">{entry.value}</span>
                            </div>
                        ))}
                        </div>
                    )} />
                    {categories.map((cat, index) => (
                         <Bar key={cat} dataKey={cat} fill={`hsl(var(--chart-${index + 1}))`} radius={[4, 4, 0, 0]} />
                    ))}
                </BarChart>
            )
        }
        if (type === 'line' && dataKey) {
            return (
                <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <ChartTooltip
                        content={({ active, payload, label }) =>
                            active && payload && payload.length ? (
                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-[0.70rem] uppercase text-muted-foreground">Dată</span>
                                            <span className="font-bold text-muted-foreground">{label}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[0.70rem] uppercase text-muted-foreground">Lead-uri</span>
                                            <span className="font-bold text-foreground">{payload[0].value}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : null
                        }
                    />
                    <Line type="monotone" dataKey={dataKey} stroke="hsl(var(--primary))" strokeWidth={2} dot={true} />
                </LineChart>
            )
        }
        return null;
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                 <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    {renderChart()}
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

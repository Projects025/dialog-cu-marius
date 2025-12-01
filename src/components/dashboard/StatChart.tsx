
"use client"

import * as React from "react"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

interface StatChartProps {
    title: string;
    description: string;
    type: 'bar' | 'line';
    data: any[];
    dataKey: string;
    categories?: string[];
}

const chartConfig = {
    value: {
      label: "Valoare",
      color: "hsl(var(--chart-1))",
    },
    count: {
        label: "Număr",
        color: "hsl(var(--primary))",
    }
} satisfies ChartConfig;


export default function StatChart({ title, description, type, data, dataKey, categories }: StatChartProps) {
    
    const renderChart = () => {
        if (type === 'bar') {
            return (
                <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <ChartTooltip
                        cursor={{ fill: 'hsla(var(--muted))' }}
                        content={<ChartTooltipContent hideLabel />} 
                    />
                    <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} />
                </BarChart>
            )
        }
        if (type === 'line') {
            return (
                <LineChart data={data} margin={{ top: 5, right: 10, left: 12, bottom: 0 }}>
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
        <Card>
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

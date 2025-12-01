
"use client"

import * as React from "react"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartTooltipContent } from "@/components/ui/chart"

interface StatChartProps {
    title: string;
    description: string;
    type: 'bar' | 'line';
    data: any[];
    dataKey: string;
    categories?: string[];
}

export default function StatChart({ title, description, type, data, dataKey, categories }: StatChartProps) {
    
    const renderChart = () => {
        if (type === 'bar') {
            return (
                <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: -10 }}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                        cursor={{ fill: 'hsla(var(--muted))' }}
                        content={<ChartTooltipContent hideLabel />} 
                    />
                    <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} />
                </BarChart>
            )
        }
        if (type === 'line') {
            return (
                <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: -10 }}>
                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
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
                    <Line type="monotone" dataKey={dataKey} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
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
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       {renderChart()}
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}

"use client";

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export default function StudyCalendar() {
    const [date, setDate] = useState<Date | undefined>(new Date());

    return (
        <Card className="border-border/40">
            <CardHeader>
                <CardTitle className="text-lg">Study Schedule</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md border"
                />
            </CardContent>
        </Card>
    );
}

import { Key } from "react";

type PanCycle = {
    protein_name: string;
    protein_pan: string;
    duration: number;
    start_timestamp: Date;
    stop_timestamp: Date;
    is_long_cycle_error: boolean;
    is_short_cycle_error: boolean;
    is_missed_checkout_error: boolean;
    tzi_target_zone: TargetZone;
    breader_id: string;
}

type Pan = {
    protein_name: string;
    protein_pan: string;
    expire_date: Date;
    pan_location: PanLocation;
}

type PanDrawable = {
    pan: Pan;
    start_x: number;
    x: number;
    y: number;
    next_x: number;
    next_y: number;
}

enum PanLocation {
    Unknown = 0,
    Queue = 1,
    Funnel = 2,
    Holding = 3,
}

enum TargetZone {
    TooLittle = 0,
    SlightlyTooLittle = 1,
    OnTarget = 2,
    SlightlyTooMuch = 3,
    TooMuch = 4,
    Unknown = 5,
}

type PanEvent = {
    event_type: PanEventType;
    timestamp: Date;
    pan_cycle: PanCycle;
}

enum PanEventType {
    Cook = "cook",
    Fill = "fill",
    Start = "start",
    Stop = "stop"
}

type ReplayData = {
    location_id: string;
    date: Date;
    pan_cycles: PanCycle[];
}

type Keyframe = {
    events: PanEvent[];
}

type PreProcessedEventData = {
    keyframes: Keyframe[];
    keyframe_count: number;
} 

export function getTargetZoneString(targetZone: TargetZone): string {
    switch (targetZone) {
        case TargetZone.TooLittle:
            return "Too Little";
        case TargetZone.SlightlyTooLittle:
            return "Slightly Too Little";
        case TargetZone.OnTarget:
            return "On Target";
        case TargetZone.SlightlyTooMuch:
            return "Slightly Too Much";
        case TargetZone.TooMuch:
            return "Too Much";
        default:
            return "";
    }
}

export function getScanOutDescription(targetZone: TargetZone): string {
    switch (targetZone) {
        case TargetZone.TooLittle:
            return "Early";
        case TargetZone.SlightlyTooLittle:
            return "Slightly Early";
        case TargetZone.OnTarget:
            return "On Time";
        case TargetZone.SlightlyTooMuch:
            return "Slightly Late";
        case TargetZone.TooMuch:
            return "Late";
        default:
            return "";
    }
}

export function getCookTimeForProtein(pan: PanCycle | Pan): number {
    switch(pan.protein_name) {
        case "filets" : return 280;
        case "spicy" : return 280;
        case "nuggets" : return 180;
        case "spicy strips" : return 200;
        default : return 0;
    }
}

export type { PanCycle, ReplayData, PanEvent, Pan, PreProcessedEventData, Keyframe, PanDrawable };
export { TargetZone, PanEventType, PanLocation };
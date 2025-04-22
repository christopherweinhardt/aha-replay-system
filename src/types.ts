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

export function getPanName(input: PanCycle | Pan | undefined, truncate = true): string {
    if (!input) return "Unknown"; // Handle undefined input

    const nameParts = input.protein_pan.split(" ");
    const panNumber = nameParts[nameParts.length - 1]; // Get the last part (pan number)
    const proteinName = input.protein_name.toUpperCase();
    // Truncate protein name "SPICY STRIPS" to "SPICY ST..."
    let truncatedName;

    if(truncate) {
        truncatedName = proteinName.length > 10 ? proteinName.substring(0, 8) + "..." : proteinName;
    } else {
        truncatedName = proteinName;
    }

    return `${truncatedName} ${panNumber}`; // Combine them
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

type Notification = {
    message: string;
    duration: number; // Duration in frames
    data: PanEvent;
};


type Machine = {
    cooking: boolean;
    cooking_protein: Pan | undefined;
    open_mode: boolean;
    cooking_finish_time?: Date;
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

export function getTimeUntilPanExpires(pan: Pan, simulationTime: Date) {
    const timeUntilExpire = pan.expire_date.getTime() - simulationTime.getTime();
    const totalSeconds = Math.floor(timeUntilExpire / 1000);
    const clampedSeconds = Math.min(totalSeconds, 20 * 60); // Clamp at 20 minutes (1200 seconds)
    const minutes = Math.floor(clampedSeconds / 60);
    const seconds = Math.abs(clampedSeconds % 60); // Allow negative time
    const result = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return result;
}

export function getTimeUntilMachineDone(machine: Machine, simulationTime: Date) {
    if(!machine.cooking_protein) return "Unknown";
    if(!machine.cooking_finish_time) return "Unknown";

    // get finish 
    const timeUntilFill = machine.cooking_finish_time?.getTime() - simulationTime.getTime();

    const totalSeconds = Math.floor(timeUntilFill / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.abs(totalSeconds % 60);
    const result = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return result;
}

export type { PanCycle, ReplayData, PanEvent, Pan, Notification, Machine, PreProcessedEventData, Keyframe, PanDrawable };
export { TargetZone, PanEventType, PanLocation };
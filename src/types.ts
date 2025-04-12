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

enum TargetZone {
    TooLittle = 0,
    SlightlyTooLittle = 1,
    OnTarget = 2,
    SlightlyTooMuch = 3,
    TooMuch = 4,
    Unknown = 5,
}

type ReplayData = {
    location_id: string;
    date: Date;
    pan_cycles: PanCycle[];
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

export type { PanCycle, ReplayData };
export { TargetZone }
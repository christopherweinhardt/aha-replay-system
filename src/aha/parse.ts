import { PanCycle, ReplayData, TargetZone } from "../types";

function parse_aha_csv(csv: string): ReplayData | null{
    const lines = csv.split("\n");
    const headers = lines[0].split(",");
    const data: { [key: string]: string }[] = [];
    const seen = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
        const obj: { [key: string]: string } = {};
        const currentline = lines[i].replace(/,\s*$/, "").split(",");

        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentline[j];
        }

        const serialized = JSON.stringify(obj);
        if (!seen.has(serialized)) {
            seen.add(serialized);
            data.push(obj);
        }
    }

    const pan_cycles: PanCycle[] = [];
    let location_id: string | null = null;
    let date: Date | null = null;

    // Check if has at least one row and grab data
    if(data.length > 0) {
        location_id = data[0]["location_id"];
        date = new Date(data[0]["start_timestamp"]);
    } else {
        console.error("No data found in CSV");
        return null;
    }

    // for each object in data
    for (const obj of data) {
        // convert the date string to a Date object

        const pan_cycle: PanCycle = {
            protein_name: obj["protein_name"],
            protein_pan: obj["protein_pan"],
            duration: parseInt(obj["duration"]),
            start_timestamp: new Date(obj["start_timestamp"]),
            stop_timestamp: new Date(obj["stop_timestamp"]),
            is_long_cycle_error: obj["is_long_cycle_error"] === "true",
            is_short_cycle_error: obj["is_short_cycle_error"] === "true",
            is_missed_checkout_error: obj["is_missed_checkout_error"] === "true",
            tzi_target_zone: parseInt(obj["tzi_target_zone"]) as TargetZone,
            breader_id: obj["breader_id"],
        };
        
        pan_cycles.push(pan_cycle);
    }

    // sort pan cycles by start_timestamp
    pan_cycles.sort((a, b) => a.start_timestamp.getTime() - b.start_timestamp.getTime());

    return {
        location_id: location_id || "",
        date: date || new Date(),
        pan_cycles: pan_cycles,
    };
}
export default parse_aha_csv;
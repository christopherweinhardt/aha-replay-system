    //interpolate positions
    export function interpolatePositions(start: number, end: number, fraction: number): number {
        return start + (end - start) * easeInOutCubic(fraction);
    }

    function easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
import Toybox.Lang;
import Toybox.Math;

// Shared signal-processing utilities used by both RunningMetrics and SwimmingMetrics.
class MetricsCalculator {

    // Minimum sample count needed for a 2-second analysis window at 25 Hz.
    static const MIN_SAMPLES = 50;

    // ---------------------------------------------------------------
    // Cadence / stroke rate — peak detection on a single axis
    //
    // buffer  : Array of SensorEntry (getAll() result)
    // axisIdx : 0=X, 1=Y, 2=Z
    // returns : cadence in spm (steps/strokes per minute), or null
    // ---------------------------------------------------------------
    static function calculateCadence(buffer as Array, axisIdx as Number) as Float or Null {
        if (buffer.size() < MIN_SAMPLES) { return null; }

        // Extract axis values
        var values = [];
        for (var i = 0; i < buffer.size(); i++) {
            values.add((buffer[i] as SensorEntry).values[axisIdx].toFloat());
        }

        // Simple mean threshold peak detection
        var mean = _mean(values);
        var peakCount = 0;
        var inPeak = false;

        for (var i = 1; i < values.size() - 1; i++) {
            var current = values[i] as Float;
            var previous = values[i - 1] as Float;
            var next = values[i + 1] as Float;

            if (!inPeak && current > mean && current > previous && current > next) {
                peakCount++;
                inPeak = true;
            } else if (current < mean) {
                inPeak = false;
            }
        }

        // Time span of the buffer in seconds
        var first = (buffer[0] as SensorEntry).timestamp;
        var last  = (buffer[buffer.size() - 1] as SensorEntry).timestamp;
        var spanSec = (last - first) / 1000.0;
        if (spanSec <= 0.0) { return null; }

        return (peakCount / spanSec) * 60.0;  // cycles/min
    }

    // ---------------------------------------------------------------
    // Stroke rate using composite vector magnitude (for swimming)
    //
    // returns : stroke rate in spm, or null
    // ---------------------------------------------------------------
    static function calculateStrokeRate(buffer as Array) as Float or Null {
        if (buffer.size() < MIN_SAMPLES) { return null; }

        var magnitudes = [];
        for (var i = 0; i < buffer.size(); i++) {
            var v = (buffer[i] as SensorEntry).values;
            var x = v[0].toFloat();
            var y = v[1].toFloat();
            var z = v[2].toFloat();
            magnitudes.add(Math.sqrt(x*x + y*y + z*z));
        }

        var mean = _mean(magnitudes);
        var peakCount = 0;
        var inPeak = false;

        for (var i = 1; i < magnitudes.size() - 1; i++) {
            var current = magnitudes[i] as Float;
            var previous = magnitudes[i - 1] as Float;
            var next = magnitudes[i + 1] as Float;

            if (!inPeak && current > mean && current > previous && current > next) {
                peakCount++;
                inPeak = true;
            } else if (current < mean) {
                inPeak = false;
            }
        }

        var first = (buffer[0] as SensorEntry).timestamp;
        var last  = (buffer[buffer.size() - 1] as SensorEntry).timestamp;
        var spanSec = (last - first) / 1000.0;
        if (spanSec <= 0.0) { return null; }

        return (peakCount / spanSec) * 60.0;
    }

    // ---------------------------------------------------------------
    // Stride length  (m/step)
    // gpsSpeed : m/s from Activity.Info.currentSpeed, or null
    // cadence  : spm
    // heightCm : fallback for no-GPS mode
    // ---------------------------------------------------------------
    static function calculateStrideLength(
        gpsSpeed as Float or Null,
        cadence as Float or Null,
        heightCm as Number
    ) as Float or Null {
        if (cadence == null || cadence <= 0.0) { return null; }

        if (gpsSpeed == null) {
            if (heightCm > 0) {
                return heightCm.toFloat() * 0.0045;
            }
            return null;
        }

        // stride = speed / (cadence / 60)
        return gpsSpeed / (cadence / 60.0);
    }

    // ---------------------------------------------------------------
    // Stroke efficiency (%): stroke distance normalized by arm span
    // ---------------------------------------------------------------
    static function calculateStrokeEfficiency(
        strokeDistanceM as Float or Null,
        armSpanCm as Number
    ) as Float or Null {
        if (strokeDistanceM == null || armSpanCm <= 0) {
            return null;
        }

        return ((strokeDistanceM as Float) / (armSpanCm.toFloat() / 100.0)) * 100.0;
    }

    // ---------------------------------------------------------------
    // Heart-rate zone based on current HR / max HR
    // ---------------------------------------------------------------
    static function calculateHrZone(
        currentHr as Number or Null,
        maxHr as Number or Null
    ) as Number or Null {
        if (currentHr == null || maxHr == null || (maxHr as Number) <= 0) {
            return null;
        }

        var ratio = (currentHr as Number).toFloat() / (maxHr as Number).toFloat();

        if (ratio < 0.60) { return 1; }
        if (ratio < 0.70) { return 2; }
        if (ratio < 0.80) { return 3; }
        if (ratio < 0.90) { return 4; }
        return 5;
    }

    // ---------------------------------------------------------------
    // Vertical oscillation — Z-axis peak-to-trough average (mm)
    // ---------------------------------------------------------------
    static function calculateVerticalOscillation(buffer as Array) as Float or Null {
        return _peakTroughAmplitude(buffer, 2);  // Z axis = index 2
    }

    // ---------------------------------------------------------------
    // Lateral oscillation — X-axis peak-to-trough average (mm)
    // ---------------------------------------------------------------
    static function calculateLateralOscillation(buffer as Array) as Float or Null {
        return _peakTroughAmplitude(buffer, 0);  // X axis = index 0
    }

    // ---------------------------------------------------------------
    // Stroke distance
    //   totalDistance : metres (GPS or pool calculation)
    //   strokeCount   : number of strokes detected so far
    //   poolLength    : metres (used if gpsAvailable == false)
    //   lapCount      : pool laps completed (used if gpsAvailable == false)
    //   gpsAvailable  : if true, use totalDistance directly
    // ---------------------------------------------------------------
    static function calculateStrokeDistance(
        totalDistance  as Float or Null,
        strokeCount    as Number,
        poolLength     as Number,
        lapCount       as Number,
        gpsAvailable   as Boolean
    ) as Float or Null {
        if (strokeCount <= 0) { return null; }

        var dist;
        if (gpsAvailable && totalDistance != null) {
            dist = totalDistance;
        } else {
            dist = (poolLength * lapCount).toFloat();
        }

        if (dist == null || dist <= 0.0) { return null; }
        return dist / strokeCount.toFloat();
    }

    // ---------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------

    // Average peak-to-trough amplitude for axisIdx over the buffer.
    // Returns value in same unit as sensor (mg → treated as mm proxy here).
    private static function _peakTroughAmplitude(buffer as Array, axisIdx as Number) as Float or Null {
        if (buffer.size() < MIN_SAMPLES) { return null; }

        var values = [];
        for (var i = 0; i < buffer.size(); i++) {
            values.add((buffer[i] as SensorEntry).values[axisIdx].toFloat());
        }

        var mean = _mean(values);
        var sumAmplitude = 0.0;
        var cycleCount = 0;
        var lastPeak = null;
        var inPeak = false;

        for (var i = 1; i < values.size() - 1; i++) {
            var current = values[i] as Float;
            var previous = values[i - 1] as Float;
            var next = values[i + 1] as Float;

            if (!inPeak && current > mean && current > previous && current > next) {
                lastPeak = current;
                inPeak = true;
            } else if (inPeak && current < mean && current < previous && current < next) {
                if (lastPeak != null) {
                    var delta = (lastPeak as Float) - current;
                    if (delta < 0) {
                        delta = -delta;
                    }
                    sumAmplitude += delta;
                    cycleCount++;
                }
                inPeak = false;
                lastPeak = null;
            } else if (current < mean) {
                inPeak = false;
            }
        }

        if (cycleCount == 0) { return null; }
        return sumAmplitude / cycleCount.toFloat();
    }

    private static function _mean(values as Array) as Float {
        var sum = 0.0;
        for (var i = 0; i < values.size(); i++) {
            sum += values[i].toFloat();
        }
        return sum / values.size().toFloat();
    }
}

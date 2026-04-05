import Toybox.Lang;

// Result container for swimming metrics.
class SwimmingMetricsResult {
    var strokeRate          as Float or Null;  // spm
    var strokeDistance      as Float or Null;  // m per stroke
    var verticalOscillation as Float or Null;  // mm (mg units from accel)
    var lateralOscillation  as Float or Null;  // mm (mg units from accel)

    function initialize() {
        strokeRate          = null;
        strokeDistance      = null;
        verticalOscillation = null;
        lateralOscillation  = null;
    }
}

// Calculates swimming-specific metrics.
// Stroke count is accumulated externally (e.g. from strokeRate × elapsed time).
class SwimmingMetrics {

    // totalDistance : metres (GPS) or null → pool-based fallback used
    // strokeCount   : total strokes since activity start
    // poolLength    : 25 or 50 m (from settings)
    // lapCount      : completed pool lengths
    // gpsAvailable  : true when outdoor GPS distance is valid
    static function calculate(
        accelBuffer    as RingBuffer,
        totalDistance  as Float or Null,
        strokeCount    as Number,
        poolLength     as Number,
        lapCount       as Number,
        gpsAvailable   as Boolean
    ) as SwimmingMetricsResult {
        var result = new SwimmingMetricsResult();
        var buffer = accelBuffer.getAll();

        result.strokeRate          = MetricsCalculator.calculateStrokeRate(buffer);
        result.strokeDistance      = MetricsCalculator.calculateStrokeDistance(
            totalDistance, strokeCount, poolLength, lapCount, gpsAvailable
        );
        result.verticalOscillation = MetricsCalculator.calculateVerticalOscillation(buffer);
        result.lateralOscillation  = MetricsCalculator.calculateLateralOscillation(buffer);

        return result;
    }
}

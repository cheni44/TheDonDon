import Toybox.Lang;

// Result container for running metrics.
class RunningMetricsResult {
    var cadence            as Float or Null;  // spm
    var strideLength       as Float or Null;  // m
    var verticalOscillation as Float or Null; // mm (mg units from accel)
    var lateralOscillation  as Float or Null; // mm (mg units from accel)

    function initialize() {
        cadence             = null;
        strideLength        = null;
        verticalOscillation = null;
        lateralOscillation  = null;
    }
}

// Calculates running-specific metrics from accel buffer + GPS speed.
class RunningMetrics {

    // gpsSpeed : Activity.Info.currentSpeed in m/s, or null when unavailable
    static function calculate(
        accelBuffer as RingBuffer,
        gpsSpeed    as Float or Null,
        heightCm    as Number
    ) as RunningMetricsResult {
        var result = new RunningMetricsResult();
        var buffer = accelBuffer.getAll();

        result.cadence             = MetricsCalculator.calculateCadence(buffer, 2); // Z axis
        result.strideLength        = MetricsCalculator.calculateStrideLength(gpsSpeed, result.cadence, heightCm);
        result.verticalOscillation = MetricsCalculator.calculateVerticalOscillation(buffer);
        result.lateralOscillation  = MetricsCalculator.calculateLateralOscillation(buffer);

        return result;
    }
}

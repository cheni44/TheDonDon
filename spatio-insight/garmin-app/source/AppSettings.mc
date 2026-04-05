import Toybox.Lang;
import Toybox.Application;

// AppSettings wraps Application.Properties reads with defaults and validation.
class AppSettings {

    static const ACTIVITY_RUNNING  = 0;
    static const ACTIVITY_SWIMMING = 1;

    static const MIN_SAMPLE_RATE     = 25;
    static const DEFAULT_SAMPLE_RATE = 25;
    static const DEFAULT_POOL_LENGTH = 25;

    // Returns 0 (Running) or 1 (Swimming).
    static function getActivityType() as Number {
        var val = Application.Properties.getValue("ActivityType");
        if (val == null) { return ACTIVITY_RUNNING; }
        return val as Number;
    }

    static function _normalizeSampleRate(val) as Number {
        if (val == null) { return DEFAULT_SAMPLE_RATE; }
        var rate = val as Number;
        if (rate < MIN_SAMPLE_RATE) { rate = MIN_SAMPLE_RATE; }
        if (rate <= 25)       { return 25; }
        else if (rate <= 50)  { return 50; }
        else                  { return 100; }
    }

    // Backward-compatible fallback.
    static function getSampleRate() as Number {
        return _normalizeSampleRate(Application.Properties.getValue("SampleRate"));
    }

    // Returns accelerometer sample rate in Hz (25, 50, or 100).
    static function getAccelSampleRate() as Number {
        var val = Application.Properties.getValue("AccelSampleRate");
        if (val == null) {
            return getSampleRate();
        }
        return _normalizeSampleRate(val);
    }

    // Returns gyroscope sample rate in Hz (25, 50, or 100).
    static function getGyroSampleRate() as Number {
        var val = Application.Properties.getValue("GyroSampleRate");
        if (val == null) {
            return getSampleRate();
        }
        return _normalizeSampleRate(val);
    }

    // Returns pool length in metres (25 or 50).
    static function getPoolLength() as Number {
        var val = Application.Properties.getValue("PoolLength");
        if (val == null) { return DEFAULT_POOL_LENGTH; }
        var len = val as Number;
        return (len == 50) ? 50 : 25;
    }
}

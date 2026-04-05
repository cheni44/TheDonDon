import Toybox.Lang;
import Toybox.Sensor;
import Toybox.System;
import Toybox.Time;

// SensorEntry holds one timestamped sample from a sensor.
// For accel/gyro: values is [x, y, z]; for HR: values is [bpm].
class SensorEntry {
    var timestamp as Number;  // milliseconds since epoch
    var values as Array;

    function initialize(ts as Number, vals as Array) {
        timestamp = ts;
        values = vals;
    }
}

// SensorManager initialises and drives Garmin sensor sampling.
// Each sensor type maintains its own RingBuffer (capacity 200).
class SensorManager {

    static const BUFFER_CAPACITY = 200;
    static const ACTIVITY_RUNNING  = 0;
    static const ACTIVITY_SWIMMING = 1;

    var accelBuffer  as RingBuffer;
    var gyroBuffer   as RingBuffer;
    var hrBuffer     as RingBuffer;
    var gyroAvailable  as Boolean;
    var accelAvailable as Boolean;
    var hrAvailable    as Boolean;

    private var _accelSampleRateHz as Number;
    private var _gyroSampleRateHz  as Number;

    function initialize(accelSampleRateHz as Number, gyroSampleRateHz as Number) {
        _accelSampleRateHz = accelSampleRateHz;
        _gyroSampleRateHz = gyroSampleRateHz;
        accelBuffer  = new RingBuffer(BUFFER_CAPACITY);
        gyroBuffer   = new RingBuffer(BUFFER_CAPACITY);
        hrBuffer     = new RingBuffer(BUFFER_CAPACITY);
        gyroAvailable  = false;
        accelAvailable = false;
        hrAvailable    = false;

        _detectAndEnable();
    }

    // Stop all sensors and release resources.
    function stop() as Void {
        Sensor.setEnabledSensors([]);
        Sensor.unregisterSensorDataListener();
    }

    // ---------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------

    private function _detectAndEnable() as Void {
        // Probe available sensors by attempting to read info
        var sensorInfo = Sensor.getInfo();
        accelAvailable = (sensorInfo has :accel) && (sensorInfo.accel != null);
        gyroAvailable  = (sensorInfo has :gyroscope) && (sensorInfo.gyroscope != null);
        hrAvailable    = (sensorInfo has :heartRate) && (sensorInfo.heartRate != null);

        // Configure sample rate and register listener
        var options = {
            :period      => 1,                        // callback every sample period
            :accelerometer => {
                :enabled    => accelAvailable,
                :sampleRate => _accelSampleRateHz
            },
            :gyroscope   => {
                :enabled    => gyroAvailable,
                :sampleRate => _gyroSampleRateHz
            }
        };

        Sensor.registerSensorDataListener(method(:onSensorData), options);
    }

    // Sensor data callback — called at configured sample rate.
    function onSensorData(sensorData as Sensor.SensorData) as Void {
        var now = System.getTimer();  // ms since device boot (monotonic)

        // Accelerometer
        if (accelAvailable && sensorData has :accel && sensorData.accel != null) {
            var a = sensorData.accel;
            if (a.x != null && a.y != null && a.z != null) {
                accelBuffer.push(new SensorEntry(now, [a.x, a.y, a.z]));
            }
        }

        // Gyroscope
        if (gyroAvailable && sensorData has :gyroscope && sensorData.gyroscope != null) {
            var g = sensorData.gyroscope;
            if (g.x != null && g.y != null && g.z != null) {
                gyroBuffer.push(new SensorEntry(now, [g.x, g.y, g.z]));
            }
        }

        // Heart rate (available via Activity.Info, polled in onUpdate; but
        // also provided here if the SensorData includes it for higher fidelity)
        if (sensorData has :heartRate && sensorData.heartRate != null) {
            hrAvailable = true;
            hrBuffer.push(new SensorEntry(now, [sensorData.heartRate]));
        }
    }
}

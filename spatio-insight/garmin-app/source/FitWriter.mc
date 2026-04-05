import Toybox.Lang;
import Toybox.FitContributor;
import Toybox.ActivityRecording;

// FitWriter registers FIT developer data fields and writes sensor data
// from RingBuffers into the activity FIT file.
//
// Field layout (GoldenCheetah-compatible developer data fields):
//   accel_x, accel_y, accel_z  — units: mg    (Float32)
//   gyro_x,  gyro_y,  gyro_z   — units: deg/s  (Float32)
//
// Each record message corresponds to one SensorEntry timestamp.
// Gyro fields are only registered/written when gyroAvailable == true.
class FitWriter {
    private var _accelX as FitContributor.Field or Null;
    private var _accelY as FitContributor.Field or Null;
    private var _accelZ as FitContributor.Field or Null;
    private var _gyroX  as FitContributor.Field or Null;
    private var _gyroY  as FitContributor.Field or Null;
    private var _gyroZ  as FitContributor.Field or Null;

    private var _gyroAvailable as Boolean;
    private var _session as ActivityRecording.Session or Null;

    function initialize(session as ActivityRecording.Session or Null, gyroAvailable as Boolean) {
        _session = session;
        _gyroAvailable = gyroAvailable;
        _registerFields();
    }

    // Write all accel (and optionally gyro) samples from the sensor manager.
    // Called once when the activity stops.
    function writeSensorData(sensorManager as SensorManager) as Void {
        var accelEntry = sensorManager.accelBuffer.getLast() as SensorEntry or Null;
        if (accelEntry != null) {
            if (_accelX != null) { _accelX.setData(accelEntry.values[0].toFloat()); }
            if (_accelY != null) { _accelY.setData(accelEntry.values[1].toFloat()); }
            if (_accelZ != null) { _accelZ.setData(accelEntry.values[2].toFloat()); }
        }

        var gyroEntry = sensorManager.gyroBuffer.getLast() as SensorEntry or Null;
        if (_gyroAvailable && gyroEntry != null) {
            if (_gyroX != null) { _gyroX.setData(gyroEntry.values[0].toFloat()); }
            if (_gyroY != null) { _gyroY.setData(gyroEntry.values[1].toFloat()); }
            if (_gyroZ != null) { _gyroZ.setData(gyroEntry.values[2].toFloat()); }
        }
    }

    // ---------------------------------------------------------------
    // Private
    // ---------------------------------------------------------------

    private function _registerFields() as Void {
        if (_session == null || !(_session has :createField)) {
            return;
        }

        // Accelerometer fields
        _accelX = _session.createField(
            "accel_x",
            0,
            FitContributor.DATA_TYPE_FLOAT,
            { :mesgType => FitContributor.MESG_TYPE_RECORD, :units => "mg" }
        );
        _accelY = _session.createField(
            "accel_y",
            1,
            FitContributor.DATA_TYPE_FLOAT,
            { :mesgType => FitContributor.MESG_TYPE_RECORD, :units => "mg" }
        );
        _accelZ = _session.createField(
            "accel_z",
            2,
            FitContributor.DATA_TYPE_FLOAT,
            { :mesgType => FitContributor.MESG_TYPE_RECORD, :units => "mg" }
        );

        // Gyroscope fields (only if sensor available)
        if (_gyroAvailable) {
            _gyroX = _session.createField(
                "gyro_x",
                3,
                FitContributor.DATA_TYPE_FLOAT,
                { :mesgType => FitContributor.MESG_TYPE_RECORD, :units => "deg/s" }
            );
            _gyroY = _session.createField(
                "gyro_y",
                4,
                FitContributor.DATA_TYPE_FLOAT,
                { :mesgType => FitContributor.MESG_TYPE_RECORD, :units => "deg/s" }
            );
            _gyroZ = _session.createField(
                "gyro_z",
                5,
                FitContributor.DATA_TYPE_FLOAT,
                { :mesgType => FitContributor.MESG_TYPE_RECORD, :units => "deg/s" }
            );
        }
    }
}

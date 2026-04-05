import Toybox.Lang;
import Toybox.WatchUi;
import Toybox.Graphics;
import Toybox.Activity;
import Toybox.System;

// Display mode constants
enum DisplayMode {
    MODE_RAW     = 0,
    MODE_METRICS = 1
}

// AppView handles all screen rendering.
// It holds a reference to the shared SensorManager so it can read
// the latest sensor data on every onUpdate call.
class AppView extends WatchUi.View {

    private var _sensorManager  as SensorManager;
    private var _userProfile    as UserProfile;
    private var _activityType   as Number;          // 0=Running, 1=Swimming
    private var _poolLength     as Number;
    private var _displayMode    as Number;
    private var _recordingStatus as String;
    private var _elapsedSec      as Number;
    private var _showPauseMenu   as Boolean;
    private var _pauseMenuIndex  as Number;

    // Accumulated swim state (updated by onUpdate from Activity.Info)
    private var _strokeCount as Number;
    private var _lapCount    as Number;

    function initialize(
        sensorManager as SensorManager,
        userProfile   as UserProfile,
        activityType  as Number,
        poolLength    as Number
    ) {
        View.initialize();
        _sensorManager = sensorManager;
        _userProfile   = userProfile;
        _activityType  = activityType;
        _poolLength    = poolLength;
        _displayMode   = MODE_RAW;
        _strokeCount   = 0;
        _lapCount      = 0;
        _recordingStatus = "READY";
        _elapsedSec      = 0;
        _showPauseMenu   = false;
        _pauseMenuIndex  = 0;
    }

    function setRecordingUi(status as String, elapsedSec as Number, showPauseMenu as Boolean, pauseMenuIndex as Number) as Void {
        _recordingStatus = status;
        _elapsedSec = elapsedSec;
        _showPauseMenu = showPauseMenu;
        _pauseMenuIndex = pauseMenuIndex;
    }

    // Called by AppDelegate when user presses UP/DOWN.
    function toggleMode() as Void {
        if (_displayMode == MODE_RAW) {
            _displayMode = MODE_METRICS;
        } else {
            _displayMode = MODE_RAW;
        }
        WatchUi.requestUpdate();
    }

    function getDisplayMode() as Number {
        return _displayMode;
    }

    // onUpdate is called at least once per second (timer-driven from SpatioInsightApp).
    function onUpdate(dc as Graphics.Dc) as Void {
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);

        if (_showPauseMenu) {
            _drawPauseMenu(dc);
            return;
        }

        if (_displayMode == MODE_RAW) {
            _drawRaw(dc);
        } else {
            _drawMetrics(dc);
        }
    }

    // ---------------------------------------------------------------
    // RAW mode
    // ---------------------------------------------------------------
    private function _drawRaw(dc as Graphics.Dc) as Void {
        var w  = dc.getWidth();
        var cx = w / 2;

        _drawHeader(dc, cx, 32, _getActivityLabel() + " RAW", Graphics.COLOR_YELLOW);
        _drawStatusLine(dc, cx, 80);

        var accelLast = _sensorManager.accelBuffer.getLast() as SensorEntry or Null;
        var ax = _formatAxisValue(accelLast, 0);
        var ay = _formatAxisValue(accelLast, 1);
        var az = _formatAxisValue(accelLast, 2);

        var rows = [];
        rows.add("AX " + ax);
        rows.add("AY " + ay);
        rows.add("AZ " + az);

        if (_sensorManager.gyroAvailable) {
            var gyroLast = _sensorManager.gyroBuffer.getLast() as SensorEntry or Null;
            var gx = _formatAxisValue(gyroLast, 0);
            var gy = _formatAxisValue(gyroLast, 1);
            var gz = _formatAxisValue(gyroLast, 2);
            rows.add("GX " + gx);
            rows.add("GY " + gy);
            rows.add("GZ " + gz);
        } else {
            rows.add("GYRO N/A");
        }

        var hrLast = _sensorManager.hrBuffer.getLast() as SensorEntry or Null;
        var hr = hrLast != null ? hrLast.values[0].toString() + " bpm" : "--- bpm";
        rows.add("HR " + hr);

        _drawRows(dc, rows, 128);
    }

    // ---------------------------------------------------------------
    // METRICS mode
    // ---------------------------------------------------------------
    private function _drawMetrics(dc as Graphics.Dc) as Void {
        var w  = dc.getWidth();
        var cx = w / 2;
        _drawHeader(dc, cx, 32, _getActivityLabel() + " METRICS", Graphics.COLOR_GREEN);
        _drawStatusLine(dc, cx, 80);

        if (_activityType == SensorManager.ACTIVITY_RUNNING) {
            _drawRunningMetrics(dc, 128);
        } else {
            _drawSwimmingMetrics(dc, 128);
        }
    }

    private function _drawRunningMetrics(dc as Graphics.Dc, startY as Number) as Void {
        var actInfo  = Activity.getActivityInfo();
        var gpsSpeed = (actInfo != null && actInfo.currentSpeed != null)
                       ? actInfo.currentSpeed.toFloat()
                       : null;
        var heightCm = _userProfile.getHeight();

        var r = RunningMetrics.calculate(_sensorManager.accelBuffer, gpsSpeed, heightCm);

        var rows = [];
        rows.add("CAD " + _formatMetric(r.cadence, "spm", 1));
        rows.add("STR " + _formatMetric(r.strideLength, "m", 2));
        rows.add("VRT " + _formatMetric(r.verticalOscillation, "mm", 0));
        rows.add("LAT " + _formatMetric(r.lateralOscillation, "mm", 0));
        _drawRows(dc, rows, startY);
    }

    private function _drawSwimmingMetrics(dc as Graphics.Dc, startY as Number) as Void {
        var actInfo = Activity.getActivityInfo();
        var totalDist = (actInfo != null && actInfo.elapsedDistance != null)
                        ? actInfo.elapsedDistance.toFloat()
                        : null;
        var gpsAvail  = (actInfo != null && actInfo.currentSpeed != null);
        var elapsedSeconds = _getElapsedSeconds(actInfo);

        var strokeRateEstimate = MetricsCalculator.calculateStrokeRate(_sensorManager.accelBuffer.getAll());
        _strokeCount = _estimateStrokeCount(strokeRateEstimate, elapsedSeconds);

        if (_poolLength > 0 && totalDist != null) {
            _lapCount = (totalDist / _poolLength.toFloat()).toNumber();
        }

        var swimResult = SwimmingMetrics.calculate(
            _sensorManager.accelBuffer,
            totalDist,
            _strokeCount,
            _poolLength,
            _lapCount,
            gpsAvail
        );

        var rows = [];
        rows.add("STRK " + _formatMetric(swimResult.strokeRate, "spm", 1));
        rows.add("DIST " + _formatMetric(swimResult.strokeDistance, "m", 2));
        rows.add("VRT " + _formatMetric(swimResult.verticalOscillation, "mm", 0));
        rows.add("LAT " + _formatMetric(swimResult.lateralOscillation, "mm", 0));
        _drawRows(dc, rows, startY);
    }

    private function _drawHeader(dc as Graphics.Dc, cx as Number, y as Number, text as String, color as Number) as Void {
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, y, Graphics.FONT_XTINY, text, Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
    }

    private function _drawStatusLine(dc as Graphics.Dc, cx as Number, y as Number) as Void {
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, y, Graphics.FONT_XTINY, _recordingStatus + " " + _formatElapsed(), Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
    }

    private function _drawRows(dc as Graphics.Dc, rows as Array, startY as Number) as Void {
        var cx = dc.getWidth() / 2;
        var count = rows.size();
        if (count <= 0) {
            return;
        }

        var step = 48.0;

        for (var i = 0; i < count; i++) {
            var y = startY + (step * i);
            dc.drawText(cx, y, Graphics.FONT_XTINY, rows[i] as String, Graphics.TEXT_JUSTIFY_CENTER);
        }
    }

    private function _drawPauseMenu(dc as Graphics.Dc) as Void {
        var cx = dc.getWidth() / 2;
        _drawHeader(dc, cx, 32, "PAUSED", Graphics.COLOR_YELLOW);
        _drawStatusLine(dc, cx, 80);

        var options = ["RESUME", "SAVE", "DISCARD"];
        var startY = 128;
        var step = 48;

        for (var i = 0; i < options.size(); i++) {
            var y = startY + (step * i);
            if (i == _pauseMenuIndex) {
                dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
                dc.drawText(cx, y, Graphics.FONT_XTINY, "> " + options[i], Graphics.TEXT_JUSTIFY_CENTER);
                dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            } else {
                dc.drawText(cx, y, Graphics.FONT_XTINY, options[i], Graphics.TEXT_JUSTIFY_CENTER);
            }
        }
    }

    private function _formatAxisValue(entry as SensorEntry or Null, index as Number) as String {
        if (entry == null) {
            return "---";
        }

        var raw = entry.values[index];
        if (raw == null) {
            return "---";
        }

        return (raw as Number).toFloat().format("%.1f");
    }

    private function _formatMetric(value as Float or Null, unit as String, decimals as Number) as String {
        if (value == null) {
            return "---";
        }
        return (value as Float).format("%." + decimals.toString() + "f") + " " + unit;
    }

    private function _formatElapsed() as String {
        var total = _elapsedSec;
        if (total < 0) {
            total = 0;
        }

        var minutes = (total / 60).toNumber();
        var seconds = (total % 60).toNumber();
        return minutes.format("%02d") + ":" + seconds.format("%02d");
    }

    private function _getActivityLabel() as String {
        if (_activityType == SensorManager.ACTIVITY_RUNNING) {
            return "RUN";
        }
        return "SWIM";
    }

    private function _getElapsedSeconds(actInfo) as Float or Null {
        if (actInfo == null) {
            return null;
        }

        if (actInfo has :elapsedTime && actInfo.elapsedTime != null) {
            return actInfo.elapsedTime.toFloat();
        }

        if (actInfo has :timerTime && actInfo.timerTime != null) {
            return actInfo.timerTime.toFloat();
        }

        return null;
    }

    private function _estimateStrokeCount(strokeRate as Float or Null, elapsedSeconds as Float or Null) as Number {
        if (strokeRate == null || elapsedSeconds == null || elapsedSeconds <= 0.0) {
            return 0;
        }

        var estimate = (strokeRate * elapsedSeconds) / 60.0;
        if (estimate <= 0.0) {
            return 0;
        }

        return estimate.toNumber();
    }
}

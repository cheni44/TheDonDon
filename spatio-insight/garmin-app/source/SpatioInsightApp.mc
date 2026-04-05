import Toybox.Lang;
import Toybox.Application;
import Toybox.WatchUi;
import Toybox.Timer;
import Toybox.Activity;
import Toybox.ActivityRecording;
import Toybox.System;

// Main application entry point.
class SpatioInsightApp extends Application.AppBase {

    private var _sensorManager as SensorManager or Null;
    private var _fitWriter     as FitWriter or Null;
    private var _view          as AppView or Null;
    private var _delegate      as AppDelegate or Null;
    private var _timer         as Timer.Timer or Null;
    private var _session       as ActivityRecording.Session or Null;
    private var _userProfile   as UserProfile or Null;
    private var _isRecording   as Boolean;
    private var _hasStarted    as Boolean;
    private var _isFinalized   as Boolean;
    private var _elapsedMs     as Number;
    private var _lastTickMs    as Number;
    private var _statusText    as String;
    private var _showPauseMenu as Boolean;
    private var _pauseMenuIndex as Number;

    function initialize() {
        AppBase.initialize();
        _isRecording = false;
        _hasStarted  = false;
        _isFinalized = false;
        _elapsedMs   = 0;
        _lastTickMs  = 0;
        _statusText  = "READY";
        _showPauseMenu = false;
        _pauseMenuIndex = 0;
    }

    // Called when the app starts.
    function onStart(state as Dictionary?) as Void {
        _initializeRuntime();

        // 1-second refresh timer
        if (_timer == null) {
            _timer = new Timer.Timer();
            _timer.start(method(:onTimer), 1000, true);
        }

        _syncViewState();
    }

    private function _initializeRuntime() as Void {
        if (_view != null && _delegate != null) {
            return;
        }

        var activityType = AppSettings.getActivityType();
        var accelRate    = AppSettings.getAccelSampleRate();
        var gyroRate     = AppSettings.getGyroSampleRate();
        var poolLength   = AppSettings.getPoolLength();
        _userProfile = new UserProfile();

        // Initialise sensor manager — starts listening immediately
        _sensorManager = new SensorManager(accelRate, gyroRate);

        // Start activity recording session
        _session = ActivityRecording.createSession({
            :name    => "SpatioInsight",
            :sport   => activityType == AppSettings.ACTIVITY_SWIMMING
                        ? ActivityRecording.SPORT_SWIMMING
                        : ActivityRecording.SPORT_RUNNING,
            :subSport => ActivityRecording.SUB_SPORT_GENERIC
        });

        // Initialise FIT writer after the session exists so fields can be created.
        _fitWriter = new FitWriter(_session, _sensorManager.gyroAvailable);

        // Create view and delegate
        _view = new AppView(_sensorManager, _userProfile, activityType, poolLength);
        _delegate = new AppDelegate(_view);
        _syncViewState();
    }

    // Called when the app stops (back button or device shutdown).
    function onStop(state as Dictionary?) as Void {
        if (!_isFinalized) {
            if (_hasStarted) {
                _finalizeRecording(true);
            } else {
                _finalizeRecording(false);
            }
        }

        // Stop refresh timer
        if (_timer != null) {
            _timer.stop();
            _timer = null;
        }

        // Stop sensors
        if (_sensorManager != null) {
            _sensorManager.stop();
        }
    }

    // Timer callback — triggers screen redraw every second.
    function onTimer() as Void {
        if (_isRecording) {
            _updateElapsed();
        }

        _syncViewState();
        WatchUi.requestUpdate();
    }

    function toggleRecording() as Void {
        if (_isFinalized) {
            return;
        }

        if (_showPauseMenu) {
            _selectPauseMenu();
            return;
        }

        if (!_hasStarted) {
            _startRecording();
            return;
        }

        if (_isRecording) {
            _pauseRecording();
            _showPauseMenu = true;
            _pauseMenuIndex = 0;
            _syncViewState();
        } else {
            _resumeRecording();
        }
    }

    function pauseMenuUp() as Void {
        if (!_showPauseMenu) {
            return;
        }

        if (_pauseMenuIndex <= 0) {
            _pauseMenuIndex = 2;
        } else {
            _pauseMenuIndex -= 1;
        }
        _syncViewState();
    }

    function pauseMenuDown() as Void {
        if (!_showPauseMenu) {
            return;
        }

        if (_pauseMenuIndex >= 2) {
            _pauseMenuIndex = 0;
        } else {
            _pauseMenuIndex += 1;
        }
        _syncViewState();
    }

    function closePauseMenu() as Void {
        if (!_showPauseMenu) {
            return;
        }

        _showPauseMenu = false;
        _syncViewState();
    }

    function saveRecording() as Void {
        if (_isFinalized || !_hasStarted) {
            return;
        }
        _finalizeRecording(true);
    }

    function discardRecording() as Void {
        if (_isFinalized) {
            return;
        }
        _finalizeRecording(false);
    }

    function isPauseMenuVisible() as Boolean {
        return _showPauseMenu;
    }

    private function _startRecording() as Void {
        if (_session != null) {
            _session.start();
        }

        _hasStarted = true;
        _isRecording = true;
        _statusText = "REC";
        _lastTickMs = System.getTimer();
        _syncViewState();
    }

    private function _pauseRecording() as Void {
        if (!_isRecording) {
            return;
        }

        _updateElapsed();
        _isRecording = false;
        _statusText = "PAUSE";
        _syncViewState();
    }

    private function _resumeRecording() as Void {
        if (_isRecording || _isFinalized || !_hasStarted) {
            return;
        }

        _isRecording = true;
        _statusText = "REC";
        _showPauseMenu = false;
        _lastTickMs = System.getTimer();
        _syncViewState();
    }

    private function _finalizeRecording(saveData as Boolean) as Void {
        if (_isFinalized) {
            return;
        }

        if (_isRecording) {
            _updateElapsed();
        }

        _isRecording = false;
        _showPauseMenu = false;

        if (_session != null) {
            _session.stop();

            if (saveData && _hasStarted) {
                if (_fitWriter != null && _sensorManager != null) {
                    _fitWriter.writeSensorData(_sensorManager);
                }
                _session.save();
                _statusText = "SAVED";
            } else {
                _statusText = "DISCARD";
            }

            _session = null;
        }

        _isFinalized = true;
        _syncViewState();
    }

    private function _updateElapsed() as Void {
        var now = System.getTimer();
        if (_lastTickMs == 0) {
            _lastTickMs = now;
            return;
        }

        var delta = now - _lastTickMs;
        if (delta > 0) {
            _elapsedMs += delta;
        }
        _lastTickMs = now;
    }

    private function _syncViewState() as Void {
        if (_view == null) {
            return;
        }

        var elapsedSec = (_elapsedMs / 1000).toNumber();
        _view.setRecordingUi(_statusText, elapsedSec, _showPauseMenu, _pauseMenuIndex);
    }

    private function _selectPauseMenu() as Void {
        if (!_showPauseMenu) {
            return;
        }

        if (_pauseMenuIndex == 0) {
            _resumeRecording();
            return;
        }

        if (_pauseMenuIndex == 1) {
            saveRecording();
            return;
        }

        discardRecording();
    }

    function getInitialView() as [WatchUi.Views] or [WatchUi.Views, WatchUi.InputDelegates] {
        _initializeRuntime();
        return [_view, _delegate];
    }
}

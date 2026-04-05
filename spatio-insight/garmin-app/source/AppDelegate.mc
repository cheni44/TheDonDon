import Toybox.Lang;
import Toybox.Application;
import Toybox.WatchUi;

// AppDelegate handles button input and routes KEY_UP / KEY_DOWN
// to toggle the display mode on AppView.
class AppDelegate extends WatchUi.BehaviorDelegate {

    private var _view as AppView;

    function initialize(view as AppView) {
        BehaviorDelegate.initialize();
        _view = view;
    }

    // UP button → switch toward METRICS
    function onKey(keyEvent as WatchUi.KeyEvent) as Boolean {
        var key = keyEvent.getKey();
        var app = Application.getApp() as SpatioInsightApp;
        var inPauseMenu = app.isPauseMenuVisible();

        if (key == WatchUi.KEY_UP) {
            if (inPauseMenu) {
                app.pauseMenuUp();
            } else {
                _view.toggleMode();
            }
            return true;
        }

        if (key == WatchUi.KEY_DOWN) {
            if (inPauseMenu) {
                app.pauseMenuDown();
            } else {
                _view.toggleMode();
            }
            return true;  // consumed
        }

        if (key == WatchUi.KEY_ENTER) {
            app.toggleRecording();
            return true;
        }

        if (key == WatchUi.KEY_ESC) {
            app.closePauseMenu();
            return true;
        }

        return false;
    }

    // Tap (for touch-screen devices) also toggles
    function onTap(clickEvent as WatchUi.ClickEvent) as Boolean {
        var app = Application.getApp() as SpatioInsightApp;
        if (app.isPauseMenuVisible()) {
            return true;
        }
        _view.toggleMode();
        return true;
    }
}

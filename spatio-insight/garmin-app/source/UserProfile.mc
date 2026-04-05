import Toybox.Lang;
import Toybox.Application;

// UserProfile reads and validates user body metrics from settings.
class UserProfile {

    static const MIN_HEIGHT_CM = 100;
    static const MAX_HEIGHT_CM = 250;
    static const MIN_WEIGHT_KG = 20;
    static const MAX_WEIGHT_KG = 300;
    static const MIN_ARM_SPAN_CM = 100;
    static const MAX_ARM_SPAN_CM = 250;
    static const MIN_BIRTH_YEAR = 1900;
    static const MAX_BIRTH_YEAR = 2026;

    function initialize() {
    }

    function getHeight() as Number {
        return _readRangedNumber("Height", MIN_HEIGHT_CM, MAX_HEIGHT_CM);
    }

    function getWeight() as Number {
        return _readRangedNumber("Weight", MIN_WEIGHT_KG, MAX_WEIGHT_KG);
    }

    function getBirthYear() as Number {
        return _readRangedNumber("BirthYear", MIN_BIRTH_YEAR, MAX_BIRTH_YEAR);
    }

    function getBirthMonth() as Number {
        return _readRangedNumber("BirthMonth", 1, 12);
    }

    function getBirthDay() as Number {
        return _readRangedNumber("BirthDay", 1, 31);
    }

    function getArmSpan() as Number {
        return _readRangedNumber("ArmSpan", MIN_ARM_SPAN_CM, MAX_ARM_SPAN_CM);
    }

    function getAge() as Number or Null {
        var birthYear = getBirthYear();
        if (birthYear == 0) {
            return null;
        }

        var age = MAX_BIRTH_YEAR - birthYear;
        if (age < 0) {
            return null;
        }

        return age;
    }

    function getMaxHr() as Number or Null {
        var age = getAge();
        if (age == null) {
            return null;
        }

        return 220 - (age as Number);
    }

    private function _readRangedNumber(key as String, minVal as Number, maxVal as Number) as Number {
        var val = Application.Properties.getValue(key);
        if (val == null) {
            return 0;
        }

        var num = val as Number;
        if (num < minVal || num > maxVal) {
            return 0;
        }

        return num;
    }
}

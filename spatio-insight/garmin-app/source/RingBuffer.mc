import Toybox.Lang;

// Fixed-size ring buffer for sensor data.
// When full, oldest entry is overwritten (head advances).
class RingBuffer {

    private var _buffer as Array;
    private var _capacity as Number;
    private var _head as Number;    // index of oldest entry
    private var _size as Number;    // current number of entries

    function initialize(capacity as Number) {
        _capacity = capacity;
        _buffer = new Array[capacity];
        _head = 0;
        _size = 0;
    }

    // Push a new entry. Overwrites oldest when full.
    function push(entry as Object) as Void {
        var tail = (_head + _size) % _capacity;
        _buffer[tail] = entry;
        if (_size < _capacity) {
            _size++;
        } else {
            // Buffer full: advance head to discard oldest
            _head = (_head + 1) % _capacity;
        }
    }

    // Return the most recently pushed entry, or null if empty.
    function getLast() as Object or Null {
        if (_size == 0) { return null; }
        var tail = (_head + _size - 1) % _capacity;
        return _buffer[tail];
    }

    // Return all entries in chronological order (oldest first).
    function getAll() as Array {
        var result = new Array[_size];
        for (var i = 0; i < _size; i++) {
            result[i] = _buffer[(_head + i) % _capacity];
        }
        return result;
    }

    // Return the number of stored entries.
    function size() as Number {
        return _size;
    }

    // Return true if no entries stored.
    function isEmpty() as Boolean {
        return _size == 0;
    }

    // Clear all entries.
    function clear() as Void {
        _head = 0;
        _size = 0;
    }
}

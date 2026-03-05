// js/utils/debounce.js
// Returns a debounced version of fn that delays invocation until after delay ms
// have elapsed since the last time it was called.

(function() {
  window.Debounce = function(fn, delay) {
    var timer;
    return function() {
      var context = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function() {
        fn.apply(context, args);
      }, delay);
    };
  };
})();

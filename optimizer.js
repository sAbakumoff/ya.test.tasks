(function (scope, undefined) {
  var optimizer = {}, resetInterval = 1000;
  if (typeof Number.isFinite !== 'function') {
    Number.isFinite = function isFinite(value) {
      if (typeof value !== 'number') {
        return false;
      }
      if (value !== value || value === Infinity || value === -Infinity) {
        return false;
      }
      return true;
    };
  }
  function isFunction(value) {
    return {}.toString.call(value) === '[object Function]';
  }
  /**
   * Limits number a function executions per second to a specific value
   * @param fn
   * the function for which the limitations is performed
   * @param maxExecNumber
   * max value of number of function execition per second
   * @callback 
   * optional callback that is invoked when a function execution is cancelled
   * the "this" value and arguments are passed as the parameters
  */
  optimizer.limitFunctionsExecution = function(fn, maxExecNumber, callback){
    if (!isFunction(fn) || !Number.isFinite(maxExecNumber)) {
      return;
    }
    var counter = 0;
    setInterval(function resetCounter(){
      counter = 0;
    }, resetInterval);
    return function limitedFunction(){
      if (counter++ < maxExecNumber) {
        return fn.apply(this, arguments);
      }
      else if (isFunction(callback)) {
        callback(this, arguments);
      }
    };
  };
  /**
   * Support for node.js modules, AMD modules and export to global scope
  */
  if (typeof(module) == 'object' && module.hasOwnProperty('exports')) {
    module.exports = optimizer;
  }
  else if(typeof(define) === 'function' && define.hasOwnProperty('amd')) {
    define(optimizer);
  }
  else {
    scope.algorithms = optimizer;
  }
})(this);
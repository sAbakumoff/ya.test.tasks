var optimizer = require('../optimizer');
var assert = require('assert');

describe('optimizer', function(){
  describe('#limitFunctionsExecution', function(){
    it('should not fail if invalid parameters are passed', function(){
        optimizer.limitFunctionsExecution();
        optimizer.limitFunctionsExecution('not a function', 'not a number');
    });
    it('should properly cancel the executions and report them', function(){
        var normalExecCounter = 0, cancelledExecCounter = 0,
            totalExecutions = 5, perSecLimit = 3;
        function fn(){
            normalExecCounter ++;
        }
        fn = optimizer.limitFunctionsExecution(fn, 3, function(){
           cancelledExecCounter ++; 
        });
        for (var i = 0; i < totalExecutions; i++) {
            fn();
        }
        assert.equal(normalExecCounter, perSecLimit);
        assert.equal(cancelledExecCounter, totalExecutions - perSecLimit);
    });
    it('should support various function call ways', function(){
        var context = {
            counter : 0
        }
        function fn(propertyName){
            this[propertyName]++;
        }
        fn = optimizer.limitFunctionsExecution(fn, 3);
        fn.call(context, 'counter');
        fn.apply(context, ['counter']);
        var fn1 = fn.bind(context, 'counter');
        fn1();
        fn()
        assert.equal(context.counter, 3);
    });
  });
});

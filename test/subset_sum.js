var algorithms = require("../subset_sum");
var assert = require("assert");

function getArraySum(inputArray){
  var sum = 0;
  for (var i = 0; i<inputArray.length; i++){
    sum += inputArray[i];
  }
  return sum;
}

describe('Algorithms', function(){
  describe('#findSummingSubsets', function(){
    it('should not fail if invalid parameters are passed', function(){
      algorithms.findSummingSubsets();
      algorithms.findSummingSubsets({p:12345});
      algorithms.findSummingSubsets([1, 2, 3], null, 'target sum should be here!');
      algorithms.findSummingSubsets([0, 1, 1 ,1], 'callback should be here', 1);
    });
    it('should not fail and correctly handle the input array that contains values of non-numeric types', function(){
      var counter = 0;
      function checkOutput(outputArray){
       assert.equal(getArraySum(outputArray), 10); 
       counter ++;
      }
      algorithms.findSummingSubsets([1, 2, 3 ,4, null, 'str', true, [4,3,2,1]], checkOutput);
      assert.equal(counter, 1);
    });
    it('should exclude the duplicates from the output', function(){
      var counter = 0;
      function checkOutput(outputArray){
       assert.equal(getArraySum(outputArray), 0); 
       counter ++;
      }
      algorithms.findSummingSubsets([0, 0, 0, 0], checkOutput, 0);
      // it should provide only 4 combintations [0], [0,0], [0,0,0], [0,0,0,0]
      assert.equal(counter, 4);
    });
    it('should not return any combintaions if they do not exist', function(){
      var counter = 0;
      function checkOutput(outputArray){
       counter ++;
      }
      algorithms.findSummingSubsets([10, 20, 30, 40], checkOutput, 5);
      assert.equal(counter, 0);
    });
    it('should find all the combitaions sum up to the target number', function(){
      var counter = 0;
      function checkOutput(outputArray){
       assert.equal(getArraySum(outputArray), 11); 
       counter ++;
      }
      algorithms.findSummingSubsets([1, 2, 3, 4, 5, 6], checkOutput, 11);
      assert.equal(counter, 5);
    });
  });
});

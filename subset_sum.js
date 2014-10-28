/**
 * The solution for subset sum problem
*/
(function (scope, undefined) {
  var algorithms = {};
  /**
   * A couple of polyfills for better compatibility 
   * The source is https://developer.mozilla.org/en-US/docs/Web/JavaScript/
  */
  if (!Array.isArray) {
    Array.isArray = function (value) {
      return {}.toString.call(value) === '[object Array]';
    };
  }
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
  /**
   * Helper function that returns the array that contains the numbers 
   * selected from the given array
  */
  function selectNumbersSubset(inputArray) {
    if (!Array.isArray(inputArray)) {
      return;
    }
    var numbersArray = inputArray.slice();
    for (var i = 0; i < inputArray.length; i++){
      var currentItem = inputArray[i];
      if (Number.isFinite(currentItem)) {
        numbersArray.push(currentItem);
      }
    }
    return numbersArray;
  }
  /**
   * Help function that returns selects the array values from the 
   * specific indexes and returns the new array
  */
  function selectTrackedItems(inputArray, trackArray){
    var trackedItems = [];
    for (var i = 0; i < inputArray.length; i++) {
      if (trackArray[i] === 1) {
        trackedItems.push(inputArray[i]);
      }
    }
    return trackedItems;
  }
  /**
   * The core of solution, in fact this is simple depth search that involves
   * a couple of limitations.
  */
  function solve(startIndex, currentSum, targetSum, inputArray, trackArray, callback){
    if (currentSum === targetSum) {
      callback(selectTrackedItems(inputArray, trackArray));
    }
    if (currentSum === Infinity) {
      currentSum = 0;
    }
    for (var i = startIndex; i < inputArray.length; i++) {
      var currentItem = inputArray[i];
      var prevItem = inputArray[i-1];
      if (currentSum + currentItem > targetSum) {
        continue;
      }
      if (i > 0 && currentItem === prevItem && trackArray[i-1] === 0) {
        continue;   
      }
      trackArray[i] = 1;
      solve(i + 1, currentSum + currentItem, targetSum, inputArray, trackArray, callback);
      trackArray[i] = 0;
    }    
  }
  /**
   * Finds all the combinations of numbers contained in the given array
   * that sum up to the given number. Duplicate combinations are eliminated.
   * @param inputArray 
   * The input Array
   * @param callback
   * the function that is invoked each time when the combination if found and it
   * is passed as the argument.
   * @param targetSum
   * the number that the combinations should sum up to. It's 10 by default.
   * Sample of usage(node.js):
   * var algorithms = require("./subset_sum");
   * var inputArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
   * algorithms.findSummingSubsets(inputArray, function(solution){
   *   console.log(solution);
   * });
  */
  algorithms.findSummingSubsets = function(inputArray, callback, targetSum){
    if(!Number.isFinite(targetSum)){
      targetSum = 10;
    }
    var numbersSubset = selectNumbersSubset(inputArray);
    if (numbersSubset === undefined || numbersSubset.length === 0) {
      return;
    }
    numbersSubset.sort();
    var trackArray = [];
    for (var i = 0; i<numbersSubset.length; i++) {
      trackArray[i] = 0;
    }
    solve(0, Infinity, targetSum, inputArray, trackArray, callback);
  };
  /**
   * Support for node.js modules, AMD modules and export to global scope
  */
  if (typeof(module) == 'object' && module.hasOwnProperty('exports')) {
    module.exports = algorithms;
  }
  else if(typeof(define) === 'function' && define.hasOwnProperty('amd')) {
    define(algorithms);
  }
  else {
    scope.algorithms = algorithms;
  }
})(this);
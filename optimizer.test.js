var opt = require("./optimizer");
function fn(propName){
  console.log(Math.sqrt(this[propName]));
}

fn = opt.limitFunctionsExecution(fn, 3, function(context, args){
  console.log('cancelled with args: ', args);
});

fn.call({v:225}, 'v');
fn.call({v:196}, 'v');
fn.call({v:10000}, 'v');
fn.call({v:4}, 'v');
fn.call({v:9}, 'v');
setTimeout(function(){
fn.call({v:100}, 'v');
fn.call({v:100}, 'v');
fn.call({v:100}, 'v');
fn.call({v:100}, 'v');
}, 2000);
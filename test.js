//Log hit count
/*

# this gets called every time my site gets a hit
log_hit()
# I get to call this anytime I want.
# returns number of hits in the last 5 minutes.
get_hits()

*/

var lastMinutes = 5;
var lastMinutesInMilli = lastMinutes*60*1000;

function hits(){
  //Store hits in this object for better performance
  var that = this;
  //totalCount will keep track of how many times our site was hit
  //It will help us get efficiency of O(1)
  this.hitStore = { "totalCount" : 0};
  this.startPointer = null;
  //this.clean_hits = null;
  //This inverval will delete older properties from hitStore object
  //and decrement hitStore["totalCount"] by the old properties right before deleting them
  this.cleanHitsInterval = setInterval(function(){if(that.clean_hits != null){that.clean_hits()}}, 1);
}

//This method is used to log hits each time it is called
//It will find if a hit was added in current milliseconds
//If it was then increment the counter
//If not then create a new entry and add value 1 to it
//It will also increment our counter hitStore["totalCount"] each time
hits.prototype.log_hit = function(){
  var now = Date.now();
  if(!this.startPointer || || this.hitStore["totalCount"] == 0){
    this.startPointer = now;
  }
  if(this.hitStore[now]){
    this.hitStore[now] += 1;
  }else{
    this.hitStore[now] = 1;
  }
  this.hitStore["totalCount"] ++;
}

//This function will do a very important job updating //hitStore["totalCount"] and removing old counter From hitStore object

//We need to start from startPointer and go until now - (5 minutes -> milli Seconds) and remove all the elements and decrement their counter values from hitStore["totalCount"] right before.
hits.prototype.clean_hits = function(){
//If startPointer is not defined then we do not have any element to remove from hitStore object
  if(this.startPointer == null || this.hitStore["totalCount"] == 0){
  	return;
  }
  console.log("this.startPointer: " + this.startPointer);
  console.log("total Count: " + this.hitStore["totalCount"]);
  var historicalTime = Date.now() - lastMinutesInMilli;
  console.log("historicalTime: " + historicalTime);
  
  for(;this.startPointer < historicalTime; this.startPointer++){
  	if(typeof this.hitStore[this.startPointer] !== "undefined"){
    	this.hitStore["totalCount"] -= this.hitStore[this.startPointer];
    	delete this.hitStore[this.startPointer];
    }
  }
  console.log("this.startPointer: " + this.startPointer);
}


//This method will calculate number of hits between now and 5 minutes ago
// We need to start from now - (5 minutes -> milli Seconds) and end our loop at now
//Reset hitCount after you are done.
hits.prototype.get_hits = function(){
  //The reason to add clean_hits right before we return totalCount is that we know our timer may not be called by the system every 1 millisecond.
//So this will give us accuracy and our interval in class defination will reduce the amount properties (old counters) we need to remove at this point in time. 
  this.clean_hits();
  //Return totalCount in O(1)
  return this.hitStore["totalCount"];
}

var hitObj = new hits();

//Log a hit
hitObj.log_hit();

//Print hits
console.log(hitObj.get_hits());

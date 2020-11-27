Tail = require('tail').Tail

/* tail = new Tail('simple.log')

tail.on('line', function (data) {
  console.log(data)
})

tail.on('error', function (error) {
  console.log('ERROR: ', error)
}) */

const dayjs = require('dayjs')
const customParseFormat = require('dayjs/plugin/customParseFormat')
dayjs.extend(customParseFormat)

const d = '18/Jul/2012:17:17:45 +0300'

const FORMAT = 'DD/MMM/YYYY:HH:mm:ss ZZ'
const TIME_REGEX = /\[(.*?)\]/
const ACTION_REGEX = /\"(.*?)\"/
const TOTAL_HITS_INTERVAL = 120
const TOTAL_HITS_THRESHOLD = 10
const MOST_HIT_SECTION_INTERVAL = 10

const getTimestampInSeconds = (time) => Math.floor(dayjs(time, FORMAT).unix()
  .valueOf())

const parseLog = (log, regex) => {
  return log.match(regex)[1]
}

// TODO: Handle edge cases
const parseSection = (action) => {
  return action.split(' ')[1].split('/')[1]
}

// const log = '93.118.249.124 - - [21/Dec/2012:23:21:23 +0200] "POST /phpscheduleit/reserve.php HTTP/1.1" 404 223'
const log = '93.118.249.124 - - [22/Dec/2012:00:20:53 +0200] "GET /index.php HTTP/1.1" 200 4481'
// const log = '176.31.103.52 - - [17/May/2015:16:05:23 +0000] "GET /style2.css HTTP/1.1" 200 4877 "http://semicomplete.com/blog/geekery/headless-wrapper-for-ephemeral-xservers.html" "Mozilla/5.0 (X11; U; Linux x86_64; C) AppleWebKit/533.3 (KHTML, like Gecko) Qt/4.7.1 Safari/533.3"'
// const log = '93.118.249.124 - - [22/Dec/2012:00:20:53 +0200] "-" 200 4481'

console.log(getTimestampInSeconds(d))
console.log(parseSection(parseLog(log, ACTION_REGEX)))

const updateTotalHits = (log, totalHitsTracker) => {
  const currentTimestamp = parseLog(log, TIME_REGEX)
  // const section = parseSection(parseLog(log, ACTION_REGEX))

  const slot = currentTimestamp % TOTAL_HITS_INTERVAL

  if (slot in totalHitsTracker === false) {
    totalHitsTracker[slot] = {timestamp: currentTimestamp, total: 1}

    return
  }

  // If current slot is older than 2 minutes, reset it
  // Else increase counter
  if (currentTimestamp - totalHitsTracker[slot].timestamp > TOTAL_HITS_INTERVAL) {
    totalHitsTracker[slot] = {timestamp: currentTimestamp, total: 1}
  } else {
    totalHitsTracker[slot].total += 1
  }
}

const getAverageTotalHits = (totalHitsTracker) => {
  const currentTimestamp = dayjs().unix()

  return Math.floor(totalHitsTracker.filter(
    (slot) => (currentTimestamp - slot.timestamp <= TOTAL_HITS_INTERVAL)
  ).reduce((prev, curr) => prev + curr.total, 0) / TOTAL_HITS_INTERVAL)
}

const shouldTriggerAlert = (totalHitsTracker) => {
  const totalHits = getAverageTotalHits(totalHitsTracker)

  return totalHits > TOTAL_HITS_THRESHOLD
}

/*
{
  1: {
     'timestamp': 32132131231
     'total': 999
     ...
  }
}
*/
// 120 keys for 120 seconds
// keep track of total hit per second
// also keep track of timestamp
// when aggregating, if timestamp is out of 2 mins,
// it means no request hit that modulo in the meantime --> skip it
const totalHitsTracker = {}

/*
{
  0: {
    '__lastTimestamp__': 32132131231
    'sectionA': 5,
    'sectionB': 6
    ...
  }
}
*/
// 10 keys for 10 seconds
// keep track of sections hit per second
// also keep track of timestamp
// when aggregating, if timestamp is out of 10 secs,
// it means no request hit that modulo in the meantime --> skip it
const sectionHitsTracker = {}

// Use similar data structure for better maintainability

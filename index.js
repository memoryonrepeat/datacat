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
const time_regex = /\[(.*?)\]/
const action_regex = /\"(.*?)\"/

const getTimestampInSeconds = (time) => Math.floor(dayjs(time, FORMAT).valueOf() / 1000)

const parseLog = (log) => {
  return log.match(action_regex)[1]
}

// TODO: Handle edge cases
const parseSection = (action) => {
  return action.split(' ')[1].split('/')[1]
}

const log = '93.118.249.124 - - [21/Dec/2012:23:21:23 +0200] "POST /phpscheduleit/reserve.php HTTP/1.1" 404 223'
// const log = '93.118.249.124 - - [22/Dec/2012:00:20:53 +0200] "GET /index.php HTTP/1.1" 200 4481'

console.log(parseSection(parseLog(log)))

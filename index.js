const dayjs = require('dayjs')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(customParseFormat)

class DataCat {
  constructor (logPath, threshold) {
    this.logPath = logPath
    this.threshold = threshold
    this.FORMAT = 'DD/MMM/YYYY:HH:mm:ss ZZ'
    this.TIME_REGEX = /\[(.*?)\]/
    this.ACTION_REGEX = /\"(.*?)\"/
    this.TOTAL_HITS_INTERVAL = 120
    this.SUMMARY_INTERVAL = 10
    this.ALERTING_CRON_INTERVAL = 1000
    this.totalHitsTracker = {}
    this.sectionHitsTracker = {}
    this.isOnAlert = false
    this.alertingCronId = null

    setInterval(this.summarizeTraffic(), 10000)
  }

  getTimestampInSeconds (time) {
    return Math.floor(dayjs(time, FORMAT).unix()
      .valueOf())
  }

  _parseLog (log, regex) {
    return log.match(regex)[1]
  }

  _parseSection (action) {
    return action.split(' ')[1].split('/')[1]
  }

  update (log) {
    const logTimestamp = this._parseLog(log, this.TIME_REGEX)

    this.updateTotalHits(log, timestamp)
    this.updateSummary(log, timestamp)
  }

  updateTotalHits (log, timestamp) {
    const slot = timestamp % this.TOTAL_HITS_INTERVAL

    if (slot in this.totalHitsTracker === false) {
      this.totalHitsTracker[slot] = {timestamp, total: 1}
      this.revisitAlertState()

      return
    }

    // If current slot is older than 2 minutes, reset it
    // Else increase counter
    if (timestamp - this.totalHitsTracker[slot].timestamp > this.TOTAL_HITS_INTERVAL) {
      this.totalHitsTracker[slot] = {timestamp, total: 1}
    } else {
      this.totalHitsTracker[slot].total += 1
    }

    this.revisitAlertState()
  }

  getAverageTotalHits () {
    const currentTimestamp = dayjs().unix()

    return Math.floor(this.totalHitsTracker.filter(
      (slot) => (currentTimestamp - slot.timestamp <= this.TOTAL_HITS_INTERVAL)
    ).reduce((prev, curr) => prev + curr.total, 0) / this.TOTAL_HITS_INTERVAL)
  }

  // Check if alert should be turned on/off and adjust accordingly
  revisitAlertState () {
    const averageTotalHits = this.getAverageTotalHits()

    if (averageTotalHits > this.threshold) {
      this.isOnAlert = true

      console.log(`High traffic generated an alert - hits = ${averageTotalHits}, triggered at ${dayjs().format(this.FORMAT)}`)

      if (this.alertingCron !== null) {
        return
      }

      this.alertingCronId = setInterval(() => {
        this.revisitAlertState()
      }, this.ALERTING_CRON_INTERVAL)
    } else {
      if (this.isOnAlert === true) {
        this.isOnAlert = false

        clearInterval(this.alertingCronId)

        this.alertingCronId = null

        console.log(`Traffic returned to normal - hits = ${averageTotalHits}, triggered at ${dayjs().format(this.FORMAT)}`)
      }
    }
  }

  updateSummary (log, timestamp) {
    const section = this._parseSection(this._parseLog(log, ACTION_REGEX))

    const slot = timestamp % this.SUMMARY_INTERVAL

    if (slot in this.sectionHitsTracker === false) {
      this.sectionHitsTracker[slot] = {timestamp, sections: {[section]: 1}}

      return
    }

    // If current slot is older than 10 seconds, reset it
    // Else increase counter
    if (timestamp - this.sectionHitsTracker[slot].timestamp > this.SUMMARY_INTERVAL) {
      this.sectionHitsTracker[slot] = {timestamp, sections: {[section]: 1}}
    } else {
      this.sectionHitsTracker[slot].sections[section] = (this.sectionHitsTracker[slot].sections[section] || 0) + 1
    }
  }

  summarizeTraffic () {

  }
}

module.exports = DataCat
